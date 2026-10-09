import { Connection, EntityManager, FindOptionsWhere } from 'typeorm';
import { Inversor } from '../../shared/entities/Inversor';
import { Aporte } from '../../shared/entities/Aporte';
import { Inversion } from '../../shared/entities/Inversion';
import { MovimientoCapital } from '../../shared/entities/MovimientoCapital';
import { Cuenta } from '../../shared/entities/Cuenta';
import { Moneda } from '../../shared/entities/Moneda';
import { Transaccion } from '../../shared/entities/Transaccion';
import { Envio } from '../../shared/entities/Envio';
import { Producto } from '../../shared/entities/Producto';
import { getTasaActual } from './tasaCambioService';

export interface ResumenInversor {
  inversorId: number;
  nombre: string;
  activo: boolean;
  fechaAlta: string;
  cuentaId: number;
  cuentaNombre: string;
  aportado: number;
  invertido: number;
  enMercancia: number;
  liberado: number;
  reinvertido: number;
  retirado: number;
  disponible: number;
  // 1% devengado al vender. Es lo que resta a la ganancia del negocio.
  comisionDevengada: number;
  // Parte de lo devengado que el socio ya pago (registrado al depositar en QvaPay).
  comisionCobrada: number;
  // Devengado - cobrado. Es dinero que el negocio ya gasto en su contabilidad y que
  // todavia no ha entrado: por eso va aparte, en su propia fila, y no se mezcla con
  // `disponible` (que es solo capital, nunca comision).
  comisionPendiente: number;
  // Solo puede ser true por edicion: cobro mas de lo que despues se devengo (p. ej. se
  // bajo el precio de una venta ya cobrada). No se corrige solo, se avisa en rojo.
  comisionInconsistente: boolean;
  unidadesInvertidas: number;
  unidadesLiberadas: number;
  // aportado - invertido != 0 = se invirtio distinto de lo aportado;
  // disponible < 0 = se movio mas capital del que existia.
  cuadra: boolean;
  diferencia: number;
}

function n(valor: any): number {
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Para los campos de texto hay que normalizar aparte: aplicar n() a un nombre
// devuelve 0 y rompe comparaciones.
function s(valor: any): string {
  return valor === null || valor === undefined ? '' : String(valor);
}

// Escribe unidades_liberadas / monto_liberado / comision_devengada de cada Inversion a
// partir de lo que consumio la pasada FIFO. Es el unico escritor de esas columnas, por
// eso no pueden contradecir el costo real y la comision que calcula esa misma pasada.
//
// La liberacion es proporcional al capital: si de una inversion de 400 USD se
// vendieron 2 de 4 unidades, quedan 200 liberados y 200 siguen en la mercancia.
//
// comision_devengada es el 1% DEVENGADO al vender, y es un gasto del negocio que NO se
// descuenta del capital: el retiro paga el capital integro. OJO con la palabra
// "devengada": ese dinero todavia no esta cobrado.
//
// NO TOCA comision_cobrada ni fecha_cobro_comision, y no por descuido: el devengo se
// recalcula en cada pasada, pero un cobro es un hecho historico. Si esta funcion
// escribiera esas dos columnas, cada recalculo (que corre al arrancar la app) borraria
// todos los cobros ya registrados. El unico escritor de la columna cobrada es
// registrarCobroComision.
export async function sincronizarInversiones(
  connection: Connection,
  unidadesPorInversion: Map<number, number>,
  comisionPorInversion: Map<number, number> = new Map()
): Promise<void> {
  const repo = connection.getRepository(Inversion);
  const inversiones = await repo.find();

  for (const inversion of inversiones) {
    const unidades = Math.max(0, Math.trunc(n(inversion.unidades)));
    const vendidas = Math.max(0, Math.trunc(unidadesPorInversion.get(n(inversion.id)) || 0));
    const liberadas = Math.min(unidades, vendidas);
    const montoLiberado = unidades > 0 ? (n(inversion.monto) * liberadas) / unidades : 0;
    const comision = Number(n(comisionPorInversion.get(n(inversion.id))).toFixed(2));

    if (
      Math.trunc(n(inversion.unidades_liberadas)) === liberadas &&
      Math.abs(n(inversion.monto_liberado) - Number(montoLiberado.toFixed(2))) < 0.005 &&
      Math.abs(n(inversion.comision_devengada) - comision) < 0.005
    ) {
      continue;
    }

    inversion.unidades_liberadas = liberadas;
    inversion.monto_liberado = Number(montoLiberado.toFixed(2));
    inversion.comision_devengada = comision;
    await repo.save(inversion);
  }
}

function isoFecha(valor: Date | string | null | undefined): string {
  if (!valor) return '';
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : '';
}

export async function calcularResumenInversores(
  connection: Connection
): Promise<ResumenInversor[]> {
  const inversores = await connection.getRepository(Inversor).find({ order: { nombre: 'ASC' } });
  // Aporte y MovimientoCapital declaran inversor como relacion, asi que la FK
  // cruda (inversor_id) NO existe en la entidad. Sin `relations: ['inversor']` el
  // filtro por socio no encuentra nada y todo.aportado salia en 0.
  const aportes = await connection.getRepository(Aporte).find({ relations: ['inversor'] });
  const inversiones = await connection.getRepository(Inversion).find({
    relations: ['producto', 'envio', 'inversor'],
  });
  const movimientos = await connection
    .getRepository(MovimientoCapital)
    .find({ relations: ['inversor'] });
  const cuentas = await connection.getRepository(Cuenta).find();

  // Cuenta del socio = la que se creo con crearCuentaParaInversor, que la nombra
  // "Socio <nombre> - por pagar". Cuenta no tiene FK a Inversor, asi que el vinculo es
  // el nombre; se compara con esa misma convencion en vez de un prefijo suelto.
  const cuentaDe = (nombre: string): Cuenta | undefined => {
    const esperado = `socio ${s(nombre)} - por pagar`.trim().toLowerCase();
    if (s(nombre).trim() === '') return undefined;
    return cuentas.find((c) => s(c.nombre).trim().toLowerCase() === esperado);
  };

  return inversores.map((inversor) => {
    const id = n(inversor.id);
    const propios = (col: any[]) => col.filter((x) => n(x.inversor_id) === id || n(x.inversor?.id) === id);
    const delSocio = propios(inversiones);
    const susAportes = propios(aportes);
    const susMovimientos = propios(movimientos);
    const cuenta = cuentaDe(s(inversor.nombre));

    const aportado = susAportes.reduce((sum, a) => sum + n(a.monto), 0);
    const invertido = delSocio.reduce((sum, i) => sum + n(i.monto), 0);
    const liberado = delSocio.reduce((sum, i) => sum + n(i.monto_liberado), 0);
    const enMercancia = invertido - liberado;
    const reinvertido = susMovimientos
      .filter((m) => s(m.tipo) === 'reinversion')
      .reduce((sum, m) => sum + n(m.monto), 0);
    const retirado = susMovimientos
      .filter((m) => s(m.tipo) === 'retiro')
      .reduce((sum, m) => sum + n(m.monto), 0);
    const disponible = liberado - reinvertido - retirado;
    // La comision se lee de las columnas de Inversion: comision_devengada la escribio la
    // pasada FIFO y comision_cobrada la escribio registrarCobroComision.
    //
    // ANTES se pasaba un Map<id, comision> como parametro y el handler IPC lo llamaba
    // sin el, asi que el 1% leia 0 siempre en pantalla. Va en columna porque el resumen
    // se arma desde la BD y tiene que dar el mismo numero este o no un recalculo
    // reciente.
    const comisionDevengada = delSocio.reduce((sum, i) => sum + n(i.comision_devengada), 0);
    const comisionCobrada = delSocio.reduce((sum, i) => sum + n(i.comision_cobrada), 0);
    const comisionPendiente = comisionDevengada - comisionCobrada;
    // Cobrar mas de lo devengado solo pasa si se edito una venta a la baja despues de
    // cobrar. No se "arregla" recortando el cobro (eso seria inventar una devolucion
    // que nadie registro): se marca y el usuario lo ve.
    const comisionInconsistente = comisionCobrada - comisionDevengada > 0.01;

    const unidadesInvertidas = delSocio.reduce((sum, i) => sum + Math.trunc(n(i.unidades)), 0);
    const unidadesLiberadas = delSocio.reduce(
      (sum, i) => sum + Math.trunc(n(i.unidades_liberadas)),
      0
    );

    // `disponible` sale de restar reinversiones y retiros a lo liberado. Es una
    // resta, asi que por construccion la igualdad
    //   aportado = enMercancia + reinvertido + retirado + disponible
    // SIEMPRE se cumple (se reduce a aportado == invertido) y por eso no sirve como
    // comprobacion: jamas puede fallar.
    //
    // Lo que si puede estar mal, y es lo que hay que mirar en rojo, son dos cosas:
    //  1. diferencia != 0 -> hay capital invertido que no viene de ningun aporte ni de
    //     ninguna reinversion. La reinversion CUENTA como origen: el capital se puede
    //     sacar con un retiro y meterlo otra vez en otro producto sin que exista un
    //     aporte nuevo (de hecho solo se puede reinvertir lo que ya esta liberado), asi
    //     que la invariante real es  aportado + reinvertido = invertido.  Medir solo
    //     "aportado - invertido" daba un falso positivo en rojo con cada reinversion
    //     bien hecha, que es justo el caso para el que existe la reinversion.
    //  2. disponible < 0 -> se movio o se retiro mas capital del que existia.
    const diferencia = Number((aportado + reinvertido - invertido).toFixed(2));
    const cuadra = Math.abs(diferencia) < 0.01 && disponible >= -0.01;

    return {
      inversorId: id,
      nombre: s(inversor.nombre),
      activo: Boolean(inversor.activo),
      fechaAlta: isoFecha(inversor.fecha_alta),
      cuentaId: cuenta ? n(cuenta.id_cuenta) : 0,
      cuentaNombre: cuenta ? s(cuenta.nombre) : 'sin cuenta',
      aportado: Number(aportado.toFixed(2)),
      invertido: Number(invertido.toFixed(2)),
      enMercancia: Number(enMercancia.toFixed(2)),
      liberado: Number(liberado.toFixed(2)),
      reinvertido: Number(reinvertido.toFixed(2)),
      retirado: Number(retirado.toFixed(2)),
      disponible: Number(disponible.toFixed(2)),
      comisionDevengada: Number(comisionDevengada.toFixed(2)),
      comisionCobrada: Number(comisionCobrada.toFixed(2)),
      comisionPendiente: Number(comisionPendiente.toFixed(2)),
      comisionInconsistente,
      unidadesInvertidas,
      unidadesLiberadas,
      cuadra,
      diferencia,
    };
  });
}

// Crea la cuenta de pasivo del socio ("Socio X - por pagar") para que aportes y
// retiros puedan ser Transacciones reales. Cuenta no tiene FK a Inversor: el vinculo
// es el nombre, y por eso calcularResumenInversores la busca con esa misma convencion
// exacta (comparacion completa, no un startsWith: el nombre empieza por "Socio").
export async function crearCuentaParaInversor(
  connection: Connection,
  inversor: Inversor,
  codigoMoneda: string = 'USD'
): Promise<Cuenta> {
  const repo = connection.getRepository(Cuenta);
  const existentes = await repo.find();
  const nombre = `Socio ${s(inversor.nombre)} - por pagar`;

  const yaExiste = existentes.find(
    (c) => s(c.nombre).trim().toLowerCase() === nombre.trim().toLowerCase()
  );
  if (yaExiste) return yaExiste;

  const ids = existentes.map((c) => n(c.id_cuenta)).filter((v) => v > 0);
  const nuevoId = (ids.length ? Math.max(...ids) : 0) + 1;

  // Cuenta declara la moneda como relacion (codigo_moneda es el JoinColumn), asi que
  // hay que asignar la entidad Moneda, no la cadena del codigo.
  const moneda = await connection
    .getRepository(Moneda)
    .findOne({ where: { codigo: codigoMoneda } });
  if (!moneda) throw new Error(`No existe la moneda ${codigoMoneda} para la cuenta del socio`);

  return repo.save(
    repo.create({
      id_cuenta: String(nuevoId),
      nombre,
      moneda,
      saldo: 0,
    })
  );
}

export interface DatosInversor {
  nombre: string;
  activo?: boolean;
  fecha_alta?: string;
  notas?: string;
  codigo_moneda?: string;
}

// Alta de socio: se crea y su cuenta de pasivo en la MISMA transaccion de BD. Si la
// cuenta fallara (p. ej. no existe la moneda), no queda un socio huerfano sin cuenta.
export async function crearInversor(
  connection: Connection,
  datos: DatosInversor
): Promise<Inversor> {
  const nombre = s(datos.nombre).trim();
  if (!nombre) throw new Error('El nombre del socio es obligatorio');

  return connection.transaction(async (manager) => {
    const repo = manager.getRepository(Inversor);
    const existente = await repo.findOne({ where: { nombre } });
    if (existente) throw new Error(`Ya existe un socio llamado "${nombre}"`);

    const socio = await repo.save(
      repo.create({
        nombre,
        activo: datos.activo === undefined ? true : Boolean(datos.activo),
        fecha_alta: datos.fecha_alta || new Date().toISOString().slice(0, 10),
        notas: datos.notas || '',
      })
    );

    const cuenta = await crearCuentaParaInversor(
      manager as unknown as Connection,
      socio,
      datos.codigo_moneda || 'USD'
    );
    return socio;
  });
}

// Edita un socio.
//
// EL NOMBRE NO SE TOCA, a proposito. La cuenta de pasivo se vincula al socio por
// convencion de nombre ("Socio <nombre> - por pagar") y no por FK, asi que un cambio
// de nombre dejaria la cuenta huerfana y calcularResumenInversores la dejaria de
// encontrar: el socio apareceria con "sin cuenta" sin que nada fallara. Si alguna vez
// hace falta renombrar, hay que renombrar las dos cosas en la misma transaccion.
export async function actualizarInversor(
  connection: Connection,
  id: number,
  datos: { activo?: boolean; notas?: string }
): Promise<Inversor> {
  const repo = connection.getRepository(Inversor);
  const socio = await repo.findOne({ where: { id } });
  if (!socio) throw new Error('Socio no encontrado');

  if (datos.activo !== undefined) socio.activo = Boolean(datos.activo);
  if (datos.notas !== undefined) socio.notas = s(datos.notas);

  return repo.save(socio);
}

export interface DatosAporte {
  inversorId: number;
  monto: number;
  cuentaDestinoId: number;
  fecha?: Date;
  descripcion?: string;
}

// Aporte del socio = capital que entra. Se materializa como Transaccion desde la
// cuenta de pasivo del socio ("Socio X - por pagar", saldo negativo mientras se le
// debe) hacia la cuenta de caja que indique el usuario.
//
// OJO: Cuenta.saldo NO se toca. En esta app nadie lo deriva de las transacciones
// (create-transaccion tampoco lo hace): los saldos se llevan a mano. Mover el saldo
// aqui seria inventar un comportamiento que no existe en ningun otro flujo, y el
// resumen de la pestana Transacciones ya se calcula de las filas, asi que el dinero
// entra se ve igual.
export async function registrarAporte(
  connection: Connection,
  datos: DatosAporte
): Promise<Aporte> {
  const monto = r2Abs(datos.monto);
  if (monto <= 0) throw new Error('El monto del aporte tiene que ser mayor que 0');

  return connection.transaction(async (manager) => {
    const socio = await manager.getRepository(Inversor).findOne({ where: { id: datos.inversorId } });
    if (!socio) throw new Error('Socio no encontrado');

    const cuentaSocio = await buscarCuentaDelSocio(manager as unknown as Connection, socio);
    if (!cuentaSocio) throw new Error(`El socio "${socio.nombre}" no tiene cuenta de pasivo creada`);

    const caja = await manager.getRepository(Cuenta).findOne({ where: { id_cuenta: String(datos.cuentaDestinoId) }, relations: ['moneda'] });
    if (!caja) throw new Error('Cuenta de destino no encontrada');

    const tasa = await tasaEntreCuentas(manager as unknown as Connection, cuentaSocio, caja);
    const transaccion = await manager.getRepository(Transaccion).save(
      manager.getRepository(Transaccion).create({
        cuenta_origen: cuentaSocio,
        cuenta_destino: caja,
        monto_origen: monto,
        monto_destino: r2Abs(monto * tasa),
        tasa_cambio: tasa,
        comision: 0,
        tipo: 'transferencia',
        fecha: datos.fecha || new Date(),
        descripcion: datos.descripcion || `Aporte de ${socio.nombre}`,
      })
    );

    return manager.getRepository(Aporte).save(
      manager.getRepository(Aporte).create({
        inversor: socio,
        monto,
        cuenta_origen: cuentaSocio,
        transaccion_id: transaccion.id_trans,
        fecha: datos.fecha || new Date(),
        descripcion: datos.descripcion || '',
      })
    );
  });
}

export interface DatosInversion {
  inversorId: number;
  productoId: string;
  envioId: number;
  unidades: number;
  monto: number;
  fecha?: Date;
  descripcion?: string;
}

// Asigna capital de un socio a un producto concreto de un envio. No mueve caja: el
// dinero ya esta en la mercancia, lo que cambia es de quien es.
export async function registrarInversion(
  connection: Connection,
  datos: DatosInversion
): Promise<Inversion> {
  const unidades = Math.trunc(n(datos.unidades));
  const monto = r2Abs(datos.monto);
  if (unidades <= 0) throw new Error('Las unidades tienen que ser mayores que 0');
  if (monto <= 0) throw new Error('El monto tiene que ser mayor que 0');

  return connection.transaction(async (manager) => {
    const conn = manager as unknown as Connection;
    const repo = manager.getRepository(Inversion);
    const socio = await manager.getRepository(Inversor).findOne({ where: { id: datos.inversorId } });
    if (!socio) throw new Error('Socio no encontrado');

    const { envio, producto } = await validarAsignacionEnEnvio(
      manager,
      datos.envioId,
      datos.productoId,
      unidades
    );

    return repo.save(
      repo.create({
        inversor: socio,
        producto,
        envio,
        unidades,
        unidades_liberadas: 0,
        monto,
        monto_liberado: 0,
        comision_devengada: 0,
        comision_cobrada: 0,
        fecha_cobro_comision: null,
        fecha: datos.fecha || new Date(),
        descripcion: datos.descripcion || '',
      })
    );
  });
}

// El capital solo puede asignarse a un producto que este EN ese envio, y sin pasar de
// las unidades que el envio trae de ese producto. Es la misma regla para un alta manual
// y para una reinversion, asi que vive aqui y la llaman las dos.
async function validarAsignacionEnEnvio(
  manager: EntityManager,
  envioId: number,
  productoId: string,
  unidades: number
): Promise<{ envio: Envio; producto: Producto }> {
  const envio = await manager.getRepository(Envio).findOne({
    where: { id: envioId },
    relations: ['productos', 'productos.producto'],
  });
  if (!envio) throw new Error('Envío no encontrado');

  const linea = (envio.productos || []).find((pe) => s(pe.producto?.id_prod) === s(productoId));
  if (!linea) throw new Error(`El producto no forma parte del envío #${envio.id}`);

  // Unidades ya asignadas por cualquier socio, para no financiar dos veces la misma.
  const yaInvertidas = await manager
    .getRepository(Inversion)
    .createQueryBuilder('i')
    .innerJoin('i.envio', 'e')
    .where('e.id = :envio', { envio: envio.id })
    .andWhere('i.producto_id = :producto', { producto: linea.producto?.id_prod })
    .select('COALESCE(SUM(i.unidades), 0)', 'total')
    .getRawOne();
  const usadas = Math.trunc(n(yaInvertidas?.total));
  const disponibles = n(linea.cantidad) - usadas;
  if (unidades > disponibles) {
    throw new Error(
      `Ese producto tiene ${n(linea.cantidad)} unidades en el envío y ya hay ${usadas} asignadas a inversores. Solo quedan ${disponibles} libres.`
    );
  }

  const producto = await manager.getRepository(Producto).findOne({
    where: { id_prod: linea.producto?.id_prod },
  });
  if (!producto) throw new Error('Producto no encontrado');

  return { envio, producto };
}

export interface DatosMovimiento {
  inversorId: number;
  tipo: 'retiro' | 'reinversion';
  monto: number;
  fecha?: Date;
  descripcion?: string;
  // Reinversion: donde vuelve el capital. El envio tiene que traer ese producto.
  envioDestinoId?: number;
  productoDestinoId?: string;
  unidades?: number;
  // Retiro: cuenta de caja desde la que se paga.
  cuentaOrigenId?: number;
  tasaCambio?: number;
}

// Capital liberado que todavia no tiene destino: lo que el FIFO ya libero por ventas,
// menos lo que ya se reinvirtio o se le pago al socio.
//
// OJO: `Inversion.monto_liberado` NO se toca aqui. Lo escribe una sola funcion,
// sincronizarInversores(), a partir de lo que consumio la pasada FIFO. Si una
// reinversion lo incrementara "a mano" para fingir una liberacion, el proximo recalculo
// lo borraria y el reinvertido quedaria colgando de nada. Por eso la reinversion se
// representa con la Inversion NUEVA que nace abajo, no tocando la liberada.
//
// disponible = liberado - reinvertido - retirado es el mismo calculo que hace
// calcularResumenInversores; se repite aqui, dentro de la transaccion, para poder
// validar antes de escribir.
async function capitalDisponible(
  manager: EntityManager,
  socioId: number
): Promise<{ liberado: number; reinvertido: number; retirado: number; disponible: number }> {
  const inversiones = await manager
    .getRepository(Inversion)
    .find({ where: { inversor: { id: socioId } } as FindOptionsWhere<Inversion> });
  const movimientos = await manager
    .getRepository(MovimientoCapital)
    .find({ where: { inversor: { id: socioId } } as FindOptionsWhere<MovimientoCapital> });

  const liberado = inversiones.reduce((sum, i) => sum + n(i.monto_liberado), 0);
  const reinvertido = movimientos
    .filter((m) => s(m.tipo) === 'reinversion')
    .reduce((sum, m) => sum + n(m.monto), 0);
  const retirado = movimientos
    .filter((m) => s(m.tipo) === 'retiro')
    .reduce((sum, m) => sum + n(m.monto), 0);

  return { liberado, reinvertido, retirado, disponible: liberado - reinvertido - retirado };
}

// Reinyersion o retiro del capital liberado.
//
// - retiro: sale de caja a la cuenta de pasivo del socio. Paga el capital INTEGRO: el
//   1% devengado no se descuenta aqui, se cobra aparte con registrarCobroComision
//   cuando el socio lo paga al depositar el importe en QvaPay. Por eso `disponible` es
//   solo capital y la comision no entra en esta cuenta.
// - reinversion: no mueve caja, pero nace una Inversion NUEVA en el producto destino,
//   apuntando con inversion_origen a la Inversion cuya liberacion esta financia. Si el
//   dinero se moviera sin quedar invertido en ningun lado, el capital desapareceria del
//   cuadre del socio sin que nada lo dijera.
export async function registrarMovimiento(
  connection: Connection,
  datos: DatosMovimiento
): Promise<MovimientoCapital> {
  const monto = r2Abs(datos.monto);
  if (monto <= 0) throw new Error('El monto tiene que ser mayor que 0');
  if (datos.tipo !== 'retiro' && datos.tipo !== 'reinversion') {
    throw new Error(`Tipo de movimiento desconocido: ${datos.tipo}`);
  }

  return connection.transaction(async (manager) => {
    const conn = manager as unknown as Connection;
    const repo = manager.getRepository(MovimientoCapital);
    const socio = await manager.getRepository(Inversor).findOne({ where: { id: datos.inversorId } });
    if (!socio) throw new Error('Socio no encontrado');

    // Nada se mueve con capital que no se libero. Se valida siempre, en los dos tipos,
    // para que un dato mal puesto se note al instante y no tres meses despues en el
    // cuadre del socio.
    const { disponible } = await capitalDisponible(manager, n(socio.id));
    if (monto > r2Abs(disponible) + 0.01) {
      throw new Error(
        `El capital liberado de "${socio.nombre}" es de ${r2Abs(disponible)} y el movimiento es de ${monto}. No sale de una liberacion.`
      );
    }

    let transaccionId: number | null = null;

    if (datos.tipo === 'retiro') {
      const cuentaSocio = await buscarCuentaDelSocio(conn, socio);
      if (!cuentaSocio) throw new Error(`El socio "${socio.nombre}" no tiene cuenta de pasivo creada`);
      if (!datos.cuentaOrigenId) throw new Error('Hay que indicar de qué cuenta de caja se paga el retiro');
      const caja = await manager.getRepository(Cuenta).findOne({
        where: { id_cuenta: String(datos.cuentaOrigenId) },
        relations: ['moneda'],
      });
      if (!caja) throw new Error('Cuenta de origen no encontrada');
      // NO se compara contra Cuenta.saldo a proposito: en esta app los saldos se llevan
      // a mano (create-transaccion tampoco los toca), asi que ese numero no se mantiene
      // con los retiros y acabaria bloqueando pagos legitimos. Lo que si manda es el
      // capital liberado del socio, que se valido mas arriba.

      const tasa = datos.tasaCambio || (await tasaEntreCuentas(conn, caja, cuentaSocio));
      const transaccion = await manager.getRepository(Transaccion).save(
        manager.getRepository(Transaccion).create({
          cuenta_origen: caja,
          cuenta_destino: cuentaSocio,
          monto_origen: monto,
          monto_destino: r2Abs(monto * tasa),
          tasa_cambio: tasa,
          comision: 0,
          tipo: 'transferencia',
          fecha: datos.fecha || new Date(),
          descripcion: datos.descripcion || `Retiro a ${socio.nombre}`,
        })
      );
      transaccionId = transaccion.id_trans;
    }

    let envioDestino: Envio | null = null;
    let productoDestino: Producto | null = null;
    let unidadesDestino = 0;
    let inversionOrigen: Inversion | null = null;

    if (datos.tipo === 'reinversion') {
      if (!datos.envioDestinoId) throw new Error('Hay que indicar en qué envío se reinvierte el capital');
      if (!datos.productoDestinoId) throw new Error('Hay que indicar en qué producto se reinvierte el capital');
      unidadesDestino = Math.trunc(n(datos.unidades));
      if (unidadesDestino <= 0) throw new Error('Las unidades reinvertidas tienen que ser mayores que 0');

      const destino = await validarAsignacionEnEnvio(
        manager,
        n(datos.envioDestinoId),
        s(datos.productoDestinoId),
        unidadesDestino
      );
      envioDestino = destino.envio;
      productoDestino = destino.producto;

      // De donde sale el capital: la liberacion mas antigua todavia sin usar. FIFO
      // igual que todo lo demas, para que el origen del dinero sea siempre el mas viejo.
      const inversiones = await manager
        .getRepository(Inversion)
        .find({ where: { inversor: { id: socio.id } } as FindOptionsWhere<Inversion> })
        .then((todas) =>
          todas.sort((a, b) => (a.fecha.getTime() - b.fecha.getTime()) || (n(a.id) - n(b.id)))
        );
      const movimientos = await manager
        .getRepository(MovimientoCapital)
        .find({ where: { inversor: { id: socio.id } } as FindOptionsWhere<MovimientoCapital>, relations: ['inversion_origen'] });
      const yaReinvertidoPorOrigen = new Map<number, number>();
      for (const m of movimientos) {
        if (s(m.tipo) !== 'reinversion') continue;
        const origen = n(m.inversion_origen?.id);
        if (!origen) continue;
        yaReinvertidoPorOrigen.set(origen, n(yaReinvertidoPorOrigen.get(origen)) + n(m.monto));
      }

      const origenFila = inversiones.find((inv) => {
        const libre = r2Abs(n(inv.monto_liberado) - n(yaReinvertidoPorOrigen.get(n(inv.id))));
        return libre + 0.01 >= monto;
      });
      if (!origenFila) {
        throw new Error(
          `Ninguna venta liberada de "${socio.nombre}" alcanza por sí sola para ${monto}. Si el capital viene de varias ventas, haz un reinversión por cada una.`
        );
      }
      inversionOrigen = origenFila;
    }

    const movimiento = await repo.save(
      repo.create({
        inversor: socio,
        tipo: datos.tipo,
        monto,
        envio_destino: envioDestino,
        inversion_origen: inversionOrigen,
        transaccion_id: transaccionId,
        fecha: datos.fecha || new Date(),
        descripcion: datos.descripcion || '',
      } as MovimientoCapital)
    );

    // La reinversion se vuelve a invertir de verdad: nace la Inversion nueva. Las
    // unidades_liberadas arrancan en 0 porque las escribe la pasada FIFO del proximo
    // recalculo, no esta.
    if (datos.tipo === 'reinversion' && envioDestino && productoDestino) {
      await manager.getRepository(Inversion).save(
        manager.getRepository(Inversion).create({
          inversor: socio,
          producto: productoDestino,
          envio: envioDestino,
          unidades: unidadesDestino,
          unidades_liberadas: 0,
          monto,
          monto_liberado: 0,
          comision_devengada: 0,
          comision_cobrada: 0,
          fecha_cobro_comision: null,
          fecha: datos.fecha || new Date(),
          descripcion: datos.descripcion || `Reinversión de ${socio.nombre}`,
        })
      );
    }

    return movimiento;
  });
}

export interface DatosCobroComision {
  inversorId: number;
  monto: number;
  fecha?: Date;
  // Sin "descripcion" a proposito: el cobro se agrega sobre las Inversion del socio
  // (una sola fila por inversion) y no hay entidad de evento donde guardarla, asi que
  // un texto suelto se perderia en el siguiente cobro parcial. Si alguna vez hace falta
  // una nota, hay que crear la entidad de cobros, no colgar una columna mas aca.
}

export interface AplicacionCobro {
  inversionId: number;
  nombreProducto: string;
  aplicado: number;
  pendienteRestante: number;
}

export interface ResultadoCobroComision {
  cobradas: number;
  pendientes: number;
  aplicaciones: AplicacionCobro[];
}

// Registro del cobro del 1% que el socio pago al depositar el importe de la venta en
// QvaPay. El DEVENGO lo escribio la pasada FIFO (comision_devengada) y el retiro paga el
// capital integro, asi que este es el unico momento en que la comision pasa de "ya
// gastada en la contabilidad" a "entró de verdad".
//
// El reparto entre inversiones va FIFO por la fecha de la propia Inversion. No es
// arbitrario: el FIFO de rentabilidad construye los segmentos de capital en ese mismo
// orden (fecha, luego id), asi que la inversion mas antigua es la primera en devengar.
// Lo que NO se guarda es la fecha exacta de cada devengo, asi que ese es el criterio.
//
// OJO: el cobro no se guarda como Transaccion a proposito. El dinero del socio ya se
// movio en el movimiento de caja real (la recarga de QvaPay que ya esta registrada); lo
// unico que falta es constancia de que el 1% salio de ahi. Crear una transaccion
// ficticia de 0.5 USD infla los movimientos y no representa ningun flujo de dinero real.
export async function registrarCobroComision(
  connection: Connection,
  datos: DatosCobroComision
): Promise<ResultadoCobroComision> {
  const monto = r2Abs(datos.monto);
  if (monto <= 0) throw new Error('El monto del cobro tiene que ser mayor que 0');

  return connection.transaction(async (manager) => {
    const repo = manager.getRepository(Inversion);
    const socio = await manager.getRepository(Inversor).findOne({ where: { id: datos.inversorId } });
    if (!socio) throw new Error('Socio no encontrado');

    const inversiones = await repo.find({
      where: { inversor: { id: socio.id } } as FindOptionsWhere<Inversion>,
      relations: ['producto'],
    });
    const pendientes = inversiones
      .map((i) => ({
        fila: i,
        pendiente: r2Abs(n(i.comision_devengada) - n(i.comision_cobrada)),
      }))
      .filter((x) => x.pendiente > 0.004)
      .sort((a, b) => {
        const fa = a.fila.fecha instanceof Date ? a.fila.fecha.getTime() : 0;
        const fb = b.fila.fecha instanceof Date ? b.fila.fecha.getTime() : 0;
        return fa - fb || n(a.fila.id) - n(b.fila.id);
      });

    const totalPendiente = r2Abs(pendientes.reduce((sum, x) => sum + x.pendiente, 0));
    if (monto > totalPendiente + 0.01) {
      throw new Error(
        `A "${socio.nombre}" le quedan ${totalPendiente} USD de comisión del 1% por cobrar, no ${monto}.`
      );
    }

    const fecha = datos.fecha || new Date();
    const aplicaciones: AplicacionCobro[] = [];
    let restante = monto;

    for (const { fila, pendiente } of pendientes) {
      if (restante <= 0.004) break;
      const aplicado = r2Abs(Math.min(restante, pendiente));
      fila.comision_cobrada = r2Abs(n(fila.comision_cobrada) + aplicado);
      // La fecha es la del PRIMER cobro: si mas adelante vuelve a pagar otra parte, la
      // fecha de "cuando empezo a pagar" no debe moverse.
      if (!fila.fecha_cobro_comision) fila.fecha_cobro_comision = fecha;
      await repo.save(fila);
      restante = r2Abs(restante - aplicado);
      aplicaciones.push({
        inversionId: n(fila.id),
        nombreProducto: s(fila.producto?.nombre_prod) || `Inversion #${n(fila.id)}`,
        aplicado,
        pendienteRestante: r2Abs(pendiente - aplicado),
      });
    }

    return {
      cobradas: r2Abs(monto - restante),
      pendientes: r2Abs(
        inversiones.reduce((sum, i) => sum + Math.max(0, n(i.comision_devengada) - n(i.comision_cobrada)), 0)
      ),
      aplicaciones,
    };
  });
}

async function buscarCuentaDelSocio(
  connection: Connection,
  socio: Inversor
): Promise<Cuenta | null> {
  const esperado = `socio ${s(socio.nombre)} - por pagar`.trim().toLowerCase();
  if (!s(socio.nombre).trim()) return null;
  const cuentas = await connection.getRepository(Cuenta).find();
  return cuentas.find((c) => s(c.nombre).trim().toLowerCase() === esperado) || null;
}

// Tasa para la Transaccion. Entre cuentas de la misma moneda es 1; si no, se usa la
// tasa vigente de la moneda destino (que es como lo hace el resto de la app).
async function tasaEntreCuentas(
  connection: Connection,
  origen: Cuenta,
  destino: Cuenta
): Promise<number> {
  const codOrigen = s(origen.moneda?.codigo);
  const codDestino = s(destino.moneda?.codigo);
  if (codOrigen && codDestino && codOrigen === codDestino) return 1;
  if (codDestino) return n(await getTasaActual(codDestino)) || 1;
  return 1;
}

function r2Abs(valor: any): number {
  return Number(n(valor).toFixed(2));
}
