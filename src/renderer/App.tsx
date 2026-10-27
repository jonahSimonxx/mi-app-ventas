import React, { useEffect, useMemo, useState } from 'react';
import { Table } from '@heroui/react/table';
import { Tabs } from '@heroui/react/tabs';
import { Card } from '@heroui/react/card';
import { Button } from '@heroui/react/button';
import { Skeleton } from '@heroui/react/skeleton';
import { Input } from '@heroui/react/input';
import { EmptyState } from '@heroui/react/empty-state';
import { Chip } from '@heroui/react/chip';
import { toast } from '@heroui/react';
import {
  LayoutDashboard,
  Package,
  Truck,
  ArrowLeftRight,
  ShoppingCart,
  Handshake,
  Wallet,
  Receipt,
  Calculator,
  Coins,
  Sun,
  Moon,
  TrendingUp,
  Users,
  UserPlus,
  Banknote,
  PackagePlus,
  RefreshCw,
  Percent,
} from 'lucide-react';
import { useTheme } from './useTheme';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ProductoModal from './components/ProductoModal';
import VentaModal from './components/VentaModal';
import MonedaModal from './components/MonedaModal';
import TasaCambioModal from './components/TasaCambioModal';
import CuentaModal from './components/CuentaModal';
import EnvioModal from './components/EnvioModal';
import TransaccionModal from './components/TransaccionModal';
import PeerModal from './components/PeerModal';
import ConversionModal from './components/ConversionModal';
import InversorModal from './components/InversorModal';
import AporteModal from './components/AporteModal';
import InversionModal from './components/InversionModal';
import MovimientoCapitalModal from './components/MovimientoCapitalModal';
import CobroComisionModal from './components/CobroComisionModal';
import DialogoAviso, { AvisoConfig } from './components/DialogoAviso';
import NumInput from './components/NumInput';
import Paginador from './components/Paginador';
import Lobby from './components/Lobby';
import { usePaginacion } from './usePaginacion';
import { Producto } from '../shared/entities/Producto';
import { Moneda } from '../shared/entities/Moneda';
import { Cuenta } from '../shared/entities/Cuenta';
import { Envio } from '../shared/entities/Envio';
import { ProductoEnvio } from '../shared/entities/ProductoEnvio';
import { Transaccion } from '../shared/entities/Transaccion';
import { Peer } from '../shared/entities/Peer';
import { FlujoConversion } from '../shared/entities/FlujoConversion';
import { Venta } from '../shared/entities/Venta';
import { ProductoVenta } from '../shared/entities/ProductoVenta';
import { Inversor } from '../shared/entities/Inversor';
import { Aporte } from '../shared/entities/Aporte';
import { Inversion } from '../shared/entities/Inversion';
import { MovimientoCapital } from '../shared/entities/MovimientoCapital';
import {
  RentabilidadEnvio,
  ResumenRentabilidad,
  SugerenciaPrecio,
  VeredictoEnvio,
} from '../main/services/rentabilidadService';
import { ResumenInversor } from '../main/services/inversoresService';
import Selector from './components/Selector';

const App: React.FC = () => {
  const { theme, onToggleTheme } = useTheme();
  // Extrae el mensaje real del error que llega del proceso main (evita ver "Error invoking remote method").
  const mensajeDeError = (error: unknown): string => {
    const crudo =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);
    const prefijo = 'Error invoking remote method';
    const idx = crudo.indexOf(prefijo);
    const limpio = idx >= 0 ? crudo.slice(idx + prefijo.length).replace(/^[\s:'-]+/, '') : crudo;
    return limpio || 'Ocurrió un error inesperado.';
  };

  // ========== ESTADO PARA PRODUCTOS ==========
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isProductoModalOpen, setIsProductoModalOpen] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Partial<Producto> | null>(null);

  // ========== ESTADO PARA MONEDAS ==========
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [isMonedaModalOpen, setIsMonedaModalOpen] = useState(false);
  const [monedaEditar, setMonedaEditar] = useState<Partial<Moneda> | null>(null);

  // ========== ESTADO PARA CUENTAS ==========
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [isCuentaModalOpen, setIsCuentaModalOpen] = useState(false);
  const [cuentaEditar, setCuentaEditar] = useState<Partial<Cuenta> | null>(null);

  // ========== ESTADO PARA TASAS DE CAMBIO ==========
  const [isTasaModalOpen, setIsTasaModalOpen] = useState(false);

  // ========== ESTADO PARA ENVIOS ==========
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [filtroEnvioEstado, setFiltroEnvioEstado] = useState<string>('todos');
  const [isEnvioModalOpen, setIsEnvioModalOpen] = useState(false);
  const [envioEditar, setEnvioEditar] = useState<Partial<Envio> | null>(null);
  const [productosEnvio, setProductosEnvio] = useState<ProductoEnvio[]>([]);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [isTransaccionModalOpen, setIsTransaccionModalOpen] = useState(false);
  const [transaccionEditar, setTransaccionEditar] = useState<Partial<Transaccion> | null>(null);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  // ========== ESTADO PARA CONVERSIÓN (RECARGAS) ==========
  const [peers, setPeers] = useState<Peer[]>([]);
  const [isPeerModalOpen, setIsPeerModalOpen] = useState(false);
  const [peerEditar, setPeerEditar] = useState<Partial<Peer> | null>(null);
  const [flujosConversion, setFlujosConversion] = useState<FlujoConversion[]>([]);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [flujoEditar, setFlujoEditar] = useState<Partial<FlujoConversion> | null>(null);

  // ========== ESTADO PARA VENTAS ==========
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [filtroVentaEstado, setFiltroVentaEstado] = useState<string>('todos');
  const [isVentaModalOpen, setIsVentaModalOpen] = useState(false);
  const [ventaEditar, setVentaEditar] = useState<Partial<Venta> | null>(null);
  const [productosVentaSeleccionada, setProductosVentaSeleccionada] = useState<ProductoVenta[]>([]);

  // ========== ESTADO PARA RENTABILIDAD (FIFO) ==========
  const [rentabilidad, setRentabilidad] = useState<{
    porEnvio: RentabilidadEnvio[];
    porVenta: any[];
    resumen: ResumenRentabilidad;
  } | null>(null);

  // ========== ESTADO PARA CALCULADORA DE PRECIOS ==========
  const [margenObjetivo, setMargenObjetivo] = useState<number>(30);
  const [sugerencias, setSugerencias] = useState<SugerenciaPrecio[]>([]);
  const [filtroCalculadora, setFiltroCalculadora] = useState<string>('con_stock');

  // ========== ESTADO PARA INVERSORES (Fase 4.8) ==========
  const [inversores, setInversores] = useState<Inversor[]>([]);
  const [resumenInversores, setResumenInversores] = useState<ResumenInversor[]>([]);
  const [inversiones, setInversiones] = useState<Inversion[]>([]);
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const [movimientosCapital, setMovimientosCapital] = useState<MovimientoCapital[]>([]);
  const [isInversorModalOpen, setIsInversorModalOpen] = useState(false);
  const [inversorEditar, setInversorEditar] = useState<Inversor | null>(null);
  const [isAporteModalOpen, setIsAporteModalOpen] = useState(false);
  const [isInversionModalOpen, setIsInversionModalOpen] = useState(false);
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false);
  const [isCobroComisionModalOpen, setIsCobroComisionModalOpen] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<'retiro' | 'reinversion'>('reinversion');
  const [inversorSeleccionado, setInversorSeleccionado] = useState<number | null>(null);

  // ========== PESTAÑA ACTIVA ==========
  const [activeTab, setActiveTab] = useState<'productos' | 'monedas' | 'cuentas' | 'envios' | 'transacciones' | 'conversion' | 'ventas' | 'dashboard' | 'calculadora' | 'inversores'>('dashboard');

  // ========== ESTADO DE CARGA (Fase 4.7: skeletons) ==========
  // Mientras dura la carga se pintan esqueletos en vez de ceros/tablas vacías,
  // que se leen como "no hay datos" cuando en realidad todavía no llegaron.
  // Solo se activa al cambiar de pestaña (no tras cada guardado, para que la
  // pantalla no parpadee mientras se confirma una venta o un envío).
  const [cargandoDashboard, setCargandoDashboard] = useState(true);
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false);

  // ========== DIÁLOGOS (HeroUI AlertDialog reemplaza confirm/alert) ==========
  const [aviso, setAviso] = useState<AvisoConfig | null>(null);
  const mostrarAviso = (titulo: string, mensaje: React.ReactNode, status?: AvisoConfig['status']) =>
    setAviso({ titulo, mensaje, status });
  const pedirConfirmacion = (
    titulo: string,
    mensaje: React.ReactNode,
    onConfirm: () => void | Promise<void>,
    etiquetaConfirmar?: string,
    status?: AvisoConfig['status']
  ) => setAviso({ titulo, mensaje, onConfirm, etiquetaConfirmar, status });

  // ========== FILTROS Y RESUMEN DE TRANSACCIONES ==========
  const transaccionesFiltradas = useMemo(() => {
    if (!filtroFechaDesde && !filtroFechaHasta) return transacciones;
    const desde = filtroFechaDesde ? new Date(filtroFechaDesde).getTime() : -Infinity;
    const hasta = filtroFechaHasta
      ? new Date(filtroFechaHasta).getTime() + 86400000 - 1
      : Infinity;
    return transacciones.filter((t) => {
      const fecha = new Date(t.fecha).getTime();
      return fecha >= desde && fecha <= hasta;
    });
  }, [transacciones, filtroFechaDesde, filtroFechaHasta]);

  const resumenTransacciones = useMemo(() => {
    const monedaDeCuenta = (id?: number | string) => {
      const cuenta = cuentas.find((c) => String(c.id_cuenta) === String(id));
      return cuenta?.moneda?.codigo || 'N/A';
    };
    const acum: Record<string, { enviado: number; recibido: number; comision: number }> = {};
    for (const t of transaccionesFiltradas) {
      const monO = monedaDeCuenta(t.cuenta_origen?.id_cuenta);
      acum[monO] = acum[monO] || { enviado: 0, recibido: 0, comision: 0 };
      acum[monO].enviado += Number(t.monto_origen) || 0;
      acum[monO].comision += Number(t.comision) || 0;
      const monD = monedaDeCuenta(t.cuenta_destino?.id_cuenta);
      acum[monD] = acum[monD] || { enviado: 0, recibido: 0, comision: 0 };
      acum[monD].recibido += Number(t.monto_destino) || 0;
    }
    return acum;
  }, [transaccionesFiltradas, cuentas]);

  // ========== PAGINACIÓN DE TABLAS (Fase 4.11) ==========
  const enviosFiltrados = useMemo(
    () => envios.filter((e) => filtroEnvioEstado === 'todos' || e.estado === filtroEnvioEstado),
    [envios, filtroEnvioEstado]
  );
  const ventasFiltradas = useMemo(
    () => ventas.filter((v) => filtroVentaEstado === 'todos' || v.estado === filtroVentaEstado),
    [ventas, filtroVentaEstado]
  );
  const sugerenciasFiltradas = useMemo(
    () =>
      sugerencias.filter((s) => {
        if (filtroCalculadora === 'con_stock') return s.stockDisponible > 0;
        if (filtroCalculadora === 'bajo_margen') return s.bajoMargenObjetivo;
        return true;
      }),
    [sugerencias, filtroCalculadora]
  );

  const pagProductos = usePaginacion(productos.length, 10);
  const pagEnvios = usePaginacion(enviosFiltrados.length, 10, [filtroEnvioEstado]);
  const pagTransacciones = usePaginacion(transaccionesFiltradas.length, 10, [
    filtroFechaDesde,
    filtroFechaHasta,
  ]);
  const pagVentas = usePaginacion(ventasFiltradas.length, 10, [filtroVentaEstado]);
  const pagRentabilidad = usePaginacion(rentabilidad?.porEnvio.length || 0, 10);
  const pagSugerencias = usePaginacion(sugerenciasFiltradas.length, 10, [filtroCalculadora]);
  const pagAportes = usePaginacion(aportes.length, 10);
  const pagInversiones = usePaginacion(inversiones.length, 10);
  const pagMovimientos = usePaginacion(movimientosCapital.length, 10);
  const pagFlujos = usePaginacion(flujosConversion.length, 10);

  // ========== RESUMEN DEL LOBBY (Fase 6) ==========
  const ventasHoy = useMemo(() => {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
    return ventas.filter((v) => {
      const f = new Date(v.fecha).getTime();
      return f >= inicio && f < inicio + 86400000;
    });
  }, [ventas]);
  const ingresosHoyUsd = useMemo(
    () => ventasHoy.reduce((s, v) => s + (Number(v.total_usd) || 0), 0),
    [ventasHoy]
  );
  const enviosPendientes = useMemo(
    () => envios.filter((e) => e.estado === 'pendiente').length,
    [envios]
  );
  const stockBajo = useMemo(
    () =>
      productos
        .filter((p) => Number(p.stock_actual) < 2)
        .map((p) => ({ id: p.id_prod, nombre: p.nombre_prod, stock: Number(p.stock_actual) }))
        .sort((a, b) => a.stock - b.stock),
    [productos]
  );

  // ========== FUNCIONES PARA PRODUCTOS ==========
  const fetchProductos = async () => {
    const data = await window.electronAPI.getProductos();
    setProductos(data);
  };

  const handleCreateProducto = async (producto: Partial<Producto>) => {
    await window.electronAPI.createProducto(producto);
    toast.success('Producto creado');
    fetchProductos();
  };

  const handleUpdateProducto = async (id: string, producto: Partial<Producto>) => {
    await window.electronAPI.updateProducto(id, producto);
    fetchProductos();
    toast.success('Producto actualizado');
    setIsProductoModalOpen(false);
  };

  const handleDeleteProducto = (id: string) => {
    pedirConfirmacion(
      'Eliminar producto',
      '¿Estás seguro de eliminar este producto?',
      async () => {
        try {
          await window.electronAPI.deleteProducto(id);
          fetchProductos();
        } catch (error) {
          mostrarAviso('Error', mensajeDeError(error));
        }
      },
      'Eliminar'
    );
  };

  const openEditProductoModal = (producto: Producto) => {
    setProductoEditar(producto);
    setIsProductoModalOpen(true);
  };

  // ========== FUNCIONES PARA MONEDAS ==========
  const fetchMonedas = async () => {
    const data = await window.electronAPI.getMonedas();
    setMonedas(data);
  };

  const handleCreateMoneda = async (moneda: Partial<Moneda>) => {
    await window.electronAPI.createMoneda(moneda);
    fetchMonedas();
    toast.success('Moneda creada');
  };

  const handleUpdateMoneda = async (codigo: string, moneda: Partial<Moneda>) => {
    await window.electronAPI.updateMoneda(codigo, moneda);
    fetchMonedas();
    toast.success('Moneda actualizada');
    setIsMonedaModalOpen(false);
  };

  const handleDeleteMoneda = (codigo: string) => {
    pedirConfirmacion(
      'Eliminar moneda',
      '¿Estás seguro de eliminar esta moneda?',
      async () => {
        await window.electronAPI.deleteMoneda(codigo);
        fetchMonedas();
      },
      'Eliminar'
    );
  };

  const openEditMonedaModal = (moneda: Moneda) => {
    setMonedaEditar(moneda);
    setIsMonedaModalOpen(true);
  };

  // ========== FUNCIONES PARA CUENTAS ==========
  const fetchCuentas = async () => {
    const data = await window.electronAPI.getCuentas();
    setCuentas(data);
  };

  const handleCreateCuenta = async (cuenta: Partial<Cuenta>) => {
    await window.electronAPI.createCuenta(cuenta);
    fetchCuentas();
    toast.success('Cuenta creada');
  };

  const handleUpdateCuenta = async (id: string, cuenta: Partial<Cuenta>) => {
    await window.electronAPI.updateCuenta(id, cuenta);
    fetchCuentas();
    toast.success('Cuenta actualizada');
    setIsCuentaModalOpen(false);
  };

  const handleDeleteCuenta = (id: string) => {
    pedirConfirmacion(
      'Eliminar cuenta',
      '¿Estás seguro de eliminar esta cuenta?',
      async () => {
        await window.electronAPI.deleteCuenta(id);
        fetchCuentas();
      },
      'Eliminar'
    );
  };

  const openEditCuentaModal = (cuenta: Cuenta) => {
    setCuentaEditar(cuenta);
    setIsCuentaModalOpen(true);
  };

  
  // ========== FUNCIONES PARA ENVIOS ==========
  const fetchEnvios = async () => {
    const data = await window.electronAPI.getEnvios();
    setEnvios(data);
  };

  const handleCreateEnvio = async (envio: Partial<Envio>, productosEnvio: any[]) => {
    try {
      // El envío siempre nace pendiente: un envío recibido bloquea el alta de
      // productos, así que crearlo directamente como "recibido" dejaba el envío
      // guardado pero sin sus productos (el backend rechazaba cada línea).
      const estadoPedido = envio.estado || 'pendiente';
      const nuevoEnvio = await window.electronAPI.createEnvio({ ...envio, estado: 'pendiente' });

      // Las líneas se guardan SIN recalcular y el recálculo se dispara una sola vez
      // al final. Antes cada línea reventaba un recálculo completo, y a medio guardar
      // el stock se veía rojo y negativo: el envío aún estaba pendiente, así que sus
      // unidades no contaban como recibidas y salía 0 − vendidas.
      for (const pe of productosEnvio) {
        await window.electronAPI.addProductoEnvio(
          nuevoEnvio.id,
          pe.producto.id_prod,
          pe.cantidad,
          pe.precio_unitario,
          false
        );
      }

      // Con los productos ya guardados, ahora sí se aplica el estado definitivo.
      await window.electronAPI.updateEnvio(nuevoEnvio.id, { estado: estadoPedido });

      fetchEnvios();
      cargarRentabilidad();
      toast.success('Envío registrado');
      setIsEnvioModalOpen(false);
    } catch (error) {
      mostrarAviso('Error', mensajeDeError(error));
    }
  };

  const handleUpdateEnvio = async (id: number, envio: Partial<Envio>, productosEnvio: any[]) => {
    try {
      const envioActual = await window.electronAPI.getEnvioById(id);
      const bloqueado = envioActual?.estado === 'recibido';

      // Si el envío está recibido sus productos están bloqueados: solo se actualiza la cabecera.
      if (bloqueado) {
        await window.electronAPI.updateEnvio(id, envio);
        fetchEnvios();
        setIsEnvioModalOpen(false);
        return;
      }

      const existentes = await window.electronAPI.getProductosEnvio(id);

      const porProducto = new Map<string, (typeof productosEnvio)[number]>();
      for (const pe of productosEnvio) porProducto.set(pe.producto.id_prod, pe);

      // Las líneas van primero y sin recalcular: si el envío pasa a "recibido" en este
      // mismo guardado, la cabecera se actualiza al final, cuando ya no hay líneas por
      // añadir (un envío recibido las bloquea).

      // Quitar solo las líneas que ya no están en la lista.
      for (const actual of existentes) {
        if (!porProducto.has(actual.producto.id_prod)) {
          await window.electronAPI.removeProductoEnvio(actual.id, false);
        }
      }

      // Actualizar las que siguen y crear las nuevas.
      for (const pe of productosEnvio) {
        const actual = existentes.find((x) => x.producto.id_prod === pe.producto.id_prod);
        if (!actual) {
          await window.electronAPI.addProductoEnvio(
            id,
            pe.producto.id_prod,
            pe.cantidad,
            pe.precio_unitario,
            false
          );
        } else if (
          Number(actual.cantidad) !== Number(pe.cantidad) ||
          Number(actual.precio_unitario) !== Number(pe.precio_unitario)
        ) {
          await window.electronAPI.updateProductoEnvio(
            actual.id,
            pe.cantidad,
            pe.precio_unitario,
            false
          );
        }
      }

      // La cabecera va al final y es la que dispara el único recálculo.
      await window.electronAPI.updateEnvio(id, envio);

      fetchEnvios();
      cargarRentabilidad();
      toast.success('Envío actualizado');
      setIsEnvioModalOpen(false);
    } catch (error) {
      mostrarAviso('Error', mensajeDeError(error));
    }
  };

  const handleDeleteEnvio = (id: number) => {
    pedirConfirmacion(
      'Eliminar envío',
      '¿Estás seguro de eliminar este envío? Se borrarán sus productos y su costo dejará de contar en el invertido. Solo se permite si no tiene unidades vendidas ni capital de socios asignado.',
      async () => {
        try {
          await window.electronAPI.deleteEnvio(id);
          fetchEnvios();
          cargarRentabilidad();
          fetchProductos();
        } catch (error) {
          mostrarAviso('No se puede eliminar', mensajeDeError(error));
        }
      },
      'Eliminar'
    );
  };

  const openEditEnvioModal = async (envio: Envio) => {
    // Se cargan las líneas ANTES de tocar el estado: si se fija envioEditar primero,
    // el useEffect del modal corre una vez con las líneas del envío anterior y
    // otra con las nuevas, y el formulario llega a mostrar productos ajenos.
    const productosEnvioData = await window.electronAPI.getProductosEnvio(envio.id);
    setEnvioEditar(envio);
    setProductosEnvio(productosEnvioData);
    setIsEnvioModalOpen(true);
  };


  // ========== FUNCIONES PARA VENTAS ==========
  const cargarVentas = async () => {
    const data = await window.electronAPI.getVentas();
    setVentas(data);
  };

  const handleCreateVenta = async (venta: Partial<Venta>, productosVenta: any[]) => {
    try {
      // Cabecera y líneas sin recalcular; un único recálculo al final.
      const nuevaVenta = await window.electronAPI.createVenta(
        {
          ...venta,
          productos: productosVenta.map((pv) => ({
            producto: { id_prod: pv.producto.id_prod },
            cantidad: Number(pv.cantidad),
          })) as unknown as ProductoVenta[],
        },
        false
      );

      // Persistir los ProductoVenta
      for (const pv of productosVenta) {
        await window.electronAPI.addProductoVenta(
          nuevaVenta.id,
          pv.producto.id_prod,
          Number(pv.cantidad),
          Number(pv.precio_unitario),
          false
        );
      }

      await window.electronAPI.recalcularRentabilidad();

      cargarVentas();
      fetchProductos();
      cargarRentabilidad();
      toast.success('Venta registrada');
      setIsVentaModalOpen(false);
    } catch (error) {
      mostrarAviso('Error', mensajeDeError(error));
    }
  };

  const handleUpdateVenta = async (id: number, venta: Partial<Venta>, productosVenta: any[]) => {
    try {
      // Diff en vez de borrar-todo-y-recrear: solo se tocan las líneas que cambian.
      const existentes = await window.electronAPI.getProductosVenta(id);
      const porProducto = new Map<string, (typeof productosVenta)[number]>();
      for (const pv of productosVenta) porProducto.set(pv.producto.id_prod, pv);

      for (const actual of existentes) {
        if (!porProducto.has(actual.producto.id_prod)) {
          await window.electronAPI.removeProductoVenta(actual.id, false);
        }
      }

      for (const pv of productosVenta) {
        const actual = existentes.find((x) => x.producto.id_prod === pv.producto.id_prod);
        if (!actual) {
          await window.electronAPI.addProductoVenta(
            id,
            pv.producto.id_prod,
            Number(pv.cantidad),
            Number(pv.precio_unitario),
            false
          );
        } else if (
          Number(actual.cantidad) !== Number(pv.cantidad) ||
          Number(actual.precio_unitario) !== Number(pv.precio_unitario)
        ) {
          await window.electronAPI.removeProductoVenta(actual.id, false);
          await window.electronAPI.addProductoVenta(
            id,
            pv.producto.id_prod,
            Number(pv.cantidad),
            Number(pv.precio_unitario),
            false
          );
        }
      }

      // Cabecera y un único recálculo, todo al final.
      await window.electronAPI.updateVenta(id, venta);

      cargarVentas();
      fetchProductos();
      cargarRentabilidad();
      toast.success('Venta actualizada');
      setIsVentaModalOpen(false);
    } catch (error) {
      mostrarAviso('Error', mensajeDeError(error));
    }
  };

  const handleDeleteVenta = (id: number) => {
    pedirConfirmacion(
      'Eliminar venta',
      '¿Estás seguro de eliminar esta venta?',
      async () => {
        try {
          await window.electronAPI.deleteVenta(id);
          cargarVentas();
          fetchProductos();
          cargarRentabilidad();
        } catch (error) {
          mostrarAviso('Error', mensajeDeError(error));
        }
      },
      'Eliminar'
    );
  };

  const openEditVentaModal = async (venta: Venta) => {
    const productosVentaData = await window.electronAPI.getProductosVenta(venta.id);
    setVentaEditar(venta);
    setProductosVentaSeleccionada(productosVentaData);
    setIsVentaModalOpen(true);
  };


  // ========== FUNCIONES PARA TRANSACCIONES ==========
  const fetchTransacciones = async () => {
    const data = await window.electronAPI.getTransacciones();
    setTransacciones(data);
  };

  const handleCreateTransaccion = async (transaccion: Partial<Transaccion>) => {
    await window.electronAPI.createTransaccion(transaccion);
    fetchTransacciones();
    toast.success('Transacción registrada');
    setIsTransaccionModalOpen(false);
  };

  const handleUpdateTransaccion = async (id: number, transaccion: Partial<Transaccion>) => {
    await window.electronAPI.updateTransaccion(id, transaccion);
    fetchTransacciones();
    toast.success('Transacción actualizada');
    setIsTransaccionModalOpen(false);
  };

  const handleDeleteTransaccion = (id: number) => {
    pedirConfirmacion(
      'Eliminar transacción',
      '¿Estás seguro de eliminar esta transacción?',
      async () => {
        await window.electronAPI.deleteTransaccion(id);
        fetchTransacciones();
      },
      'Eliminar'
    );
  };

  const openEditTransaccionModal = (transaccion: Transaccion) => {
    setTransaccionEditar(transaccion);
    setIsTransaccionModalOpen(true);
  };

  // ========== FUNCIONES PARA CONVERSIÓN (RECARGAS) ==========
  const fetchPeers = async () => {
    const data = await window.electronAPI.getPeers();
    setPeers(data);
  };

  const fetchFlujosConversion = async () => {
    const data = await window.electronAPI.getFlujosConversion();
    setFlujosConversion(data);
  };

  const handleCreatePeer = async (peer: Partial<Peer>) => {
    await window.electronAPI.createPeer(peer);
    fetchPeers();
    toast.success('Peer creado');
    setIsPeerModalOpen(false);
  };

  const handleUpdatePeer = async (id: number, peer: Partial<Peer>) => {
    await window.electronAPI.updatePeer(id, peer);
    fetchPeers();
    toast.success('Peer actualizado');
    setIsPeerModalOpen(false);
  };

  const handleDeletePeer = (id: number) => {
    pedirConfirmacion(
      'Eliminar peer',
      '¿Estás seguro de eliminar este peer?',
      async () => {
        try {
          await window.electronAPI.deletePeer(id);
          fetchPeers();
        } catch (error) {
          mostrarAviso('Error', mensajeDeError(error));
        }
      },
      'Eliminar'
    );
  };

  const handleCreateFlujo = async (flujo: Partial<FlujoConversion>) => {
    await window.electronAPI.createFlujoConversion(flujo);
    fetchFlujosConversion();
    toast.success('Conversión registrada');
    setIsConversionModalOpen(false);
  };

  const handleUpdateFlujo = async (id: number, flujo: Partial<FlujoConversion>) => {
    await window.electronAPI.updateFlujoConversion(id, flujo);
    fetchFlujosConversion();
    toast.success('Conversión actualizada');
    setIsConversionModalOpen(false);
  };

  const handleDeleteFlujo = (id: number) => {
    pedirConfirmacion(
      'Eliminar flujo de conversión',
      '¿Estás seguro de eliminar este flujo de conversión?',
      async () => {
        await window.electronAPI.deleteFlujoConversion(id);
        fetchFlujosConversion();
      },
      'Eliminar'
    );
  };

  // ========== RENTABILIDAD FIFO ==========
  const cargarRentabilidad = async () => {
    try {
      const data = await window.electronAPI.getRentabilidad();
      if (data) setRentabilidad(data);
    } catch (error) {
      console.error('Error al cargar rentabilidad:', error);
    }
  };

  const cargarSugerencias = async (margen: number, tasa: number) => {
    setCargandoSugerencias(true);
    try {
      const data = await window.electronAPI.precioSugerido(margen, tasa);
      setSugerencias(data || []);
    } catch (error) {
      console.error('Error al calcular precios sugeridos:', error);
      setSugerencias([]);
    } finally {
      setCargandoSugerencias(false);
    }
  };

  // ========== INVERSORES (Fase 4.8) ==========
  const cargarInversores = async () => {
    try {
      const [socios, resumen, inversiones, aportes, movimientos] = await Promise.all([
        window.electronAPI.getInversores(),
        window.electronAPI.getResumenInversores(),
        window.electronAPI.getInversiones(),
        window.electronAPI.getAportes(),
        window.electronAPI.getMovimientosCapital(),
      ]);
      setInversores(socios || []);
      setResumenInversores(resumen || []);
      setInversiones(inversiones || []);
      setAportes(aportes || []);
      setMovimientosCapital(movimientos || []);
    } catch (error) {
      console.error('Error al cargar inversores:', error);
    }
  };

  // Unidades ya asignadas por envio+producto, para que el modal de asignar capital
  // sepa cuantas quedan libres sin tener que preguntar en la BD.
  const invertidoPorClave = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const inv of inversiones) {
      const clave = `${inv.envio?.id}::${inv.producto?.id_prod}`;
      mapa.set(clave, (mapa.get(clave) || 0) + Number(inv.unidades || 0));
    }
    return mapa;
  }, [inversiones]);

  // Unidades ya vendidas de cada producto. Lo usa InversionModal para avisar que
  // asignar capital a una mercancia que ya salio tiene una consecuencia: esa inversion
  // no devengara 1% por las ventas viejas, porque su capital no estaba en la mercancia
  // que se vendio.
  //
  // Va por producto y no por (envio, producto) a proposito: ProductoVenta no tiene
  // relacion con el envio (el FIFO resuelve de que envio sale cada unidad), asi que el
  // unico conteo que se puede hacer aqui sin inventar es el total del producto. Por eso
  // el aviso dice "de este producto", no "de este envio".
  const vendidoPorProducto = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const venta of ventas) {
      for (const pv of venta.productos || []) {
        const id = pv.producto?.id_prod;
        if (!id) continue;
        mapa.set(id, (mapa.get(id) || 0) + Number(pv.cantidad || 0));
      }
    }
    return mapa;
  }, [ventas]);

  // Capital de terceros que hay dentro de la mercancia sin vender: es dinero que no es
  // tuyo, asi que se muestra aparte de tu propio inventario.
  const capitalSociosEnMercancia = useMemo(
    () => resumenInversores.reduce((sum, r) => sum + Number(r.enMercancia || 0), 0),
    [resumenInversores]
  );

  const capitalSociosDisponible = useMemo(
    () => resumenInversores.reduce((sum, r) => sum + Number(r.disponible || 0), 0),
    [resumenInversores]
  );

  // 1% que los socios te deben y que todavia no ha entrado: es gasto devengado, asi que
  // ya resta de la ganancia neta, pero es plata que no tienes en la mano.
  const comisionesPendientesTotal = useMemo(
    () => resumenInversores.reduce((sum, r) => sum + Number(r.comisionPendiente || 0), 0),
    [resumenInversores]
  );

  const handleSaveInversor = async (datos: {
    nombre: string;
    activo: boolean;
    fecha_alta: string;
    notas: string;
  }) => {
    try {
      if (inversorEditar) {
        // El nombre no se manda: esta atado al nombre de su cuenta (ver actualizarInversor).
        await window.electronAPI.updateInversor(inversorEditar.id, {
          activo: datos.activo,
          notas: datos.notas,
        });
      } else {
        await window.electronAPI.createInversor(datos);
      }
      await cargarInversores();
      toast.success('Socio guardado');
    } catch (error) {
      mostrarAviso('Error', 'Error al guardar el socio: ' + mensajeDeError(error));
    }
  };

  const handleDeleteInversor = (id: number) => {
    const socio = inversores.find((i) => i.id === id);
    if (!socio) return;
    const detalle = resumenInversores.find((r) => r.inversorId === id);
    const tieneInversiones = inversiones.some((i) => Number(i.inversor?.id) === id);
    const tieneMovimientos = movimientosCapital.some((m) => Number(m.inversor?.id) === id);
    const tieneAportes = aportes.some((a) => Number(a.inversor?.id) === id);

    const detalleTexto = detalle
      ? `\nAportado: ${Number(detalle.aportado).toFixed(2)}\nInvertido: ${Number(detalle.invertido).toFixed(2)}\nRetirado: ${Number(detalle.retirado).toFixed(2)}`
      : '';

    if (tieneInversiones) {
      mostrarAviso(
        'No se puede borrar al socio',
        <>
          No se puede borrar a "{socio.nombre}" porque tiene capital asignado a productos.
          <br />
          Borra primero esas inversiones (Inversores &rarr; detalle) o deja el socio como inactivo.{detalleTexto}
        </>
      );
      return;
    }

    const piezas: string[] = [];
    if (tieneAportes) piezas.push(`${aportes.filter((a) => Number(a.inversor?.id) === id).length} aporte(s)`);
    if (tieneMovimientos)
      piezas.push(
        `${movimientosCapital.filter((m) => Number(m.inversor?.id) === id).length} movimiento(s) de capital`
      );
    const seBorra = piezas.length ? `Se borrarán también: ${piezas.join(' y ')}.` : '';

    // El backend bloquea tambien si hay Transacciones que toquen la cuenta del socio
    // (Transaccion no tiene ON DELETE, asi que reventaria con 23503 DESPUES de haber
    // borrado al Inversor y dejaba la cuenta huerfana). Se comprueba aqui para que el
    // usuario lea el motivo antes de confirmar, y no un error despues de confirmar.
    const nombreCuenta = `Socio ${socio.nombre} - por pagar`.toLowerCase();
    const esCuentaDelSocio = (cuenta?: { nombre?: string | null }) =>
      String(cuenta?.nombre ?? '').trim().toLowerCase() === nombreCuenta;
    const transaccionesDelSocio = transacciones.filter(
      (t) => esCuentaDelSocio(t.cuenta_origen) || esCuentaDelSocio(t.cuenta_destino)
    );
    if (transaccionesDelSocio.length) {
      mostrarAviso(
        'No se puede borrar al socio',
        <>
          No se puede borrar a "{socio.nombre}" porque su cuenta "Socio {socio.nombre} - por pagar"
          aparece en {transaccionesDelSocio.length} movimiento(s) de caja.
          <br />
          Borra primero esos movimientos (Transacciones) o deja el socio como inactivo.
        </>
      );
      return;
    }

    pedirConfirmacion(
      `¿Borrar a "${socio.nombre}"?`,
      <>
        {detalleTexto}
        <br />
        {seBorra && (<><br />{seBorra}</>)}
        <br />
        Se borra su cuenta "Socio {socio.nombre} - por pagar". Esto no se puede deshacer.
        <br />
        Si solo quieres dejar de operar con el socio, márcalo como inactivo.
      </>,
      async () => {
        try {
          await window.electronAPI.deleteInversor(id);
          await cargarInversores();
        } catch (error) {
          mostrarAviso('Error', 'Error al borrar el socio: ' + mensajeDeError(error));
        }
      },
      'Borrar'
    );
  };

  const handleCreateAporte = async (datos: {
    inversorId: number;
    monto: number;
    cuentaDestinoId: number;
    fecha: string;
    descripcion: string;
  }) => {
    try {
      await window.electronAPI.createAporte({ ...datos, fecha: new Date(datos.fecha) });
      await Promise.all([cargarInversores(), fetchTransacciones(), fetchCuentas()]);
      toast.success('Aporte registrado');
    } catch (error) {
      mostrarAviso('Error', 'Error al registrar el aporte: ' + mensajeDeError(error));
    }
  };

  const handleCreateInversion = async (datos: {
    inversorId: number;
    productoId: string;
    envioId: number;
    unidades: number;
    monto: number;
    fecha: string;
    descripcion: string;
  }) => {
    try {
      await window.electronAPI.createInversion({ ...datos, fecha: new Date(datos.fecha) });
      await cargarInversores();
      toast.success('Capital asignado al producto');
    } catch (error) {
      mostrarAviso('Error', 'Error al asignar el capital: ' + mensajeDeError(error));
    }
  };

  const handleCreateMovimientoCapital = async (datos: {
    inversorId: number;
    tipo: 'retiro' | 'reinversion';
    monto: number;
    fecha: string;
    envioDestinoId?: number;
    productoDestinoId?: string;
    unidades?: number;
    cuentaOrigenId?: number;
    descripcion: string;
  }) => {
    try {
      await window.electronAPI.createMovimientoCapital({ ...datos, fecha: new Date(datos.fecha) });
      await Promise.all([cargarInversores(), fetchTransacciones()]);
      toast.success('Movimiento de capital registrado');
    } catch (error) {
      mostrarAviso(
        'Error',
        (datos.tipo === 'retiro' ? 'Error al pagar al socio: ' : 'Error al reinvertir: ') +
          mensajeDeError(error)
      );
    }
  };

  const handleCreateCobroComision = async (datos: {
    inversorId: number;
    monto: number;
    fecha: string;
  }) => {
    try {
      const resultado = await window.electronAPI.createCobroComision({
        ...datos,
        fecha: new Date(datos.fecha),
      });
      // No hace falta recargar la rentabilidad: el devengo no cambio, solo el cobro.
      // Con esto basta para repintar la fila de la tarjeta del socio.
      await cargarInversores();
      const detalle = resultado.aplicaciones
        .map((a) => `• ${a.nombreProducto}: ${a.aplicado.toFixed(2)} USD`)
        .join('\n');
      const resto = resultado.pendientes > 0.004
        ? `\n\nQuedan ${resultado.pendientes.toFixed(2)} USD por cobrar.`
        : '\n\nEse socio ya no tiene comisión pendiente.';
      mostrarAviso(
        '1% cobrado',
        <pre className="whitespace-pre-wrap font-sans text-sm">
          Cobraste {resultado.cobradas.toFixed(2)} USD del 1%.
          {'\n\n'}
          {detalle}
          {resto}
        </pre>
      );
    } catch (error) {
      mostrarAviso('Error', 'Error al registrar el cobro del 1%: ' + mensajeDeError(error));
    }
  };

  const handleDeleteInversion = (id: number) => {
    const inv = inversiones.find((i) => i.id === id);
    if (!inv) return;
    const yaLiberada = Number(inv.unidades_liberadas || 0) > 0;

    pedirConfirmacion(
      'Borrar asignación de capital',
      <pre className="whitespace-pre-wrap font-sans text-sm">
        {`Socio: ${inv.inversor?.nombre}\nProducto: ${inv.producto?.nombre_prod}\n` +
          `Unidades: ${Number(inv.unidades)}\nMonto: ${Number(inv.monto).toFixed(2)} USD`}
        {yaLiberada
          ? `\nOJO: ya se vendieron ${Number(inv.unidades_liberadas)} de esas unidades. ` +
            `Al borrar la asignación, ese capital liberado se le va de encima al socio y puede quedar negativo.`
          : ''}
        {`\nBorrar la asignación no devuelve dinero a la caja: el capital invertido se invierte de nuevo.`}
      </pre>,
      async () => {
        try {
          await window.electronAPI.deleteInversion(id);
          await cargarInversores();
        } catch (error) {
          mostrarAviso('Error', 'Error al borrar la asignación: ' + mensajeDeError(error));
        }
      },
      'Borrar'
    );
  };

  const veredictoLabel: Record<VeredictoEnvio, string> = {
    exitoso: 'Exitoso',
    en_curso: 'En curso',
    sin_vender: 'Sin vender',
    perdida: 'Pérdida',
  };

  const veredictoColor: Record<VeredictoEnvio, 'success' | 'accent' | 'default' | 'danger'> = {
    exitoso: 'success',
    en_curso: 'accent',
    sin_vender: 'default',
    perdida: 'danger',
  };

  const invertedVsRecovered = useMemo(() => {
    if (!rentabilidad) return [];
    return rentabilidad.porEnvio
      .filter((e) => e.invertido > 0)
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
      .map((e) => ({
        envio: `#${e.envioId}`,
        fecha: e.fecha,
        invertido: Number(e.invertido.toFixed(2)),
        recuperado: Number(e.recuperado.toFixed(2)),
      }));
  }, [rentabilidad]);

  const resumenConversiones = useMemo(() => {    let totalCup = 0;
    let totalUsd = 0;
    let totalUsdt = 0;
    let totalComision = 0;
    let cupParaTasa = 0;
    let usdtDeCup = 0;
    for (const f of flujosConversion) {
      const montoIn = Number(f.monto_in) || 0;
      const usdt = Number(f.monto_usdt_recibido) || 0;
      const comision = Number(f.total_comisiones_in) || 0;
      totalUsdt += usdt;
      totalComision += comision;
      if ((f.moneda_in || 'CUP') === 'USD') {
        totalUsd += montoIn;
      } else {
        totalCup += montoIn;
        cupParaTasa += montoIn;
        usdtDeCup += usdt;
      }
    }
    return {
      totalCup,
      totalUsd,
      totalUsdt,
      totalComision,
      tasaEfectivaPromedio: cupParaTasa > 0 && usdtDeCup > 0 ? cupParaTasa / usdtDeCup : 0,
    };
  }, [flujosConversion]);

  // ========== RESUMEN PARA DASHBOARD ==========
  const resumenDashboard = useMemo(() => {
    const resumenReal = rentabilidad?.resumen;
    const ingresos = resumenReal ? resumenReal.ingresosVentas : ventas.reduce((s, v) => s + (Number(v.total_usd) || 0), 0);
    const costoVendido = resumenReal
      ? resumenReal.costoVendidoReal
      : ventas.reduce((s, v) => s + (Number(v.costo_total_usd) || 0), 0);
    const utilidadBruta = resumenReal ? resumenReal.utilidadBruta : ingresos - costoVendido;
    const perdidasConversion = resumenReal
      ? resumenReal.perdidasConversion
      : flujosConversion.reduce((s, f) => s + (Number(f.perdida_total_in) || 0), 0);
    const invertidoTotal = resumenReal
      ? resumenReal.invertidoTotal
      : envios.reduce(
          (s, e) => s + (Number(e.costo) || 0) + (Number(e.aranceles_usd) || 0) + (Number(e.otros_costos_usd) || 0),
          0
        );
    const capitalInventario = resumenReal ? resumenReal.capitalInventario : Math.max(0, invertidoTotal - costoVendido);
    const stockTotal = productos.reduce((s, p) => s + (Number(p.stock_actual) || 0), 0);
    // Si todavia no se cargo la rentabilidad, la comision se saca de lo que quedo
    // escrito venta por venta, que es el mismo 1% que aplica el FIFO.
    const comisionesInversores = resumenReal
      ? resumenReal.comisionesInversores
      : ventas.reduce((s, v) => s + (Number(v.comision_inversores_usd) || 0), 0);

    return {
      ingresosVentas: ingresos,
      costoVendido,
      utilidadBruta,
      perdidasConversion,
      comisionesInversores,
      gananciaNetaReal: utilidadBruta - perdidasConversion - comisionesInversores,
      invertidoTotal,
      capitalInventario,
      stockTotal,
    };
  }, [rentabilidad, ventas, productos, envios, flujosConversion]);

  const ventasPorMes = useMemo(() => {
    const mapa: Record<string, { mes: string; vendido: number; ganancia: number }> = {};
    for (const v of ventas) {
      const d = new Date(v.fecha);
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mapa[mes] = mapa[mes] || { mes, vendido: 0, ganancia: 0 };
      mapa[mes].vendido += Number(v.total_usd) || 0;
      mapa[mes].ganancia += Number(v.ganancia_usd) || 0;
    }
    return Object.values(mapa).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [ventas]);

  const formaPagoLabel = (fp: string): string => {
    const mapa: Record<string, string> = {
      efectivo_cup: 'Efectivo CUP',
      transferencia_cup: 'CUP Transferencia',
      efectivo_usd: 'Efectivo USD',
      usdt: 'USDT',
    };
    return mapa[fp] || fp;
  };

  const ventasPorFormaPago = useMemo(() => {
    const mapa: Record<string, { forma: string; monto: number }> = {};
    for (const v of ventas) {
      const key = v.forma_pago || 'otro';
      mapa[key] = mapa[key] || { forma: formaPagoLabel(key), monto: 0 };
      mapa[key].monto += Number(v.total_usd) || 0;
    }
    return Object.values(mapa).filter((x) => x.monto > 0);
  }, [ventas]);

  const COLORES_PIE = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#0891b2'];

  const TOOLTIP_ESTILO = {
    backgroundColor: 'var(--surface-secondary)',
    border: '1px solid var(--separator)',
    borderRadius: 8,
    color: 'var(--foreground)',
  } as const;

  const evolucionTasas = useMemo(() => {
    return [...ventas]
      .map((v) => ({
        fecha: new Date(v.fecha).toLocaleDateString('es-ES'),
        tasa: Number(v.tasa_usd_cup) || 0,
      }))
      .filter((x) => x.tasa > 0)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [ventas]);

  const importesPorMes = useMemo(() => {
    const mapa: Record<string, { mes: string; invertido: number }> = {};
    for (const e of envios) {
      const d = new Date(e.fecha_creacion);
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mapa[mes] = mapa[mes] || { mes, invertido: 0 };
      mapa[mes].invertido += (Number(e.costo) || 0) + (Number(e.aranceles_usd) || 0);
    }
    return Object.values(mapa).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [envios]);

  const comparativoImportesVentas = useMemo(() => {
    const mapa: Record<string, { mes: string; invertido: number; vendido: number }> = {};
    for (const p of importesPorMes) {
      mapa[p.mes] = { mes: p.mes, invertido: p.invertido, vendido: 0 };
    }
    for (const p of ventasPorMes) {
      mapa[p.mes] = mapa[p.mes] || { mes: p.mes, invertido: 0, vendido: 0 };
      mapa[p.mes].vendido = p.vendido;
    }
    return Object.values(mapa).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [importesPorMes, ventasPorMes]);

  const exportarRespaldo = async () => {
    try {
      const res = await window.electronAPI.exportarRespaldo();
      if (res?.cancelado) return;
      if (res?.ok) {
        toast.success('Respaldo completo guardado');
      } else {
        toast.danger('No se pudo exportar el respaldo');
      }
    } catch (error) {
      console.error('Error al exportar respaldo:', error);
      toast.danger('No se pudo exportar el respaldo');
    }
  };

  const exportarReporteCSV = () => {
    const escapar = (valor: unknown): string => {
      const texto = valor === null || valor === undefined ? '' : String(valor);
      return `"${texto.replace(/"/g, '""')}"`;
    };
    const num = (valor: unknown): string => String(Number(valor) || 0);

    const lineas: string[] = [];
    lineas.push('REPORTE - Mi App de Ventas');
    lineas.push(`Generado,${escapar(new Date().toLocaleString('es-ES'))}`);
    lineas.push('');

    lineas.push('RESUMEN FINANCIERO (costo real FIFO)');
    lineas.push('Concepto,Valor (USD)');
    lineas.push(`Ingresos por ventas,${num(resumenDashboard.ingresosVentas)}`);
    lineas.push(`Costo real de lo vendido,${num(resumenDashboard.costoVendido)}`);
    lineas.push(`Utilidad bruta,${num(resumenDashboard.utilidadBruta)}`);
    lineas.push(`Perdidas por conversion,${num(resumenDashboard.perdidasConversion)}`);
    lineas.push(`Ganancia neta real,${num(resumenDashboard.gananciaNetaReal)}`);
    lineas.push(`Invertido total en envios,${num(resumenDashboard.invertidoTotal)}`);
    lineas.push(`Capital en inventario (no vendido),${num(resumenDashboard.capitalInventario)}`);
    lineas.push(`Stock Total (unidades),${num(resumenDashboard.stockTotal)}`);
    lineas.push('');

    if (rentabilidad && rentabilidad.porEnvio.length > 0) {
      lineas.push('RENTABILIDAD POR ENVIO');
      lineas.push(
        'ID,Proveedor,Fecha,Estado,Invertido (USD),Costo Productos (USD),Overhead (USD),Unidades Vendidas,Unidades Totales,Recuperado (USD),Costo Vendido (USD),Utilidad Realizada (USD),Margen %,Veredicto'
      );
      for (const e of rentabilidad.porEnvio) {
        lineas.push(
          [
            escapar(e.envioId),
            escapar(e.proveedor),
            escapar(e.fecha),
            escapar(e.estado),
            num(e.invertido),
            num(e.costoProductos),
            num(e.overhead),
            num(e.unidadesVendidas),
            num(e.unidadesTotales),
            num(e.recuperado),
            num(e.costoVendido),
            num(e.utilidadRealizada),
            num(e.margenPct),
            escapar(veredictoLabel[e.veredicto]),
          ].join(',')
        );
      }
      lineas.push('');
    }

    if (sugerencias.length > 0) {
      lineas.push('SUGERENCIAS DE PRECIO');
      lineas.push(
        `Margen objetivo,${num(margenObjetivo)}%`
      );
      lineas.push('');
      lineas.push('Producto,Costo Real FIFO (USD),Origen,Stock,Precio Actual (USD),Margen Actual %,Precio Sugerido (USD),Precio Sugerido (CUP),Ganancia Unitaria (USD)');
      for (const s of sugerencias) {
        lineas.push(
          [
            escapar(s.nombre),
            num(s.costoRealFifo),
            escapar(s.envioOrigenId ? `Envio #${s.envioOrigenId}` : 'Catalogo'),
            num(s.stockDisponible),
            num(s.precioActual),
            num(s.margenActualPct),
            num(s.precioSugeridoUsd),
            num(s.precioSugeridoCup),
            num(s.gananciaUnitariaUsd),
          ].join(',')
        );
      }
      lineas.push('');
    }

    lineas.push('VENTAS POR MES');
    lineas.push('Mes,Vendido (USD),Ganancia (USD)');
    for (const v of ventasPorMes) {
      lineas.push(`${v.mes},${num(v.vendido)},${num(v.ganancia)}`);
    }
    lineas.push('');

    lineas.push('DISTRIBUCION POR FORMA DE PAGO');
    lineas.push('Forma de Pago,Monto (USD)');
    for (const f of ventasPorFormaPago) {
      lineas.push(`${escapar(f.forma)},${num(f.monto)}`);
    }
    lineas.push('');

    lineas.push('COSTOS DE IMPORTACION VS VENTAS');
    lineas.push('Mes,Invertido (USD),Vendido (USD)');
    for (const c of comparativoImportesVentas) {
      lineas.push(`${c.mes},${num(c.invertido)},${num(c.vendido)}`);
    }
    lineas.push('');

    lineas.push('DETALLE DE VENTAS');
    lineas.push('ID,Forma de Pago,Estado,Total USD,Total CUP,Tasa (USD/CUP),Costo USD,Ganancia USD,Fecha');
    for (const v of ventas) {
      lineas.push(
        [
          escapar(v.id),
          escapar(formaPagoLabel(v.forma_pago)),
          escapar(v.estado),
          num(v.total_usd),
          num(v.total_cup),
          num(v.tasa_usd_cup),
          num(v.costo_total_usd),
          num(v.ganancia_usd),
          escapar(new Date(v.fecha).toLocaleString('es-ES')),
        ].join(',')
      );
    }
    lineas.push('');

    lineas.push('DETALLE DE ENVIOS');
    lineas.push('ID,Proveedor,Peso (lbs),Costo (USD),Aranceles (USD),Otros Costos (USD),Estado,Fecha');
    for (const e of envios) {
      lineas.push(
        [
          escapar(e.id),
          escapar(e.proveedor),
          num(e.peso_total_lbs),
          num(e.costo),
          num(e.aranceles_usd),
          num(e.otros_costos_usd),
          escapar(e.estado),
          escapar(new Date(e.fecha_creacion).toLocaleString('es-ES')),
        ].join(',')
      );
    }

    const csv = '\uFEFF' + lineas.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `reporte_ventas_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  };

  // ========== TASA DE CAMBIO USD ==========
  const tasaUSD = monedas.find(m => m.codigo === 'USD')?.tasa_cambio || 1;

  // ========== CARGAR DATOS AL CAMBIAR DE PESTAÑA ==========
  useEffect(() => {
    // Se guarda la promesa de productos: el Dashboard necesita los productos
    // para el stock bajo del Lobby, así que espera a esa promesa antes de
    // apagar el esqueleto.
    fetchMonedas();
    const pProductos = fetchProductos();
    fetchCuentas();
    if (activeTab === 'monedas') {
      fetchMonedas();
    } else if (activeTab === 'envios') {
      fetchEnvios();
    } else if (activeTab === 'transacciones') {
      fetchTransacciones();
    } else if (activeTab === 'conversion') {
      fetchPeers();
      fetchFlujosConversion();
    } else if (activeTab === 'ventas') {
      fetchProductos();
      cargarVentas();
      cargarRentabilidad();
    } else if (activeTab === 'dashboard') {
      setCargandoDashboard(true);
      Promise.all([pProductos, cargarVentas(), fetchEnvios(), cargarRentabilidad(), cargarInversores()])
        .catch(() => {})
        .finally(() => setCargandoDashboard(false));
    } else if (activeTab === 'calculadora') {
      cargarSugerencias(margenObjetivo, Number(tasaUSD) || 0);
    } else if (activeTab === 'inversores') {
      cargarInversores();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'calculadora') {
      cargarSugerencias(margenObjetivo, Number(tasaUSD) || 0);
    }
  }, [margenObjetivo, tasaUSD, activeTab]);

  // ========== CARGAR MONEDAS AL INICIO (para la tasa actual) ==========
  useEffect(() => {
    fetchMonedas();
  }, []);

  // ========== RENDERIZADO ==========
  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Mi App de Ventas</h1>
        <div className="flex items-center gap-4">
          <span className="px-3 py-2 bg-surface-secondary rounded-lg text-sm">
            Tasa actual: <span className="font-semibold text-green-700 dark:text-green-400">1 USD = {Number(tasaUSD).toFixed(2)} CUP</span>
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsTasaModalOpen(true)}
          >
            Tasas de Cambio
          </Button>
          <Button
            size="sm"
            variant="secondary"
            aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Pestañas (HeroUI Tabs; el contenido se pinta aparte por activeTab) */}
      <div className="mt-6">
        <Card className="p-2">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as typeof activeTab)}
          >
            <Tabs.ListContainer>
              <Tabs.List>
                <Tabs.Tab id="dashboard">
                  <span className="inline-flex items-center gap-1.5">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </span>
                </Tabs.Tab>
                <Tabs.Tab id="productos">
                  <span className="inline-flex items-center gap-1.5">
                    <Package className="h-4 w-4" />
                    Productos
                  </span>
                </Tabs.Tab>
                <Tabs.Tab id="envios">
                  <span className="inline-flex items-center gap-1.5">
                    <Truck className="h-4 w-4" />
                    Envíos
                  </span>
                </Tabs.Tab>
                <Tabs.Tab id="conversion">
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowLeftRight className="h-4 w-4" />
                    Conversión
                  </span>
                </Tabs.Tab>
                <Tabs.Tab id="ventas">
                  <span className="inline-flex items-center gap-1.5">
                    <ShoppingCart className="h-4 w-4" />
                    Ventas
                  </span>
                </Tabs.Tab>
                <Tabs.Tab id="inversores">
                  <span className="inline-flex items-center gap-1.5">
                    <Handshake className="h-4 w-4" />
                    Inversores
                  </span>
                </Tabs.Tab>
                <Tabs.Tab id="cuentas">
                  <span className="inline-flex items-center gap-1.5">
                    <Wallet className="h-4 w-4" />
                    Cuentas
                  </span>
                </Tabs.Tab>
                <Tabs.Tab id="transacciones">
                  <span className="inline-flex items-center gap-1.5">
                    <Receipt className="h-4 w-4" />
                    Transacciones
                  </span>
                </Tabs.Tab>
                <Tabs.Tab id="calculadora">
                  <span className="inline-flex items-center gap-1.5">
                    <Calculator className="h-4 w-4" />
                    Calculadora de Precios
                  </span>
                </Tabs.Tab>
                <Tabs.Tab id="monedas">
                  <span className="inline-flex items-center gap-1.5">
                    <Coins className="h-4 w-4" />
                    Monedas
                  </span>
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </Card>
      </div>

      {/* Contenido según pestaña */}
      <div className="mt-4">
        {/* ========== PESTAÑA PRODUCTOS ========== */}
        {activeTab === 'productos' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Productos</h2>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setProductoEditar(null);
                  setIsProductoModalOpen(true);
                }}
              >
                + Nuevo Producto
              </Button>
            </div>

            <Table aria-label="Productos" className="mt-2">
              <Table.Content>
                <Table.Header>
                  <Table.Column isRowHeader>ID</Table.Column>
                  <Table.Column>Nombre</Table.Column>
                  <Table.Column>Descripción</Table.Column>
                  <Table.Column>Costo (USD)</Table.Column>
                  <Table.Column>Precio Venta (USD/CUP)</Table.Column>
                  <Table.Column>Stock</Table.Column>
                  <Table.Column>Peso (lbs)</Table.Column>
                  <Table.Column>Acciones</Table.Column>
                </Table.Header>
                <Table.Body>
                {productos.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={8}>
                      <EmptyState className="py-16 text-center">Aún no hay productos</EmptyState>
                    </Table.Cell>
                  </Table.Row>
                )}
                  {productos.slice(pagProductos.inicio, pagProductos.fin).map((p) => (
                    <Table.Row key={p.id_prod}>
                      <Table.Cell>{p.id_prod}</Table.Cell>
                      <Table.Cell>{p.nombre_prod}</Table.Cell>
                      <Table.Cell>{p.descripcion || 'N/A'}</Table.Cell>
                      <Table.Cell>${Number(p.costo).toFixed(2)}</Table.Cell>
                      <Table.Cell>
                        ${Number(p.precio_venta).toFixed(2)} /{' '}
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {Number(p.precio_venta * tasaUSD).toFixed(2)} CUP
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <span
                          className={`font-medium ${
                            Number(p.stock_actual) < 0
                              ? 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300'
                              : Number(p.stock_actual) >= 5
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                          }`}
                          title={
                            Number(p.stock_actual) < 0
                              ? 'Vendiste más unidades de las que hay en envíos recibidos. Marca esos envíos como Recibidos para corregirlo.'
                              : undefined
                          }
                        >
                          {Number(p.stock_actual)}
                          {Number(p.stock_actual) < 0 && (
                            <span className="ml-1 text-[10px] uppercase">negativo</span>
                          )}
                        </span>
                      </Table.Cell>
                      <Table.Cell>{Number(p.peso_lbs || 0).toFixed(2)}</Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openEditProductoModal(p)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteProducto(p.id_prod)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table>

            <Paginador
              pagina={pagProductos.pagina}
              totalPaginas={pagProductos.totalPaginas}
              onCambio={pagProductos.setPagina}
            />

            <ProductoModal
              isOpen={isProductoModalOpen}
              onClose={() => setIsProductoModalOpen(false)}
              onSave={(producto) => {
                if (productoEditar) {
                  handleUpdateProducto(productoEditar.id_prod!, producto);
                } else {
                  handleCreateProducto(producto);
                }
              }}
              productoEditar={productoEditar}
              tasaUSD={tasaUSD}
            />
          </>
        )}

        {/* ========== PESTAÑA MONEDAS ========== */}
        {activeTab === 'monedas' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Monedas</h2>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setMonedaEditar(null);
                  setIsMonedaModalOpen(true);
                }}
              >
                + Nueva Moneda
              </Button>
            </div>

            <Table aria-label="Monedas" className="mt-2">
              <Table.Content>
                <Table.Header>
                  <Table.Column isRowHeader>Código</Table.Column>
                  <Table.Column>Nombre</Table.Column>
                  <Table.Column>Tasa de Cambio (vs CUP)</Table.Column>
                  <Table.Column>Acciones</Table.Column>
                </Table.Header>
                <Table.Body>
                {monedas.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={4}>
                      <EmptyState className="py-16 text-center">Sin monedas registradas</EmptyState>
                    </Table.Cell>
                  </Table.Row>
                )}
                  {monedas.map((m) => (
                    <Table.Row key={m.codigo}>
                      <Table.Cell>{m.codigo}</Table.Cell>
                      <Table.Cell>{m.nombre}</Table.Cell>
                      <Table.Cell>{Number(m.tasa_cambio).toFixed(2)}</Table.Cell>
                      <Table.Cell className="space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEditMonedaModal(m)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteMoneda(m.codigo)}
                        >
                          Eliminar
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table>

            <MonedaModal
              isOpen={isMonedaModalOpen}
              onClose={() => setIsMonedaModalOpen(false)}
              onSave={(moneda) => {
                if (monedaEditar) {
                  handleUpdateMoneda(monedaEditar.codigo!, moneda);
                } else {
                  handleCreateMoneda(moneda);
                }
              }}
              monedaEditar={monedaEditar}
            />
          </>
        )}

        {/* ========== PESTAÑA CUENTAS ========== */}
        {activeTab === 'cuentas' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Cuentas</h2>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setCuentaEditar(null);
                  setIsCuentaModalOpen(true);
                }}
              >
                + Nueva Cuenta
              </Button>
            </div>

            <Table aria-label="Cuentas" className="mt-2">
              <Table.Content>
                <Table.Header>
                  <Table.Column isRowHeader>ID</Table.Column>
                  <Table.Column>Nombre</Table.Column>
                  <Table.Column>Moneda</Table.Column>
                  <Table.Column>Saldo</Table.Column>
                  <Table.Column>Acciones</Table.Column>
                </Table.Header>
                <Table.Body>
                {cuentas.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={5}>
                      <EmptyState className="py-16 text-center">Sin cuentas registradas</EmptyState>
                    </Table.Cell>
                  </Table.Row>
                )}
                  {cuentas.map((c) => (
                    <Table.Row key={c.id_cuenta}>
                      <Table.Cell>{c.id_cuenta}</Table.Cell>
                      <Table.Cell>{c.nombre}</Table.Cell>
                      <Table.Cell>{c.moneda?.codigo || 'N/A'}</Table.Cell>
                      <Table.Cell>{Number(c.saldo).toFixed(2)} {c.moneda?.codigo || ''}</Table.Cell>
                      <Table.Cell className="space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEditCuentaModal(c)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteCuenta(c.id_cuenta)}
                        >
                          Eliminar
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table>

            <CuentaModal
              isOpen={isCuentaModalOpen}
              onClose={() => setIsCuentaModalOpen(false)}
              onSave={(cuenta) => {
                if (cuentaEditar) {
                  handleUpdateCuenta(cuentaEditar.id_cuenta!, cuenta);
                } else {
                  handleCreateCuenta(cuenta);
                }
              }}
              cuentaEditar={cuentaEditar}
              monedas={monedas}
            />
          </>
        )}

        {/* ========== PESTAÑA ENVIOS ========== */}
        {activeTab === 'envios' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Envíos</h2>
              <div className="flex items-center gap-2">
                <Selector
                  valor={filtroEnvioEstado || ''}
                  onChange={(v) => setFiltroEnvioEstado(v)}
                  opciones={[
                    { valor: 'todos', etiqueta: 'Todos' },
                    { valor: 'pendiente', etiqueta: 'Pendiente' },
                    { valor: 'recibido', etiqueta: 'Recibido' },
                  ]}
                  fullWidth={false}
                  variant="secondary"
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setEnvioEditar(null);
                    setProductosEnvio([]);
                    setIsEnvioModalOpen(true);
                  }}
                >
                  + Nuevo Envío
                </Button>
              </div>
            </div>

            <Table aria-label="Envíos" className="mt-2">
              <Table.Content>
                <Table.Header>
                  <Table.Column isRowHeader>ID</Table.Column>
                  <Table.Column>Proveedor</Table.Column>
                  <Table.Column>Peso (lbs)</Table.Column>
                  <Table.Column>Costo (USD)</Table.Column>
                  <Table.Column>Aranceles (USD)</Table.Column>
                  <Table.Column>Estado</Table.Column>
                  <Table.Column>Fecha Creación</Table.Column>
                  <Table.Column>Acciones</Table.Column>
                </Table.Header>
                <Table.Body>
                {enviosFiltrados.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={8}>
                      <EmptyState className="py-16 text-center">Sin envíos registrados</EmptyState>
                    </Table.Cell>
                  </Table.Row>
                )}
                  {enviosFiltrados
                    .slice(pagEnvios.inicio, pagEnvios.fin)
                    .map((e) => (
                      <Table.Row key={e.id} className={e.estado === 'recibido' ? 'bg-success-soft' : 'bg-warning-soft'}>
                        <Table.Cell>{e.id}</Table.Cell>
                        <Table.Cell>{e.proveedor}</Table.Cell>
                        <Table.Cell>{Number(e.peso_total_lbs).toFixed(2)}</Table.Cell>
                        <Table.Cell>${Number(e.costo).toFixed(2)}</Table.Cell>
                        <Table.Cell>${Number(e.aranceles_usd).toFixed(2)}</Table.Cell>
                        <Table.Cell>
                          <Chip color={e.estado === 'recibido' ? 'success' : 'warning'} variant="soft">
                            {e.estado}
                          </Chip>
                        </Table.Cell>
                        <Table.Cell>{new Date(e.fecha_creacion).toLocaleDateString()}</Table.Cell>
                        <Table.Cell className="space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openEditEnvioModal(e)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteEnvio(e.id)}
                          >
                            Eliminar
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                </Table.Body>
              </Table.Content>
            </Table>

            <Paginador
              pagina={pagEnvios.pagina}
              totalPaginas={pagEnvios.totalPaginas}
              onCambio={pagEnvios.setPagina}
            />

            <EnvioModal
              isOpen={isEnvioModalOpen}
              onClose={() => setIsEnvioModalOpen(false)}
              onSave={(envio, productosEnvioData) => {
                if (envioEditar?.id) {
                  handleUpdateEnvio(envioEditar.id, envio, productosEnvioData);
                } else {
                  handleCreateEnvio(envio, productosEnvioData);
                }
              }}
              envioEditar={envioEditar}
              productos={productos}
              productosEnvioExistentes={productosEnvio}
            />
          </>
        )}

        {/* ========== PESTAÑA TRANSACCIONES ========== */}
        {activeTab === 'transacciones' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Transacciones</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-foreground/70">Desde:</label>
                <Input
                  type="date"
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.target.value)}
                />
                <label className="text-sm text-foreground/70">Hasta:</label>
                <Input
                  type="date"
                  value={filtroFechaHasta}
                  onChange={(e) => setFiltroFechaHasta(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setTransaccionEditar(null);
                    setIsTransaccionModalOpen(true);
                  }}
                >
                  + Nueva Transacción
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
              <Card className="p-3">
                <p className="text-xs text-muted">Movimientos</p>
                <p className="text-lg font-semibold">{transaccionesFiltradas.length}</p>
              </Card>
              {Object.entries(resumenTransacciones).map(([codigo, v]) => (
                <Card key={codigo} className="p-3">
                  <p className="text-xs text-muted">Resumen · {codigo}</p>
                  <p className="text-sm">
                    Enviado: <span className="font-semibold">${v.enviado.toFixed(2)}</span>
                  </p>
                  <p className="text-sm">
                    Recibido: <span className="font-semibold">${v.recibido.toFixed(2)}</span>
                  </p>
                  <p className="text-sm">
                    Comisión: <span className="font-semibold">${v.comision.toFixed(2)}</span>
                  </p>
                </Card>
              ))}
            </div>

            <Table aria-label="Transacciones" className="mt-2">
              <Table.Content>
                <Table.Header>
                  <Table.Column isRowHeader>ID</Table.Column>
                  <Table.Column>Origen</Table.Column>
                  <Table.Column>Destino</Table.Column>
                  <Table.Column>Monto Origen</Table.Column>
                  <Table.Column>Monto Destino</Table.Column>
                  <Table.Column>Tasa</Table.Column>
                  <Table.Column>Comisión</Table.Column>
                  <Table.Column>Fecha</Table.Column>
                  <Table.Column>Acciones</Table.Column>
                </Table.Header>
                <Table.Body>
                {transaccionesFiltradas.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={9}>
                      <EmptyState className="py-16 text-center">Sin transacciones registradas</EmptyState>
                    </Table.Cell>
                  </Table.Row>
                )}
                  {transaccionesFiltradas
                    .slice(pagTransacciones.inicio, pagTransacciones.fin)
                    .map((t) => (
                    <Table.Row key={t.id_trans}>
                      <Table.Cell>{t.id_trans}</Table.Cell>
                      <Table.Cell>{t.cuenta_origen?.nombre || 'N/A'}</Table.Cell>
                      <Table.Cell>{t.cuenta_destino?.nombre || 'N/A'}</Table.Cell>
                      <Table.Cell>${Number(t.monto_origen).toFixed(2)}</Table.Cell>
                      <Table.Cell>${Number(t.monto_destino).toFixed(2)}</Table.Cell>
                      <Table.Cell>{Number(t.tasa_cambio).toFixed(4)}</Table.Cell>
                      <Table.Cell>${Number(t.comision).toFixed(2)}</Table.Cell>
                      <Table.Cell>{new Date(t.fecha).toLocaleDateString()}</Table.Cell>
                      <Table.Cell className="space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEditTransaccionModal(t)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteTransaccion(t.id_trans)}
                        >
                          Eliminar
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table>

            <Paginador
              pagina={pagTransacciones.pagina}
              totalPaginas={pagTransacciones.totalPaginas}
              onCambio={pagTransacciones.setPagina}
            />

            <TransaccionModal
              isOpen={isTransaccionModalOpen}
              onClose={() => setIsTransaccionModalOpen(false)}
              onSave={(transaccion) => {
                if (transaccionEditar?.id_trans) {
                  handleUpdateTransaccion(transaccionEditar.id_trans, transaccion);
                } else {
                  handleCreateTransaccion(transaccion);
                }
              }}
              transaccionEditar={transaccionEditar}
              cuentas={cuentas}
              monedas={monedas}
            />
          </>
        )}

        {/* ========== PESTAÑA VENTAS ========== */}
        {activeTab === 'ventas' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Ventas (Revolico)</h2>
              <div className="flex items-center gap-2">
                <Selector
                  valor={filtroVentaEstado || ''}
                  onChange={(v) => setFiltroVentaEstado(v)}
                  opciones={[
                    { valor: 'todos', etiqueta: 'Todos' },
                    { valor: 'completada', etiqueta: 'Completada' },
                    { valor: 'pendiente', etiqueta: 'Pendiente' },
                  ]}
                  fullWidth={false}
                  variant="secondary"
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setVentaEditar(null);
                    setProductosVentaSeleccionada([]);
                    fetchProductos();
                    setIsVentaModalOpen(true);
                  }}
                >
                  + Nueva Venta
                </Button>
              </div>
            </div>

            <Table aria-label="Ventas" className="mt-2">
              <Table.Content>
                <Table.Header>
                  <Table.Column isRowHeader>ID</Table.Column>
                  <Table.Column>Forma Pago</Table.Column>
                  <Table.Column>Estado</Table.Column>
                  <Table.Column>Total (USD)</Table.Column>
                  <Table.Column>Total (CUP)</Table.Column>
                  <Table.Column>Tasa</Table.Column>
                  <Table.Column>Ganancia (USD)</Table.Column>
                  <Table.Column>Fecha</Table.Column>
                  <Table.Column>Acciones</Table.Column>
                </Table.Header>
                <Table.Body>
                {ventasFiltradas.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={9}>
                      <EmptyState className="py-16 text-center">Sin ventas registradas</EmptyState>
                    </Table.Cell>
                  </Table.Row>
                )}
                  {ventasFiltradas
                    .slice(pagVentas.inicio, pagVentas.fin)
                    .map((v) => (
                      <Table.Row key={v.id} className={v.estado === 'completada' ? 'bg-success-soft' : 'bg-warning-soft'}>
                        <Table.Cell>{v.id}</Table.Cell>
                        <Table.Cell>{formaPagoLabel(v.forma_pago)}</Table.Cell>
                        <Table.Cell>
                          <Chip color={v.estado === 'completada' ? 'success' : 'warning'} variant="soft">
                            {v.estado}
                          </Chip>
                        </Table.Cell>
                        <Table.Cell>${Number(v.total_usd).toFixed(2)}</Table.Cell>
                        <Table.Cell>${Number(v.total_cup).toFixed(2)}</Table.Cell>
                        <Table.Cell>{Number(v.tasa_usd_cup).toFixed(4)}</Table.Cell>
                        <Table.Cell className={`${Number(v.ganancia_usd) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          ${Number(v.ganancia_usd).toFixed(2)}
                        </Table.Cell>
                        <Table.Cell>{new Date(v.fecha).toLocaleDateString()}</Table.Cell>
                        <Table.Cell className="space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openEditVentaModal(v)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteVenta(v.id)}
                          >
                            Eliminar
                          </Button>
                      </Table.Cell>
                      </Table.Row>
                    ))}
                </Table.Body>
              </Table.Content>
            </Table>

            <Paginador
              pagina={pagVentas.pagina}
              totalPaginas={pagVentas.totalPaginas}
              onCambio={pagVentas.setPagina}
            />

            <VentaModal
              isOpen={isVentaModalOpen}
              onClose={() => setIsVentaModalOpen(false)}
              onSave={(venta, productosVentaData) => {
                if (ventaEditar?.id) {
                  handleUpdateVenta(ventaEditar.id, venta, productosVentaData);
                } else {
                  handleCreateVenta(venta, productosVentaData);
                }
              }}
              ventaEditar={ventaEditar}
              productos={productos}
            />
          </>
        )}

        {/* ========== PESTAÑA DASHBOARD ========== */}
        {activeTab === 'dashboard' && (
          <>
            <Lobby
              ventasHoy={ventasHoy.length}
              ingresosHoyUsd={ingresosHoyUsd}
              enviosPendientes={enviosPendientes}
              stockBajo={stockBajo}
              cargando={cargandoDashboard}
              onNuevaVenta={() => {
                setVentaEditar(null);
                setProductosVentaSeleccionada([]);
                fetchProductos();
                setActiveTab('ventas');
                setIsVentaModalOpen(true);
              }}
              onAgregarProducto={() => {
                setProductoEditar(null);
                setActiveTab('productos');
                setIsProductoModalOpen(true);
              }}
              onRegistrarEnvio={() => {
                setEnvioEditar(null);
                setProductosEnvio([]);
                setActiveTab('envios');
                setIsEnvioModalOpen(true);
              }}
              onNuevaTransaccion={() => {
                setTransaccionEditar(null);
                setActiveTab('transacciones');
                setIsTransaccionModalOpen(true);
              }}
              onRegistrarConversion={() => {
                setFlujoEditar(null);
                setActiveTab('conversion');
                setIsConversionModalOpen(true);
              }}
              onIrA={setActiveTab}
            />

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Dashboard</h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={exportarRespaldo}
                >
                  Exportar Respaldo (JSON)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={exportarReporteCSV}
                >
                  Exportar Reporte (CSV)
                </Button>
              </div>
            </div>

            {cargandoDashboard ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-7 w-1/2 mt-3" />
                    <Skeleton className="h-3 w-3/4 mt-2" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">Ganancia Neta Real (USD)</p>
                  <TrendingUp className="h-4 w-4 text-muted" />
                </div>
                <p className={`text-2xl font-semibold ${resumenDashboard.gananciaNetaReal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  ${resumenDashboard.gananciaNetaReal.toFixed(2)}
                </p>
                <p className="text-xs text-muted mt-1">Ventas − costo FIFO − pérdidas conversión − comisiones</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">Ingresos por Ventas (USD)</p>
                  <ShoppingCart className="h-4 w-4 text-muted" />
                </div>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  ${resumenDashboard.ingresosVentas.toFixed(2)}
                </p>
                <p className="text-xs text-muted mt-1">
                  Costo real de lo vendido: ${resumenDashboard.costoVendido.toFixed(2)}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">Capital en Inventario (USD)</p>
                  <Package className="h-4 w-4 text-muted" />
                </div>
                <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                  ${resumenDashboard.capitalInventario.toFixed(2)}
                </p>
                <p className="text-xs text-muted mt-1">
                  No es pérdida: {resumenDashboard.stockTotal} unidades sin vender
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">Invertido Total en Envíos (USD)</p>
                  <Truck className="h-4 w-4 text-muted" />
                </div>
                <p className="text-2xl font-semibold">
                  ${resumenDashboard.invertidoTotal.toFixed(2)}
                </p>
                <p className="text-xs text-muted mt-1">
                  Pérdidas por conversión: ${resumenDashboard.perdidasConversion.toFixed(2)}
                </p>
              </Card>
              <Card className="p-4 bg-orange-50 dark:bg-orange-950/40">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">Capital de Socios en Mercancía (USD)</p>
                  <Users className="h-4 w-4 text-muted" />
                </div>
                <p className="text-2xl font-semibold text-orange-700 dark:text-orange-400">
                  ${capitalSociosEnMercancia.toFixed(2)}
                </p>
                <p className="text-xs text-muted mt-1">
                  {inversores.length === 0
                    ? 'Todavía no hay socios'
                    : `${inversores.length} socio(s) · ${capitalSociosDisponible.toFixed(2)} ya liberado y sin destino`}
                </p>
              </Card>
              <Card className="p-4 bg-orange-50 dark:bg-orange-950/40">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">1% Inversores Devengado (USD)</p>
                  <Percent className="h-4 w-4 text-muted" />
                </div>
                <p className="text-2xl font-semibold text-orange-700 dark:text-orange-400">
                  ${resumenDashboard.comisionesInversores.toFixed(2)}
                </p>
                <p className="text-xs text-muted mt-1">
                  {comisionesPendientesTotal > 0.004
                    ? `Viene restado de la ganancia neta · ${comisionesPendientesTotal.toFixed(2)} aún sin cobrar`
                    : resumenDashboard.comisionesInversores > 0
                      ? 'Viene restado de la ganancia neta real'
                      : 'Se devenga con las ventas de mercancía que financian los socios'}
                </p>
              </Card>
              </div>
            )}

            {cargandoDashboard ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className={`p-4 ${i < 2 ? '' : 'md:col-span-2'}`}>
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-[300px] w-full mt-4" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Ventas por Mes (USD)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ventasPorMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" />
                    <XAxis dataKey="mes" tick={{ fill: 'var(--muted)' }} />
                    <YAxis tick={{ fill: 'var(--muted)' }} />
                    <Tooltip contentStyle={TOOLTIP_ESTILO} />
                    <Bar dataKey="vendido" name="Vendido (USD)" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Ganancia por Mes (USD)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ventasPorMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" />
                    <XAxis dataKey="mes" tick={{ fill: 'var(--muted)' }} />
                    <YAxis tick={{ fill: 'var(--muted)' }} />
                    <Tooltip contentStyle={TOOLTIP_ESTILO} />
                    <Bar dataKey="ganancia" name="Ganancia (USD)" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Distribución por Forma de Pago</h3>
                {ventasPorFormaPago.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={ventasPorFormaPago}
                        dataKey="monto"
                        nameKey="forma"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {ventasPorFormaPago.map((entry, index) => (
                          <Cell key={index} fill={COLORES_PIE[index % COLORES_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_ESTILO} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-sm py-20 text-center">Sin ventas registradas</p>
                )}
              </Card>
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Evolución de Tasa USD/CUP</h3>
                {evolucionTasas.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={evolucionTasas}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" />
                      <XAxis dataKey="fecha" tick={{ fill: 'var(--muted)' }} />
                      <YAxis tick={{ fill: 'var(--muted)' }} />
                      <Tooltip contentStyle={TOOLTIP_ESTILO} />
                      <Line type="monotone" dataKey="tasa" name="Tasa (CUP)" stroke="#8b5cf6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-sm py-20 text-center">Sin tasas registradas en ventas</p>
                )}
              </Card>
              <Card className="p-4 md:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Costos de Importación vs Ventas (USD)</h3>
                {comparativoImportesVentas.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparativoImportesVentas}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" />
                      <XAxis dataKey="mes" tick={{ fill: 'var(--muted)' }} />
                      <YAxis tick={{ fill: 'var(--muted)' }} />
                      <Tooltip contentStyle={TOOLTIP_ESTILO} />
                      <Legend />
                      <Bar dataKey="invertido" name="Invertido (USD)" fill="#dc2626" />
                      <Bar dataKey="vendido" name="Vendido (USD)" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-sm py-20 text-center">Sin datos para comparar</p>
                )}
              </Card>
              <Card className="p-4 md:col-span-2">
                <h3 className="text-lg font-semibold mb-1">Invertido vs Recuperado por Envío (USD)</h3>
                <p className="text-xs text-muted mb-4">
                  Un envío es exitoso cuando lo recuperado supera lo invertido y todo su stock se ha vendido.
                </p>
                {invertedVsRecovered.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={invertedVsRecovered}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" />
                      <XAxis dataKey="envio" tick={{ fill: 'var(--muted)' }} />
                      <YAxis tick={{ fill: 'var(--muted)' }} />
                      <Tooltip contentStyle={TOOLTIP_ESTILO} />
                      <Legend />
                      <Bar dataKey="invertido" name="Invertido (USD)" fill="#dc2626" />
                      <Bar dataKey="recuperado" name="Recuperado (USD)" fill="#16a34a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-sm py-20 text-center">Sin envíos registrados</p>
                )}
              </Card>
            </div>
            )}

            {/* ========== TABLA RENTABILIDAD POR ENVÍO ========== */}
            <Card className="mt-6 p-4">
              <h3 className="text-lg font-semibold mb-1">Rentabilidad por Envío</h3>
              <p className="text-xs text-muted mb-4">
                Invertido = productos + flete + aranceles + otros costos, repartido por unidad.
                Utilidad realizada = recuperado − costo de lo vendido de ese envío.
              </p>
              {!rentabilidad ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : rentabilidad.porEnvio.length === 0 ? (
                <p className="text-muted text-sm py-10 text-center">Sin envíos registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table aria-label="Rentabilidad por Envío" className="text-sm">
                    <Table.Content>
                      <Table.Header>
                        <Table.Column isRowHeader>Envío</Table.Column>
                        <Table.Column>Fecha</Table.Column>
                        <Table.Column>Estado</Table.Column>
                        <Table.Column>Invertido</Table.Column>
                        <Table.Column>Overhead</Table.Column>
                        <Table.Column>Unidades</Table.Column>
                        <Table.Column>Recuperado</Table.Column>
                        <Table.Column>Utilidad Realizada</Table.Column>
                        <Table.Column>Margen</Table.Column>
                        <Table.Column>Veredicto</Table.Column>
                      </Table.Header>
                      <Table.Body>
                      {rentabilidad.porEnvio.length === 0 && (
                        <Table.Row>
                          <Table.Cell colSpan={10}>
                            <EmptyState className="py-16 text-center">Sin envíos registrados</EmptyState>
                          </Table.Cell>
                        </Table.Row>
                      )}
                        {rentabilidad.porEnvio
                          .slice(pagRentabilidad.inicio, pagRentabilidad.fin)
                          .map((e) => (
                          <Table.Row key={e.envioId}>
                            <Table.Cell className="font-semibold">#{e.envioId}</Table.Cell>
                            <Table.Cell>{e.fecha || '—'}</Table.Cell>
                            <Table.Cell>{e.estado}</Table.Cell>
                            <Table.Cell>${Number(e.invertido).toFixed(2)}</Table.Cell>
                            <Table.Cell>${Number(e.overhead).toFixed(2)}</Table.Cell>
                            <Table.Cell>
                              {e.unidadesVendidas}/{e.unidadesTotales}
                            </Table.Cell>
                            <Table.Cell>${Number(e.recuperado).toFixed(2)}</Table.Cell>
                            <Table.Cell className={`font-semibold ${
                              Number(e.utilidadRealizada) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                            }`}>
                              ${Number(e.utilidadRealizada).toFixed(2)}
                            </Table.Cell>
                            <Table.Cell>{Number(e.margenPct).toFixed(1)}%</Table.Cell>
                            <Table.Cell>
                              <Chip color={veredictoColor[e.veredicto]} variant="soft">
                                {veredictoLabel[e.veredicto]}
                              </Chip>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table>
                  <Paginador
                    pagina={pagRentabilidad.pagina}
                    totalPaginas={pagRentabilidad.totalPaginas}
                    onCambio={pagRentabilidad.setPagina}
                  />
                </div>
              )}
            </Card>
          </>
        )}

        {/* ========== PESTAÑA CALCULADORA DE PRECIOS ========== */}
        {activeTab === 'calculadora' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">Calculadora de Precios de Venta</h2>
                <p className="text-sm text-foreground/70">
                  Precio recomendado a partir del costo real FIFO de los envíos (compra + flete +
                  aranceles + otros), para alcanzar el margen objetivo.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Margen objetivo:</label>
                <NumInput
                  step="0.5"
                  min="0"
                  max="95"
                  value={margenObjetivo}
                  onChange={setMargenObjetivo}
                  className="w-24 p-2 border rounded"
                />
                <span className="text-sm">%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Card className="p-4">
                <p className="text-xs text-muted">Productos analizados</p>
                <p className="text-2xl font-semibold">{sugerencias.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted">Bajo el margen objetivo</p>
                <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                  {sugerencias.filter((s) => s.bajoMargenObjetivo).length}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted">Con envío de origen</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {sugerencias.filter((s) => s.tieneOrigen).length}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted">Tasa usada (USD→CUP)</p>
                <p className="text-2xl font-semibold">{Number(tasaUSD).toFixed(2)}</p>
              </Card>
            </div>

            <div className="mb-4 flex gap-2">
              <Button
                size="sm"
                variant={filtroCalculadora === 'todos' ? 'primary' : 'secondary'}
                onClick={() => setFiltroCalculadora('todos')}
              >
                Todos
              </Button>
              <Button
                size="sm"
                variant={filtroCalculadora === 'con_stock' ? 'primary' : 'secondary'}
                onClick={() => setFiltroCalculadora('con_stock')}
              >
                Con stock
              </Button>
              <Button
                size="sm"
                variant={filtroCalculadora === 'bajo_margen' ? 'primary' : 'secondary'}
                onClick={() => setFiltroCalculadora('bajo_margen')}
              >
                Bajo margen
              </Button>
            </div>

            {cargandoSugerencias ? (
              <div className="overflow-hidden border rounded-xl">
                <div className="p-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              </div>
            ) : sugerencias.length === 0 ? (
              <p className="text-muted text-sm py-10 text-center">
                No hay productos para calcular. Registra productos y envíos recibidos.
              </p>
            ) : (
              <div className="overflow-x-auto border rounded-xl">
                <Table aria-label="Calculadora de Precios" className="text-sm">
                  <Table.Content>
                    <Table.Header>
                      <Table.Column isRowHeader>Producto</Table.Column>
                      <Table.Column>Costo Real FIFO</Table.Column>
                      <Table.Column>Origen</Table.Column>
                      <Table.Column>Stock</Table.Column>
                      <Table.Column>Precio Actual</Table.Column>
                      <Table.Column>Margen Actual</Table.Column>
                      <Table.Column>Precio Sugerido (USD)</Table.Column>
                      <Table.Column>Precio Sugerido (CUP)</Table.Column>
                      <Table.Column>Ganancia Unitaria</Table.Column>
                      <Table.Column>Estado</Table.Column>
                    </Table.Header>
                    <Table.Body>
                    {sugerenciasFiltradas.length === 0 && (
                      <Table.Row>
                        <Table.Cell colSpan={10}>
                          <EmptyState className="py-16 text-center">Sin productos con ese filtro</EmptyState>
                        </Table.Cell>
                      </Table.Row>
                    )}
                      {sugerenciasFiltradas
                        .slice(pagSugerencias.inicio, pagSugerencias.fin)
                        .map((s) => (
                          <Table.Row key={s.productoId} className={s.bajoMargenObjetivo ? 'bg-danger-soft' : ''}>
                            <Table.Cell>{s.nombre}</Table.Cell>
                            <Table.Cell className="text-blue-700 dark:text-blue-400">
                              ${Number(s.costoRealFifo).toFixed(2)}
                            </Table.Cell>
                            <Table.Cell>
                              {s.envioOrigenId ? `Envío #${s.envioOrigenId}` : 'Catálogo'}
                            </Table.Cell>
                            <Table.Cell>{s.stockDisponible}</Table.Cell>
                            <Table.Cell>${Number(s.precioActual).toFixed(2)}</Table.Cell>
                            <Table.Cell className={`${
                              Number(s.margenActualPct) >= margenObjetivo
                                ? 'text-green-700 dark:text-green-400'
                                : 'text-red-700 dark:text-red-400'
                            }`}>
                              {Number(s.margenActualPct).toFixed(1)}%
                            </Table.Cell>
                            <Table.Cell className="font-semibold text-green-700 dark:text-green-400">
                              ${Number(s.precioSugeridoUsd).toFixed(2)}
                            </Table.Cell>
                            <Table.Cell className="font-semibold">
                              {Number(s.precioSugeridoCup).toFixed(0)} CUP
                            </Table.Cell>
                            <Table.Cell>
                              ${Number(s.gananciaUnitariaUsd).toFixed(2)} ·{' '}
                              {Number(s.gananciaUnitariaCup).toFixed(0)} CUP
                            </Table.Cell>
                            <Table.Cell>
                              {s.bajoMargenObjetivo ? (
                                <Chip color="danger" variant="soft">
                                  Bajo margen
                                </Chip>
                              ) : (
                                <Chip color="success" variant="soft">
                                  OK
                                </Chip>
                              )}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                    </Table.Body>
                  </Table.Content>
                </Table>
                <Paginador
                  pagina={pagSugerencias.pagina}
                  totalPaginas={pagSugerencias.totalPaginas}
                  onCambio={pagSugerencias.setPagina}
                />
              </div>
            )}

            <p className="text-xs text-muted mt-3">
              Fórmula: precio = costo real / (1 − margen). Con tasa 1 USD ={' '}
              {Number(tasaUSD).toFixed(2)} CUP. Esta herramienta solo recomienda: no modifica el
              precio de venta de los productos.
            </p>
          </>
        )}

        {/* ========== PESTAÑA INVERSORES ========== */}
        {activeTab === 'inversores' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">Inversores y Capital</h2>
                <p className="text-sm text-foreground/70">
                  El capital de un socio se asigna a un producto concreto de un envío. Al
                  venderlo, el capital se libera y decides si se reinvierte o se le paga
                  (el pago es siempre el capital íntegro). El 1% se <strong>devenga</strong>{' '}
                  al vender y ya descuenta tu ganancia neta, pero solo lo cobras de verdad
                  cuando el socio deposita el importe en QvaPay.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setInversorEditar(null);
                    setIsInversorModalOpen(true);
                  }}
                >
                  <UserPlus className="h-4 w-4" /> Nuevo Socio
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setInversorSeleccionado(null);
                    setIsAporteModalOpen(true);
                  }}
                  isDisabled={inversores.length === 0}
                >
                  <span className="inline-flex items-center gap-1.5"
                    title={
                      inversores.length === 0
                        ? 'Crea un socio primero'
                        : 'Entra capital de un socio a una cuenta de caja'
                    }
                  >
                    <Banknote className="h-4 w-4" /> Aporte
                  </span>
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setInversorSeleccionado(null);
                    setIsInversionModalOpen(true);
                  }}
                  isDisabled={inversores.length === 0}
                >
                  <span className="inline-flex items-center gap-1.5"
                    title={
                      inversores.length === 0
                        ? 'Crea un socio primero'
                        : 'Asigna capital de un socio a un producto de un envío'
                    }
                  >
                    <PackagePlus className="h-4 w-4" /> Asignar Capital
                  </span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setInversorSeleccionado(null);
                    setTipoMovimiento('reinversion');
                    setIsMovimientoModalOpen(true);
                  }}
                  isDisabled={!resumenInversores.some((r) => Number(r.disponible) > 0)}
                >
                  <span className="inline-flex items-center gap-1.5"
                    title={
                      resumenInversores.some((r) => Number(r.disponible) > 0)
                        ? 'Manda capital liberado de vuelta a la mercancía'
                        : 'No hay capital liberado todavía'
                    }
                  >
                    <RefreshCw className="h-4 w-4" /> Reinvertir
                  </span>
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setInversorSeleccionado(null);
                    setTipoMovimiento('retiro');
                    setIsMovimientoModalOpen(true);
                  }}
                  isDisabled={!resumenInversores.some((r) => Number(r.disponible) > 0)}
                >
                  <span className="inline-flex items-center gap-1.5"
                    title={
                      resumenInversores.some((r) => Number(r.disponible) > 0)
                        ? 'Paga capital liberado a un socio'
                        : 'No hay capital liberado todavía'
                    }
                  >
                    <Wallet className="h-4 w-4" /> Pagar Socio
                  </span>
                </Button>
                <Button
                  size="sm"
                  variant="danger-soft"
                  onClick={() => {
                    setInversorSeleccionado(null);
                    setIsCobroComisionModalOpen(true);
                  }}
                  isDisabled={!resumenInversores.some((r) => Number(r.comisionPendiente) > 0.004)}
                >
                  <span className="inline-flex items-center gap-1.5"
                    title={
                      resumenInversores.some((r) => Number(r.comisionPendiente) > 0.004)
                        ? 'Registra cuánto del 1% ya te pagó el socio (al depositar en QvaPay)'
                        : 'No hay comisión del 1% por cobrar'
                    }
                  >
                    <Percent className="h-4 w-4" /> Cobrar 1%
                  </span>
                </Button>
              </div>
            </div>

            {/* Resumen por socio */}
            {resumenInversores.length === 0 ? (
              <div className="p-8 text-center text-muted">
                <p className="mb-2">Todavía no hay socios.</p>
                <p className="text-sm">
                  Crea el primero con &laquo;+ Nuevo Socio&raquo;. Se le abre
                  automáticamente su cuenta &laquo;Socio X - por pagar&raquo; para que
                  aportes y pagos sean movimientos de caja de verdad.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {resumenInversores.map((r) => {
                  const esSocio = r.inversorId === inversorSeleccionado;
                  return (
                    <div
                      key={r.inversorId}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        esSocio ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/40' : 'border-separator bg-surface'
                      }`}
                      onClick={() =>
                        setInversorSeleccionado(esSocio ? null : r.inversorId)
                      }
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{r.nombre}</h3>
                          <p className="text-xs text-muted">
                            Alta {r.fechaAlta} · cuenta {r.cuentaNombre}
                          </p>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setInversorEditar(
                                inversores.find((i) => Number(i.id) === r.inversorId) || null
                              );
                              setIsInversorModalOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger-soft"
                            onClick={() => handleDeleteInversor(r.inversorId)}
                          >
                            Borrar
                          </Button>
                        </div>
                      </div>

                      {!r.cuadra && (
                        <div className="mb-3 p-2 bg-danger-soft border border-red-300 dark:border-red-900 rounded-lg text-xs text-red-800 dark:text-red-300">
                          {Number(r.diferencia) !== 0
                            ? `Hay ${Number(r.invertido).toFixed(2)} invertido, pero el capital disponible solo llega a ${(Number(r.aportado) + Number(r.reinvertido)).toFixed(2)} (aportes ${Number(r.aportado).toFixed(2)} + reinvertido ${Number(r.reinvertido).toFixed(2)}, diferencia ${Number(r.diferencia).toFixed(2)}).`
                            : 'Se movió más capital del que existía.'}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-foreground/70">Aportado</span>
                          <span className="font-medium">
                            {Number(r.aportado).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/70">En mercancía</span>
                          <span className="font-medium">
                            {Number(r.enMercancia).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/70">Liberado</span>
                          <span className="font-medium">
                            {Number(r.liberado).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/70">Reinvertido</span>
                          <span className="font-medium">
                            {Number(r.reinvertido).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/70">Retirado</span>
                          <span className="font-medium">
                            {Number(r.retirado).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/70">1% devengado</span>
                          <span className="font-medium text-orange-700 dark:text-orange-400">
                            {Number(r.comisionDevengada).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/70">1% cobrado</span>
                          <span className="font-medium text-orange-700 dark:text-orange-400">
                            {Number(r.comisionCobrada).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/70">1% por cobrar</span>
                          <span
                            className={`font-medium ${
                              r.comisionInconsistente
                                ? 'text-red-600 dark:text-red-400'
                                : Number(r.comisionPendiente) > 0.004
                                  ? 'text-orange-700 dark:text-orange-400'
                                  : 'text-green-700 dark:text-green-400'
                            }`}
                          >
                            {Number(r.comisionPendiente).toFixed(2)}
                          </span>
                        </div>
                        {r.comisionInconsistente && (
                          <p className="col-span-2 text-red-600 dark:text-red-400 text-xs">
                            Cobraste más de lo devengado: revisa esta inversión, normalmente
                            significa que bajaste el precio de una venta ya cobrada.
                          </p>
                        )}
                        <div className="flex justify-between col-span-2 pt-1 mt-1 border-t">
                          <span className="text-foreground/70 font-medium">Disponible</span>
                          <span
                            className={`font-bold ${
                              Number(r.disponible) < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'
                            }`}
                          >
                            {Number(r.disponible).toFixed(2)} USD
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Aportes */}
            {aportes.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Aportes ({aportes.length})</h3>
                <div className="overflow-x-auto">
                  <Table aria-label="Aportes" className="w-full">
                    <Table.Content>
                      <Table.Header>
                        <Table.Column isRowHeader>Fecha</Table.Column>
                        <Table.Column>Socio</Table.Column>
                        <Table.Column>Monto</Table.Column>
                        <Table.Column>Cuenta</Table.Column>
                        <Table.Column>Descripción</Table.Column>
                      </Table.Header>
                      <Table.Body>
                      {aportes.length === 0 && (
                        <Table.Row>
                          <Table.Cell colSpan={5}>
                            <EmptyState className="py-16 text-center">Sin aportes registrados</EmptyState>
                          </Table.Cell>
                        </Table.Row>
                      )}
                        {aportes.slice(pagAportes.inicio, pagAportes.fin).map((a) => (
                          <Table.Row key={a.id}>
                            <Table.Cell>
                              {new Date(a.fecha).toLocaleDateString('es-ES')}
                            </Table.Cell>
                            <Table.Cell>{a.inversor?.nombre}</Table.Cell>
                            <Table.Cell className="text-right tabular-nums font-medium">
                              {Number(a.monto).toFixed(2)}
                            </Table.Cell>
                            <Table.Cell>{a.cuenta_origen?.nombre}</Table.Cell>
                            <Table.Cell className="text-foreground/70">{a.descripcion}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table>
                  <Paginador
                    pagina={pagAportes.pagina}
                    totalPaginas={pagAportes.totalPaginas}
                    onCambio={pagAportes.setPagina}
                  />
                </div>
              </div>
            )}

            {/* Asignaciones de capital */}
            {inversiones.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Capital asignado ({inversiones.length})</h3>
<div className="overflow-x-auto">
                  <Table aria-label="Capital asignado" className="w-full">
                    <Table.Content>
                      <Table.Header>
                        <Table.Column isRowHeader>Fecha</Table.Column>
                        <Table.Column>Socio</Table.Column>
                        <Table.Column>Envío</Table.Column>
                        <Table.Column>Producto</Table.Column>
                        <Table.Column>Unidades</Table.Column>
                        <Table.Column>Vendidas</Table.Column>
                        <Table.Column>Monto</Table.Column>
                        <Table.Column>Liberado</Table.Column>
                        <Table.Column>
                          <span
                            title="1% de las ventas que consumieron sus unidades. Lo calcula el FIFO al vender."
                          >
                            1% devengado
                          </span>
                        </Table.Column>
                        <Table.Column>
                          <span
                            title="Parte del 1% que el socio ya pagó (al depositar en QvaPay)."
                          >
                            1% cobrado
                          </span>
                        </Table.Column>
                        <Table.Column>{''}</Table.Column>
                      </Table.Header>
                      <Table.Body>
                      {inversiones.length === 0 && (
                        <Table.Row>
                          <Table.Cell colSpan={11}>
                            <EmptyState className="py-16 text-center">Sin capital asignado todavía</EmptyState>
                          </Table.Cell>
                        </Table.Row>
                      )}
                        {inversiones.slice(pagInversiones.inicio, pagInversiones.fin).map((inv) => {
                          const unidades = Math.trunc(Number(inv.unidades || 0));
                          const liberadas = Math.trunc(Number(inv.unidades_liberadas || 0));
                          const enCurso = unidades - liberadas;
                          const devengada = Number(inv.comision_devengada || 0);
                          const cobrada = Number(inv.comision_cobrada || 0);
                          const pendiente = devengada - cobrada;
                          return (
                            <Table.Row key={inv.id}>
                              <Table.Cell>
                                {new Date(inv.fecha).toLocaleDateString('es-ES')}
                              </Table.Cell>
                              <Table.Cell>{inv.inversor?.nombre}</Table.Cell>
                              <Table.Cell>#{inv.envio?.id}</Table.Cell>
                              <Table.Cell>{inv.producto?.nombre_prod}</Table.Cell>
                              <Table.Cell className="text-right tabular-nums">{unidades}</Table.Cell>
                              <Table.Cell className="text-right tabular-nums">
                                <span className={liberadas > 0 ? 'text-green-700 dark:text-green-400 font-medium' : ''}>
                                  {liberadas}
                                </span>
                                {enCurso > 0 && (
                                  <span className="text-xs text-muted"> ({enCurso} en curso)</span>
                                )}
                              </Table.Cell>
                              <Table.Cell className="text-right tabular-nums">
                                {Number(inv.monto).toFixed(2)}
                              </Table.Cell>
                              <Table.Cell className="text-right tabular-nums text-green-700 dark:text-green-400">
                                {Number(inv.monto_liberado).toFixed(2)}
                              </Table.Cell>
                              <Table.Cell className="text-right tabular-nums text-orange-700 dark:text-orange-400">{devengada.toFixed(2)}</Table.Cell>
                              <Table.Cell className="text-right tabular-nums">
                                <span
                                  className={
                                    pendiente < -0.01
                                      ? 'text-red-600 dark:text-red-400 font-medium'
                                      : pendiente > 0.004
                                        ? 'text-orange-700 dark:text-orange-400'
                                        : 'text-muted'
                                  }
                                >
                                  {cobrada.toFixed(2)}
                                </span>
                                {pendiente > 0.004 && (
                                  <span className="block text-xs text-muted">
                                    {pendiente.toFixed(2)} pendiente
                                  </span>
                                )}
                              </Table.Cell>
                              <Table.Cell className="text-right tabular-nums">
                                <Button
                                  size="sm"
                                  variant="danger-soft"
                                  onClick={() => handleDeleteInversion(inv.id)}
                                >
                                  Borrar
                                </Button>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Content>
</Table>
                  <Paginador
                    pagina={pagInversiones.pagina}
                    totalPaginas={pagInversiones.totalPaginas}
                    onCambio={pagInversiones.setPagina}
                  />
                </div>
              </div>
            )}

            {/* Reinversiones y retiros */}
            {movimientosCapital.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">
                  Reinversiones y pagos ({movimientosCapital.length})
                </h3>
                <div className="overflow-x-auto">
                  <Table aria-label="Reinversiones y pagos" className="w-full">
                    <Table.Content>
                      <Table.Header>
                        <Table.Column isRowHeader>Fecha</Table.Column>
                        <Table.Column>Socio</Table.Column>
                        <Table.Column>Tipo</Table.Column>
                        <Table.Column>Monto</Table.Column>
                        <Table.Column>Destino</Table.Column>
                        <Table.Column>Descripción</Table.Column>
                      </Table.Header>
                      <Table.Body>
                      {movimientosCapital.length === 0 && (
                        <Table.Row>
                          <Table.Cell colSpan={6}>
                            <EmptyState className="py-16 text-center">Sin reinversiones ni pagos todavía</EmptyState>
                          </Table.Cell>
                        </Table.Row>
                      )}
                        {movimientosCapital.slice(pagMovimientos.inicio, pagMovimientos.fin).map((m) => (
                          <Table.Row key={m.id}>
                            <Table.Cell>
                              {new Date(m.fecha).toLocaleDateString('es-ES')}
                            </Table.Cell>
                            <Table.Cell>{m.inversor?.nombre}</Table.Cell>
                            <Table.Cell>
                              <Chip color={m.tipo === 'retiro' ? 'danger' : 'accent'} variant="soft">
                                {m.tipo === 'retiro' ? 'Pago' : 'Reinversión'}
                              </Chip>
                            </Table.Cell>
                            <Table.Cell className="text-right tabular-nums font-medium">
                              {Number(m.monto).toFixed(2)}
                            </Table.Cell>
                            <Table.Cell>
                              {m.envio_destino
                                ? `Envío #${m.envio_destino.id}`
                                : m.tipo === 'retiro'
                                  ? 'Caja → socio'
                                  : '—'}
                            </Table.Cell>
                            <Table.Cell className="text-foreground/70">{m.descripcion}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table>
                  <Paginador
                    pagina={pagMovimientos.pagina}
                    totalPaginas={pagMovimientos.totalPaginas}
                    onCambio={pagMovimientos.setPagina}
                  />
                </div>
              </div>
            )}

            <InversorModal
              isOpen={isInversorModalOpen}
              onClose={() => {
                setIsInversorModalOpen(false);
                setInversorEditar(null);
              }}
              onSave={handleSaveInversor}
              inversorEditar={inversorEditar}
            />
            <AporteModal
              isOpen={isAporteModalOpen}
              onClose={() => setIsAporteModalOpen(false)}
              onSave={handleCreateAporte}
              inversores={inversores.map((i) => ({
                id: Number(i.id),
                nombre: String(i.nombre || ''),
                activo: Boolean(i.activo),
              }))}
              cuentas={cuentas}
              inversorPorDefecto={inversorSeleccionado}
            />
            <InversionModal
              isOpen={isInversionModalOpen}
              onClose={() => setIsInversionModalOpen(false)}
              onSave={handleCreateInversion}
              inversores={inversores.map((i) => ({
                id: Number(i.id),
                nombre: String(i.nombre || ''),
                activo: Boolean(i.activo),
              }))}
              envios={envios}
              inversorPorDefecto={inversorSeleccionado}
              invertidoPorClave={invertidoPorClave}
              vendidoPorProducto={vendidoPorProducto}
            />
            <MovimientoCapitalModal
              isOpen={isMovimientoModalOpen}
              onClose={() => setIsMovimientoModalOpen(false)}
              onSave={handleCreateMovimientoCapital}
              resumen={resumenInversores}
              envios={envios}
              cuentas={cuentas}
              inversorPorDefecto={inversorSeleccionado}
              tipoPorDefecto={tipoMovimiento}
            />
            <CobroComisionModal
              isOpen={isCobroComisionModalOpen}
              onClose={() => setIsCobroComisionModalOpen(false)}
              onSave={handleCreateCobroComision}
              inversores={resumenInversores}
              inversorPorDefecto={inversorSeleccionado}
            />
          </>
        )}

        {/* ========== PESTAÑA CONVERSIÓN (RECARGAS) ========== */}
        {activeTab === 'conversion' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recargas y Conversión</h2>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPeerEditar(null);
                    setIsPeerModalOpen(true);
                  }}
                >
                  + Nuevo Peer
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setFlujoEditar(null);
                    setIsConversionModalOpen(true);
                  }}
                >
                  + Nueva Conversión
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
              <Card className="p-3">
                <p className="text-xs text-muted">CUP invertido</p>
                <p className="text-lg font-semibold">${resumenConversiones.totalCup.toFixed(2)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted">USD invertido</p>
                <p className="text-lg font-semibold">${resumenConversiones.totalUsd.toFixed(2)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted">USDT recibido</p>
                <p className="text-lg font-semibold">${resumenConversiones.totalUsdt.toFixed(2)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted">Pérdida por comisiones</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                  ${resumenConversiones.totalComision.toFixed(2)}
                </p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted">Tasa efectiva (CUP/USDT)</p>
                <p className="text-lg font-semibold">
                  {resumenConversiones.tasaEfectivaPromedio
                    ? `${resumenConversiones.tasaEfectivaPromedio.toFixed(2)}`
                    : '—'}
                </p>
              </Card>
            </div>

            <h3 className="text-lg font-semibold mb-2">Peers QvaPay</h3>
            <Table aria-label="Peers QvaPay" className="mb-6">
              <Table.Content>
                <Table.Header>
                  <Table.Column isRowHeader>ID</Table.Column>
                  <Table.Column>Nombre</Table.Column>
                  <Table.Column>Estado</Table.Column>
                  <Table.Column>Descripción</Table.Column>
                  <Table.Column>Acciones</Table.Column>
                </Table.Header>
                <Table.Body>
                {peers.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={5}>
                      <EmptyState className="py-16 text-center">Sin peers registrados</EmptyState>
                    </Table.Cell>
                  </Table.Row>
                )}
                  {peers.map((p) => (
                    <Table.Row key={p.id}>
                      <Table.Cell>{p.id}</Table.Cell>
                      <Table.Cell>{p.nombre}</Table.Cell>
                      <Table.Cell>
                        <Chip color={p.activo ? 'success' : 'default'} variant="soft">
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>{p.descripcion || ''}</Table.Cell>
                      <Table.Cell className="space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setPeerEditar(p);
                            setIsPeerModalOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeletePeer(p.id)}
                        >
                          Eliminar
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table>

            <h3 className="text-lg font-semibold mb-2">Flujos de Conversión</h3>
            <Table aria-label="Flujos de Conversión" className="mt-2">
              <Table.Content>
                <Table.Header>
                  <Table.Column isRowHeader>ID</Table.Column>
                  <Table.Column>Tipo</Table.Column>
                  <Table.Column>Peer</Table.Column>
                  <Table.Column>Invertido</Table.Column>
                  <Table.Column>USDT Recibido</Table.Column>
                  <Table.Column>Comisiones</Table.Column>
                  <Table.Column>Tasa Efectiva</Table.Column>
                  <Table.Column>Fecha</Table.Column>
                  <Table.Column>Acciones</Table.Column>
                </Table.Header>
                <Table.Body>
                {flujosConversion.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={9}>
                      <EmptyState className="py-16 text-center">Sin flujos de conversión registrados</EmptyState>
                    </Table.Cell>
                  </Table.Row>
                )}
                  {flujosConversion.slice(pagFlujos.inicio, pagFlujos.fin).map((f) => (
                    <Table.Row key={f.id}>
                      <Table.Cell>{f.id}</Table.Cell>
                      <Table.Cell className="font-semibold">{f.tipo}</Table.Cell>
                      <Table.Cell>{f.peer?.nombre || 'N/A'}</Table.Cell>
                      <Table.Cell>
                        ${Number(f.monto_in).toFixed(2)} {f.moneda_in || 'CUP'}
                      </Table.Cell>
                      <Table.Cell>${Number(f.monto_usdt_recibido).toFixed(2)}</Table.Cell>
                      <Table.Cell>
                        ${Number(f.total_comisiones_in).toFixed(2)} {f.moneda_in || 'CUP'}
                      </Table.Cell>
                      <Table.Cell>{Number(f.tasa_efectiva).toFixed(4)}</Table.Cell>
                      <Table.Cell>{new Date(f.fecha).toLocaleDateString()}</Table.Cell>
                      <Table.Cell className="space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setFlujoEditar(f);
                            setIsConversionModalOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteFlujo(f.id)}
                        >
                          Eliminar
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table>

            <Paginador
              pagina={pagFlujos.pagina}
              totalPaginas={pagFlujos.totalPaginas}
              onCambio={pagFlujos.setPagina}
            />

            <PeerModal
              isOpen={isPeerModalOpen}
              onClose={() => setIsPeerModalOpen(false)}
              onSave={(peer) => {
                if (peer.id) {
                  handleUpdatePeer(peer.id, peer);
                } else {
                  handleCreatePeer(peer);
                }
              }}
              peerEditar={peerEditar}
            />
            <ConversionModal
              isOpen={isConversionModalOpen}
              onClose={() => setIsConversionModalOpen(false)}
              onSave={(flujo) => {
                if (flujo.id) {
                  handleUpdateFlujo(flujo.id, flujo);
                } else {
                  handleCreateFlujo(flujo);
                }
              }}
              flujoEditar={flujoEditar}
              peers={peers}
            />
          </>
        )}
      </div>

      <TasaCambioModal
        isOpen={isTasaModalOpen}
        onClose={() => setIsTasaModalOpen(false)}
        onChanged={fetchMonedas}
      />

      {/* Diálogo único (confirm/alert) — HeroUI AlertDialog */}
      <DialogoAviso config={aviso} onClose={() => setAviso(null)} />
    </div>
  );
};

export default App;
