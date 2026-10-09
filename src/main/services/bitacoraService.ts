import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// Bitácora de seguridad (Fase 9.6): registro en append de las acciones destructivas
// (borrados críticos). No sustituye al respaldo JSON (9.2): solo deja constancia de QUÉ se
// borró y CUÁNDO, en un archivo plano en userData que no se pierde al cerrar la app.
export function registrarEnBitacora(accion: string, detalle: string): void {
  try {
    const ruta = path.join(app.getPath('userData'), 'bitacora-seguridad.log');
    const linea = {
      fecha: new Date().toISOString(),
      accion,
      detalle,
    };
    fs.appendFileSync(ruta, JSON.stringify(linea) + '\n', 'utf-8');
  } catch (error) {
    console.error('❌ No se pudo escribir en la bitácora de seguridad:', error);
  }
}