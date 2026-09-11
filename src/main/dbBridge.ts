import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const BRIDGE_SCRIPT = `
const net = require('net');
const tls = require('tls');

const UPSTREAM_HOST = process.env.BRIDGE_UPSTREAM_HOST;
const UPSTREAM_PORT = parseInt(process.env.BRIDGE_UPSTREAM_PORT, 10);
const LISTEN_PORT = parseInt(process.env.BRIDGE_LISTEN_PORT, 10);

// PgBouncer (pooler de Supabase) exige el SSLRequest del protocolo Postgres
// antes de aceptar el handshake TLS.
const SSL_REQUEST = Buffer.from([0, 0, 0, 8, 4, 210, 22, 47]);

const server = net.createServer((clientSocket) => {
  const buffer = [];
  let upstreamReady = false;
  let upstreamSocket = null;

  // Capturamos todo lo que envía el cliente desde el inicio.
  clientSocket.on('data', (data) => {
    if (!upstreamReady) {
      buffer.push(data);
    } else {
      upstreamSocket.write(data);
    }
  });
  clientSocket.on('error', () => {});

  const raw = net.connect({ host: UPSTREAM_HOST, port: UPSTREAM_PORT });
  raw.on('error', (e) => {
    console.error('upstream error:', e.message);
    clientSocket.destroy();
  });

  raw.on('connect', () => {
    raw.write(SSL_REQUEST);
  });

  raw.once('data', (chunk) => {
    if (chunk.length === 0) return;
    if (chunk[0] === 0x53) {
      // 'S' => acepta TLS. Upgrade del socket.
      const tlsSocket = tls.connect({ socket: raw, rejectUnauthorized: false });
      upstreamSocket = tlsSocket;
      tlsSocket.on('secureConnect', () => {
        upstreamReady = true;
        const rest = chunk.slice(1);
        if (rest.length > 0) tlsSocket.write(rest);
        while (buffer.length) tlsSocket.write(buffer.shift());
        tlsSocket.pipe(clientSocket);
      });
      tlsSocket.on('error', (e) => {
        console.error('tls error:', e.message);
        clientSocket.destroy();
      });
    } else {
      console.error('respuesta no esperada:', chunk[0]);
      clientSocket.destroy();
    }
  });
});

server.listen(LISTEN_PORT, '127.0.0.1', () => {
  console.log('BRIDGE_READY');
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
`;

let bridgeProcess: ChildProcess | null = null;

function findNodeBinary(): string {
  const candidates = [
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
    '/usr/bin/node',
    '/usr/local/bin/node',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(
    'No se pudo localizar node.exe. Instala Node.js o define la variable de entorno NODE_BIN con la ruta.',
  );
}

function pickPort(): number {
  return 5433 + Math.floor(Math.random() * 1000);
}

export async function startDbBridge(): Promise<number> {
  if (bridgeProcess) {
    return Promise.resolve(parseInt(process.env.BRIDGE_LISTEN_PORT || '5433', 10));
  }

  const nodeBin = process.env.NODE_BIN || findNodeBinary();
  const listenPort = pickPort();
  const scriptPath = path.join(os.tmpdir(), `db-bridge-${process.pid}.js`);
  fs.writeFileSync(scriptPath, BRIDGE_SCRIPT, 'utf-8');

  const env = {
    ...process.env,
    BRIDGE_UPSTREAM_HOST: process.env.DB_HOST || 'localhost',
    BRIDGE_UPSTREAM_PORT: String(process.env.DB_PORT || 5432),
    BRIDGE_LISTEN_PORT: String(listenPort),
  };

  return new Promise((resolve, reject) => {
    bridgeProcess = spawn(nodeBin, [scriptPath], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let bridgeReady = false;
    let stderrBuf = '';

    bridgeProcess.stdout!.on('data', (data: Buffer) => {
      const text = data.toString();
      if (text.includes('BRIDGE_READY') && !bridgeReady) {
        bridgeReady = true;
        resolve(listenPort);
      }
    });

    bridgeProcess.stderr!.on('data', (data: Buffer) => {
      stderrBuf += data.toString();
    });

    bridgeProcess.on('exit', (code) => {
      const parsedPort = parseInt(env.BRIDGE_LISTEN_PORT, 10);
      if (!bridgeReady && code === 0) {
        process.env.BRIDGE_LISTEN_PORT = String(parsedPort);
        bridgeReady = true;
        resolve(parsedPort);
      }
    });

    setTimeout(() => {
      if (!bridgeReady) {
        reject(new Error('El bridge no respondió a tiempo: ' + stderrBuf.slice(0, 300)));
      }
    }, 15000);
  });
}

export function stopDbBridge(): void {
  if (bridgeProcess) {
    bridgeProcess.kill();
    bridgeProcess = null;
  }
}