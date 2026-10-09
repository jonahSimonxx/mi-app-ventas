import { Connection } from 'typeorm';
import { Envio } from '../../shared/entities/Envio';
import { Producto } from '../../shared/entities/Producto';
import { Venta } from '../../shared/entities/Venta';
import { FlujoConversion } from '../../shared/entities/FlujoConversion';
import { Inversion } from '../../shared/entities/Inversion';
import { Inversor } from '../../shared/entities/Inversor';
import { sincronizarInversiones } from './inversoresService';

export type VeredictoEnvio = 'exitoso' | 'en_curso' | 'sin_vender' | 'perdida';

// Comision que se DEVENGAN los socios sobre las ventas de la mercancia que financiaron.
// Sale de la misma pasada FIFO que el costo real, no de un promedio. Se devenga al vender
// y se cobra aparte, cuando el socio deposita el importe de la venta en QvaPay.
export const COMISION_INVERSOR_PCT = 1;

export interface LineaFIFO {
  productoId: string;
  unidades: number;
  costoUnitarioReal: number;
  envioId: number;
  envioFecha: number;
  // Que socio financio estas unidades. 0 = sin financiar (la unidad no la cubrio
  // ningun inversor y por lo tanto no genera comision del 1%).
  inversorId: number;
  inversionId: number;
}

export interface DetalleCostoVenta {
  ventaId: number;
  costoTotalUsd: number;
  gananciaUsd: number;
  comisionInversoresUsd: number;
  lineas: LineaFIFO[];
  unidadesSinOrigen: number;
}

export interface RentabilidadEnvio {
  envioId: number;
  proveedor: string;
  fecha: string;
  estado: string;
  invertido: number;
  costoProductos: number;
  overhead: number;
  unidadesTotales: number;
  unidadesVendidas: number;
  unidadesPendientes: number;
  recuperado: number;
  costoVendido: number;
  utilidadRealizada: number;
  margenPct: number;
  veredicto: VeredictoEnvio;
}

export interface ResumenRentabilidad {
  ingresosVentas: number;
  costoVendidoReal: number;
  utilidadBruta: number;
  perdidasConversion: number;
  comisionesInversores: number;
  gananciaNetaReal: number;
  invertidoTotal: number;
  capitalInventario: number;
}

export interface SugerenciaPrecio {
  productoId: string;
  nombre: string;
  costoRealFifo: number;
  tieneOrigen: boolean;
  envioOrigenId: number | null;
  stockDisponible: number;
  precioActual: number;
  margenActualPct: number;
  precioSugeridoUsd: number;
  precioSugeridoCup: number;
  gananciaUnitariaUsd: number;
  gananciaUnitariaCup: number;
  bajoMargenObjetivo: boolean;
}

export interface PreviewCostoVenta {
  costoTotalUsd: number;
  gananciaUsd: number;
  totalUsd: number;
  detalle: Array<{
    productoId: string;
    nombre: string;
    unidades: number;
    costoUnitarioReal: number;
    subtotalCosto: number;
    envioOrigenId: number | null;
  }>;
  unidadesSinOrigen: number;
}

export interface LineaVentaSimulada {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  costoFallback: number;
}

export interface ResultadoRentabilidad {
  porEnvio: RentabilidadEnvio[];
  porVenta: DetalleCostoVenta[];
  // Comision del 1% acumulada por socio (id -> USD), por Inversion (id -> USD) y
  // unidades liberadas por cada Inversion. Los escribe una sola pasada (esta) y los
  // usa inversoresService.
  comisionPorInversor: Map<number, number>;
  unidadesPorInversion: Map<number, number>;
  comisionPorInversion: Map<number, number>;
  resumen: ResumenRentabilidad;
}

// Sub-asignacion de capital dentro de un lote. Un lote es (envio, producto), pero
// ese mismo envio puede estar financiado por varios inversores: cada Inversion es
// un segmento con su propio inversor. Se consume FIFO dentro del lote, igual que el
// lote se consume FIFO entre envios. El segmento final sin financiar cubre las
// unidades del envio que ningun socio cubrio (inversionId 0).
interface OrigenLote {
  inversionId: number;
  inversorId: number;
  unidadesIniciales: number;
  unidadesRestantes: number;
  // Fecha de la Inversion que financia este segmento. 0 en el segmento sin financiar.
  // Una inversion no puedecredited por una venta anterior a su fecha: el dinero del
  // socio todavia no estaba en la mercancia que se vendio, asi que no hay nada que
  // comisionar. Al saltar el segmento, esas unidades caen al siguiente y, si no hay,
  // al sin financiar: el COSTO no cambia (es el mismo costoUnitarioReal del lote), solo
  // deja de atribuirse a un socio.
  fechaOrden: number;
}

interface LoteOferta {
  envioId: number;
  productoId: string;
  cantidadInicial: number;
  cantidadRestante: number;
  precioUnitario: number;
  costoUnitarioReal: number;
  fechaOrden: number;
  origenes: OrigenLote[];
}

function n(valor: any): number {
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : 0;
}

function timestamp(valor: Date | string | null | undefined): number {
  if (!valor) return 0;
  const d = valor instanceof Date ? valor : new Date(valor);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function isoFecha(valor: Date | string | null | undefined): string {
  if (!valor) return '';
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : '';
}

async function cargarEnvios(connection: Connection): Promise<Envio[]> {
  return connection.getRepository(Envio).find({
    relations: ['productos', 'productos.producto'],
    order: { fecha_creacion: 'ASC', id: 'ASC' },
  });
}

async function cargarVentas(connection: Connection): Promise<Venta[]> {
  return connection.getRepository(Venta).find({
    relations: ['productos', 'productos.producto'],
    order: { fecha: 'ASC', id: 'ASC' },
  });
}

async function cargarInversiones(connection: Connection): Promise<Inversion[]> {
  return connection.getRepository(Inversion).find({
    relations: ['inversor', 'producto', 'envio'],
    order: { fecha: 'ASC', id: 'ASC' },
  });
}

function overheadDeEnvio(envio: Envio): number {
  return n(envio.costo) + n(envio.aranceles_usd) + n(envio.otros_costos_usd);
}

function unidadesDeEnvio(envio: Envio): number {
  return (envio.productos || []).reduce((sum, pe) => sum + n(pe.cantidad), 0);
}

function overheadPorUnidad(envio: Envio): number {
  const unidades = unidadesDeEnvio(envio);
  if (unidades <= 0) return 0;
  return overheadDeEnvio(envio) / unidades;
}

// Segmentos de capital para un (envio, producto). Las inversiones se ordenan por
// fecha y se consumen FIFO; si no cubren todas las unidades del envio, el resto queda
// como un segmento sin financiar, que es el mismo criterio que unidadesSinOrigen.
function construirOrigenes(
  clave: string,
  unidadesEnvio: number,
  inversionesPorClave: Map<string, Inversion[]>
): OrigenLote[] {
  const origenes: OrigenLote[] = [];
  let cubiertas = 0;

  for (const inv of inversionesPorClave.get(clave) || []) {
    const unidades = n(inv.unidades);
    const restante = Math.max(0, Math.min(unidades, unidadesEnvio - cubiertas));
    if (restante <= 0) continue;
    origenes.push({
      inversionId: n(inv.id),
      inversorId: n(inv.inversor?.id),
      unidadesIniciales: restante,
      unidadesRestantes: restante,
      fechaOrden: timestamp(inv.fecha),
    });
    cubiertas += restante;
  }

  // Segmento sin financiar: capacidad para TODO el lote, no solo para lo que sobra de
  // los inversores. Es deliberado y es lo que hace que el filtro por fecha no pierde
  // unidades.
  //
  // El problema que resuelve: si los inversores cubren las 2 unidades de un envio y la
  // inversion es de HOY, una venta de la semana pasada no puede atribuirse a nadie (el
  // segmento del socio es posterior a la venta y se salta). Si este segmento solo
  // existiera con "lo que no cubren los socios" -que aqui es cero- no habria a quien
  // cargarle esa unidad, y se perdia en silencio: sin costo, sin comision y sin linea
  // en el detalle. El costo del lote es el mismo para todos los segmentos, asi que
  // darsela al que no tiene socio no inventa nada, solo deja de atribuirla a uno que
  // todavia no era dueno de esa mercancia.
  origenes.push({
    inversionId: 0,
    inversorId: 0,
    unidadesIniciales: unidadesEnvio,
    unidadesRestantes: unidadesEnvio,
    fechaOrden: 0,
  });

  return origenes;
}

function construirOferta(
  envios: Envio[],
  inversiones: Inversion[] = []
): Map<string, LoteOferta[]> {
  const mapa = new Map<string, LoteOferta[]>();
  const inversionesPorClave = new Map<string, Inversion[]>();
  for (const inv of inversiones) {
    const envioId = n(inv.envio?.id);
    const productoId = inv.producto?.id_prod;
    if (!envioId || !productoId) continue;
    const clave = `${envioId}::${productoId}`;
    const lista = inversionesPorClave.get(clave) || [];
    lista.push(inv);
    inversionesPorClave.set(clave, lista);
  }
  for (const lista of inversionesPorClave.values()) {
    lista.sort((a, b) => timestamp(a.fecha) - timestamp(b.fecha) || n(a.id) - n(b.id));
  }

  for (const envio of envios) {
    if (envio.estado !== 'recibido') continue;
    const overhead = overheadPorUnidad(envio);
    const fechaOrden = timestamp(envio.fecha_recepcion) || timestamp(envio.fecha_creacion);

    for (const pe of envio.productos || []) {
      const productoId = pe.producto?.id_prod;
      const cantidad = n(pe.cantidad);
      if (!productoId || cantidad <= 0) continue;

      const precioUnitario = n(pe.precio_unitario);
      const lote: LoteOferta = {
        envioId: envio.id,
        productoId,
        cantidadInicial: cantidad,
        cantidadRestante: cantidad,
        precioUnitario,
        costoUnitarioReal: precioUnitario + overhead,
        fechaOrden,
        origenes: construirOrigenes(`${envio.id}::${productoId}`, cantidad, inversionesPorClave),
      };
      const lista = mapa.get(productoId) || [];
      lista.push(lote);
      mapa.set(productoId, lista);
    }
  }

  for (const lista of mapa.values()) {
    lista.sort((a, b) => a.fechaOrden - b.fechaOrden || a.envioId - b.envioId);
  }
  return mapa;
}

function consumirVentasExistentes(oferta: Map<string, LoteOferta[]>, ventas: Venta[]): void {
  for (const venta of ventas) {
    for (const pv of venta.productos || []) {
      const productoId = pv.producto?.id_prod;
      let restantes = n(pv.cantidad);
      if (!productoId || restantes <= 0) continue;
      const lotes = oferta.get(productoId) || [];
      for (const lote of lotes) {
        if (restantes <= 0) break;
        if (lote.cantidadRestante <= 0) continue;
        const take = Math.min(restantes, lote.cantidadRestante);
        lote.cantidadRestante -= take;
        restantes -= take;
      }
    }
  }
}

function calcularInvertidoEnvio(envio: Envio): {
  costoProductos: number;
  overhead: number;
  unidades: number;
} {
  let costoProductos = 0;
  let unidades = 0;
  for (const pe of envio.productos || []) {
    const cant = n(pe.cantidad);
    unidades += cant;
    costoProductos += cant * n(pe.precio_unitario);
  }
  return { costoProductos, overhead: overheadDeEnvio(envio), unidades };
}

export async function calcularRentabilidad(
  connection: Connection
): Promise<ResultadoRentabilidad> {
  const envios = await cargarEnvios(connection);
  const ventas = await cargarVentas(connection);
  const inversiones = await cargarInversiones(connection);
  const oferta = construirOferta(envios, inversiones);

  const porVenta: DetalleCostoVenta[] = [];
  const unidadesVendidasPorEnvio = new Map<number, number>();
  const recuperadoPorEnvio = new Map<number, number>();
  const costoVendidoPorEnvio = new Map<number, number>();
  const comisionPorInversor = new Map<number, number>();
  const comisionPorInversion = new Map<number, number>();
  const unidadesPorInversion = new Map<number, number>();

  for (const venta of ventas) {
    const lineas: LineaFIFO[] = [];
    let costoTotalUsd = 0;
    let unidadesSinOrigen = 0;
    let comisionInversoresUsd = 0;
    // Corte de atribucion del socio para esta venta: una inversion solo comisiona si
    // su fecha es posterior o igual. Se calcula una vez por venta.
    const fechaVenta = timestamp(venta.fecha);

    for (const pv of venta.productos || []) {
      const productoId = pv.producto?.id_prod;
      let restantes = n(pv.cantidad);
      if (!productoId || restantes <= 0) continue;

      const lotes = oferta.get(productoId) || [];
      for (const lote of lotes) {
        if (restantes <= 0) break;
        if (lote.cantidadRestante <= 0) continue;
        const totalDelLote = Math.min(restantes, lote.cantidadRestante);
        let porTomar = totalDelLote;
        lote.cantidadRestante -= totalDelLote;
        restantes -= totalDelLote;

        // El lote se consume por segmentos de capital: primero los inversores mas
        // antiguos de ese envio, y al final las unidades sin financiar. El costo es
        // el mismo para todos los segmentos, pero la comision del 1% solo la pagan las
        // unidades con inversor.
        //
        // Una venta NUNCA atribuye unidades a una inversion de fecha posterior: se
        // salta el segmento (sus unidades no se tocan, quedan para ventas futuras) y
        // la unidad sigue al siguiente segmento. El costo sigue siendo el del lote, asi
        // que esto no toca costo_total_usd ni la ganancia: solo decide quien comisiona.
        for (const origen of lote.origenes) {
          if (porTomar <= 0) break;
          if (origen.unidadesRestantes <= 0) continue;
          if (origen.fechaOrden > fechaVenta) continue;
          const take = Math.min(porTomar, origen.unidadesRestantes);
          origen.unidadesRestantes -= take;
          porTomar -= take;

          const subtotal = take * lote.costoUnitarioReal;
          costoTotalUsd += subtotal;

          unidadesVendidasPorEnvio.set(
            lote.envioId,
            (unidadesVendidasPorEnvio.get(lote.envioId) || 0) + take
          );
          costoVendidoPorEnvio.set(
            lote.envioId,
            (costoVendidoPorEnvio.get(lote.envioId) || 0) + subtotal
          );
          const ingreso = take * n(pv.precio_unitario);
          recuperadoPorEnvio.set(lote.envioId, (recuperadoPorEnvio.get(lote.envioId) || 0) + ingreso);

          // El 1% sigue la mercancia que financio cada socio. Las unidades sin
          // financiar (inversionId 0) no generan comision.
          if (origen.inversorId > 0) {
            const comision = ingreso * (COMISION_INVERSOR_PCT / 100);
            comisionInversoresUsd += comision;
            comisionPorInversor.set(
              origen.inversorId,
              (comisionPorInversor.get(origen.inversorId) || 0) + comision
            );
            unidadesPorInversion.set(
              origen.inversionId,
              (unidadesPorInversion.get(origen.inversionId) || 0) + take
            );
            comisionPorInversion.set(
              origen.inversionId,
              (comisionPorInversion.get(origen.inversionId) || 0) + comision
            );
          }

          lineas.push({
            productoId,
            unidades: take,
            costoUnitarioReal: lote.costoUnitarioReal,
            envioId: lote.envioId,
            envioFecha: lote.fechaOrden,
            inversorId: origen.inversorId,
            inversionId: origen.inversionId,
          });
        }
      }

      if (restantes > 0) {
        const costoFallback = n(pv.producto?.costo);
        costoTotalUsd += restantes * costoFallback;
        unidadesSinOrigen += restantes;
        lineas.push({
          productoId,
          unidades: restantes,
          costoUnitarioReal: costoFallback,
          envioId: 0,
          envioFecha: 0,
          inversorId: 0,
          inversionId: 0,
        });
      }
    }

    const totalUsd = n(venta.total_usd);
    porVenta.push({
      ventaId: venta.id,
      costoTotalUsd,
      gananciaUsd: totalUsd - costoTotalUsd,
      comisionInversoresUsd,
      lineas,
      unidadesSinOrigen,
    });
  }

  const porEnvio: RentabilidadEnvio[] = envios.map((envio) => {
    const { costoProductos, overhead, unidades } = calcularInvertidoEnvio(envio);
    const invertido = costoProductos + overhead;
    const unidadesVendidas = unidadesVendidasPorEnvio.get(envio.id) || 0;
    const unidadesPendientes = Math.max(0, unidades - unidadesVendidas);
    const recuperado = recuperadoPorEnvio.get(envio.id) || 0;
    const costoVendido = costoVendidoPorEnvio.get(envio.id) || 0;
    const utilidadRealizada = recuperado - costoVendido;
    const margenPct = costoVendido > 0 ? (utilidadRealizada / costoVendido) * 100 : 0;

    let veredicto: VeredictoEnvio;
    if (unidadesVendidas <= 0) {
      veredicto = 'sin_vender';
    } else if (unidadesPendientes > 0) {
      veredicto = 'en_curso';
    } else {
      veredicto = utilidadRealizada > 0 ? 'exitoso' : 'perdida';
    }

    return {
      envioId: envio.id,
      proveedor: envio.proveedor,
      fecha: isoFecha(envio.fecha_recepcion) || isoFecha(envio.fecha_creacion),
      estado: envio.estado,
      invertido,
      costoProductos,
      overhead,
      unidadesTotales: unidades,
      unidadesVendidas,
      unidadesPendientes,
      recuperado,
      costoVendido,
      utilidadRealizada,
      margenPct,
      veredicto,
    };
  });

  const flujos = await connection.getRepository(FlujoConversion).find();
  const perdidasConversion = flujos.reduce((sum, f) => sum + n(f.perdida_total_in), 0);

  const ingresosVentas = ventas.reduce((sum, v) => sum + n(v.total_usd), 0);
  const costoVendidoReal = porVenta.reduce((sum, d) => sum + d.costoTotalUsd, 0);
  const utilidadBruta = ingresosVentas - costoVendidoReal;
  // El 1% que devengaron los socios es un costo real del negocio: sale del precio de
  // venta que ya estaba contabilizado en ingresosVentas, asi que restarlo aqui es lo que
  // hace que gananciaNetaReal sea la utilidad que de verdad te queda.
  //
  // Se resta lo DEVENGADO, no lo cobrado, a proposito. El cobro del 1% ocurre mucho mas
  // tarde (cuando el socio deposita la venta en QvaPay), asi que cobrar en caja
  // moveria la ganancia de un mes pasado cada vez que registras un cobro, y los
  // numeros viejos parecerian corregidos a posteriori. El pendiente se muestra aparte,
  // como plata que ya gastaste en la contabilidad y que todavia no tiene.
  const comisionesInversores = porVenta.reduce((sum, d) => sum + d.comisionInversoresUsd, 0);
  const invertidoTotal = porEnvio.reduce((sum, e) => sum + e.invertido, 0);
  const costoVendidoTotal = porEnvio.reduce((sum, e) => sum + e.costoVendido, 0);
  const capitalInventario = Math.max(0, invertidoTotal - costoVendidoTotal);

  return {
    porEnvio,
    porVenta,
    comisionPorInversor,
    unidadesPorInversion,
    comisionPorInversion,
    resumen: {
      ingresosVentas,
      costoVendidoReal,
      utilidadBruta,
      perdidasConversion,
      comisionesInversores,
      gananciaNetaReal: utilidadBruta - perdidasConversion - comisionesInversores,
      invertidoTotal,
      capitalInventario,
    },
  };
}

export async function recalcularStock(connection: Connection): Promise<void> {
  const envios = await cargarEnvios(connection);
  const ventas = await cargarVentas(connection);

  const enEnvio = new Set<string>();
  const recibidas = new Map<string, number>();
  for (const envio of envios) {
    for (const pe of envio.productos || []) {
      const id = pe.producto?.id_prod;
      if (!id) continue;
      enEnvio.add(id);
      if (envio.estado !== 'recibido') continue;
      recibidas.set(id, (recibidas.get(id) || 0) + n(pe.cantidad));
    }
  }

  const vendidas = new Map<string, number>();
  for (const venta of ventas) {
    for (const pv of venta.productos || []) {
      const id = pv.producto?.id_prod;
      if (!id) continue;
      vendidas.set(id, (vendidas.get(id) || 0) + n(pv.cantidad));
    }
  }

  const repoProducto = connection.getRepository(Producto);
  const productos = await repoProducto.find();

  // Solo se deriva el stock de los productos que participan del flujo de ENVÍOS
  // (aparecen en algún envío, pendiente o recibido): su stock es `recibidas − vendidas`
  // contando solo envíos `recibido`. Un producto que el usuario inventory a mano y que
  // NUNCA ha entrado en un envío conserva el stock que escribió (si lo deriváramos con
  // `recibidas 0`, "agregar producto y venderlo" lo dejaría en `0 − vendidas` = negativo
  // fantasma, justo el bug del artículo vendido que aparece en −1). Para esos productos
  // las ventas se descuentan directamente en main.ts (ajustarStockManual), no aquí.
  const derivados = enEnvio;

  for (const producto of productos) {
    if (!derivados.has(producto.id_prod)) continue;
    const stock = (recibidas.get(producto.id_prod) || 0) - (vendidas.get(producto.id_prod) || 0);
    if (n(producto.stock_actual) !== stock) {
      producto.stock_actual = stock;
      await repoProducto.save(producto);
    }
  }
}

export async function recalcularTodo(
  connection: Connection
): Promise<ResultadoRentabilidad> {
  const resultado = await calcularRentabilidad(connection);

  const repoVenta = connection.getRepository(Venta);
  for (const detalle of resultado.porVenta) {
    const venta = await repoVenta.findOne({ where: { id: detalle.ventaId } });
    if (!venta) continue;
    const costo = Number(detalle.costoTotalUsd.toFixed(2));
    const ganancia = Number(detalle.gananciaUsd.toFixed(2));
    const comision = Number(detalle.comisionInversoresUsd.toFixed(2));
    if (
      n(venta.costo_total_usd) !== costo ||
      n(venta.ganancia_usd) !== ganancia ||
      n(venta.comision_inversores_usd) !== comision
    ) {
      venta.costo_total_usd = costo;
      venta.ganancia_usd = ganancia;
      venta.comision_inversores_usd = comision;
      await repoVenta.save(venta);
    }
  }

  await sincronizarInversiones(
    connection,
    resultado.unidadesPorInversion,
    resultado.comisionPorInversion
  );
  await recalcularStock(connection);

  return resultado;
}

export async function previewCostoVenta(
  connection: Connection,
  lineas: LineaVentaSimulada[]
): Promise<PreviewCostoVenta> {
  const envios = await cargarEnvios(connection);
  const ventas = await cargarVentas(connection);
  const oferta = construirOferta(envios);
  consumirVentasExistentes(oferta, ventas);

  const detalle: PreviewCostoVenta['detalle'] = [];
  let costoTotalUsd = 0;
  let totalUsd = 0;
  let unidadesSinOrigen = 0;

  for (const linea of lineas) {
    const cantidad = n(linea.cantidad);
    if (cantidad <= 0) continue;
    totalUsd += cantidad * n(linea.precioUnitario);

    let restantes = cantidad;
    const lotes = oferta.get(linea.productoId) || [];
    for (const lote of lotes) {
      if (restantes <= 0) break;
      if (lote.cantidadRestante <= 0) continue;
      const take = Math.min(restantes, lote.cantidadRestante);
      lote.cantidadRestante -= take;
      restantes -= take;
      costoTotalUsd += take * lote.costoUnitarioReal;
      detalle.push({
        productoId: linea.productoId,
        nombre: linea.nombre,
        unidades: take,
        costoUnitarioReal: lote.costoUnitarioReal,
        subtotalCosto: take * lote.costoUnitarioReal,
        envioOrigenId: lote.envioId,
      });
    }

    if (restantes > 0) {
      const subtotal = restantes * n(linea.costoFallback);
      costoTotalUsd += subtotal;
      unidadesSinOrigen += restantes;
      detalle.push({
        productoId: linea.productoId,
        nombre: linea.nombre,
        unidades: restantes,
        costoUnitarioReal: n(linea.costoFallback),
        subtotalCosto: subtotal,
        envioOrigenId: null,
      });
    }
  }

  return {
    costoTotalUsd,
    gananciaUsd: totalUsd - costoTotalUsd,
    totalUsd,
    detalle,
    unidadesSinOrigen,
  };
}

export async function calcularPreciosSugeridos(
  connection: Connection,
  margenObjetivoPct: number,
  tasaUsdCup: number
): Promise<SugerenciaPrecio[]> {
  const envios = await cargarEnvios(connection);
  const ventas = await cargarVentas(connection);
  const productos = await connection.getRepository(Producto).find();

  const oferta = construirOferta(envios);
  consumirVentasExistentes(oferta, ventas);

  const enEnvio = new Set<string>();
  const stockPorProducto = new Map<string, number>();
  for (const envio of envios) {
    for (const pe of envio.productos || []) {
      const id = pe.producto?.id_prod;
      if (!id) continue;
      enEnvio.add(id);
      if (envio.estado !== 'recibido') continue;
      stockPorProducto.set(id, (stockPorProducto.get(id) || 0) + n(pe.cantidad));
    }
  }
  for (const venta of ventas) {
    for (const pv of venta.productos || []) {
      const id = pv.producto?.id_prod;
      if (!id) continue;
      stockPorProducto.set(id, (stockPorProducto.get(id) || 0) - n(pv.cantidad));
    }
  }
  // Derivados = los que entran en algún envío (pendiente o recibido). El resto
  // conserva el stock escrito a mano en la ficha del producto (mismo criterio
  // que recalcularStock: un producto manual nunca cae en `0 recibidas − vendidas`).
  const derivados = enEnvio;

  const margen = margenObjetivoPct / 100;
  const tasa = n(tasaUsdCup);

  return productos.map((producto) => {
    const siguiente = (oferta.get(producto.id_prod) || []).find((l) => l.cantidadRestante > 0);
    const tieneOrigen = Boolean(siguiente);
    const costoRealFifo = siguiente ? siguiente.costoUnitarioReal : n(producto.costo);
    const envioOrigenId = siguiente ? siguiente.envioId : null;
    const stockDisponible = derivados.has(producto.id_prod)
      ? stockPorProducto.get(producto.id_prod) || 0
      : n(producto.stock_actual);

    const precioActual = n(producto.precio_venta);
    const precioSugeridoUsd = margen >= 1 ? 0 : costoRealFifo / (1 - margen);
    const margenActualPct =
      precioActual > 0 ? ((precioActual - costoRealFifo) / precioActual) * 100 : 0;

    return {
      productoId: producto.id_prod,
      nombre: producto.nombre_prod,
      costoRealFifo,
      tieneOrigen,
      envioOrigenId,
      stockDisponible,
      precioActual,
      margenActualPct,
      precioSugeridoUsd,
      precioSugeridoCup: precioSugeridoUsd * tasa,
      gananciaUnitariaUsd: precioSugeridoUsd - costoRealFifo,
      gananciaUnitariaCup: (precioSugeridoUsd - costoRealFifo) * tasa,
      bajoMargenObjetivo: margenActualPct < margenObjetivoPct,
    };
  });
}
