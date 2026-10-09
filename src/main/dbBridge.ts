import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// CA pública de Supabase (Root + Intermediate 2021), capturada del handshake real del
// pooler configurado en `.env` y verificada: el certificado del pooler valida contra
// estas dos. Sin pinning, Node rechaza la cadena con "self-signed certificate in
// certificate chain" porque la Root 2021 de Supabase no está en el store del sistema.
// Seguridad (Fase 9.1): se incrusta en el script hijo y se pasa como `ca` a tls.connect.
const SUPABASE_CA_PEM = `-----BEGIN CERTIFICATE-----
MIIDvzCCAqegAwIBAgIUBhalAwMQ7BA1NH7td4msPPwxHzowDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIzMTAyNDA3NTM0NVoXDTMzMTAyMTA3NTM0NVow
czELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEmMCQGA1UEAwwdU3VwYWJhc2Ug
SW50ZXJtZWRpYXRlIDIwMjEgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK
AoIBAQDOAMhXirH+EGIn8GaDp8T53rEogf7kM8OKW2uQ5yU/wxPa+w8BXgTzWy3W
JDAUhZE78oUtAd9kk5zKPrLXoT3W61PPnOc/9dceL5gB7/78m7EKCySziAA2c8vR
fnYPfznedDXi2lryttSYmMf2qbZDErAxwJDUm6cyq+HLAfb2qUH28u6jP8I9GDtG
PkQnjqtiRXEKjbTc/ntqCQrhtFK02mHkMSju7nEpkNYryunv5n/c9mrRY9/8GwmP
3uSZz3CQ8yQ/E0f8T9gCca2TcKuTQmW2pQqtHv1MuZ3jfJE5Nr9+Fap5kdzDJtdf
BdKofVNZlnYIru5yhUZywY3xYFfHAgMBAAGjUzBRMB0GA1UdDgQWBBQVoFMuvXJ9
Yv+QJr6/GJX0Z0VA+jAfBgNVHSMEGDAWgBSo17l2N9gs7ZISJp4OMiTVLWlGLDAP
BgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAwdx0XJRHTf/crGpsr
n07uRziGSswWWTe+kDATMQeRZAEW3grVki5LDzs+JLbVIJYhRXFRXkqTRJdSGAgH
/0LNw7GDUwKOLnIRoYR3ILqSFZbkXbrYQ4Yir5yQZWgiNhRNfpEnMMIEQEZoSuFn
8Uh6M4HNfVuwBPgV0/gvKEja3DjJgwPAYzoXvKh5m3fKTt2c22YcTDdZTUDfrst6
Vpt/M03FY6D+897yfNR+nEzeEwjzHMZkperTwVfmBdyXIgIWexQ/whoky7+I4pjz
eLtkPBlwE3WB9fGZVjZqdUNSasS8mmWIyxHPttTzTHHmElDw2OQ/s9HjfCxJztk2
VCgJ
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----
`;

// Una sola línea (base64) para poder interpolar la CA dentro del script hijo sin
// problemas de saltos de línea en strings de JavaScript.
const SUPABASE_CA_B64 = Buffer.from(SUPABASE_CA_PEM).toString('base64');

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
      // Seguridad (Fase 9.1): se valida el certificado de Supabase (rejectUnauthorized: true)
      // contra la CA pineada mas arriba. Al usar un socket ya conectado, servername es lo
      // que se usa para SNI y para verificar el hostname del certificado; sin el, Node usaria
      // "localhost" y el check fallaria.
      const tlsSocket = tls.connect({
        socket: raw,
        servername: UPSTREAM_HOST,
        rejectUnauthorized: true,
        ca: [Buffer.from("${SUPABASE_CA_B64}", 'base64').toString('utf-8')],
      });
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

    bridgeProcess.on('exit', (code, signal) => {
      const parsedPort = parseInt(env.BRIDGE_LISTEN_PORT, 10);
      if (!bridgeReady && code === 0) {
        process.env.BRIDGE_LISTEN_PORT = String(parsedPort);
        bridgeReady = true;
        resolve(parsedPort);
        return;
      }

      // El bridge es un punto único de fallo: si muere, todas las conexiones del
      // pool de TypeORM mueren con él y el usuario ve "Connection terminated
      // unexpectedly" sin poder hacer nada. Se avisa con claridad y se pide reiniciar.
      if (!shuttingDown) {
        console.error(
          `❌ El bridge de base de datos se detuvo inesperadamente (código ${code}, señal ${signal}).` +
            (stderrBuf ? ` Detalle: ${stderrBuf.slice(0, 300)}` : '') +
            ' Reinicia la app para reconectar.'
        );
      }
      bridgeProcess = null;
    });

    setTimeout(() => {
      if (!bridgeReady) {
        reject(new Error('El bridge no respondió a tiempo: ' + stderrBuf.slice(0, 300)));
      }
    }, 15000);
  });
}

let shuttingDown = false;

export function stopDbBridge(): void {
  shuttingDown = true;
  if (bridgeProcess) {
    bridgeProcess.kill();
    bridgeProcess = null;
  }
}