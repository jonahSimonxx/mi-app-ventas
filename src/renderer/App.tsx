import React, { useEffect, useState } from 'react';
import ProductoModal from './components/ProductoModal';
import MonedaModal from './components/MonedaModal';
import TasaCambioModal from './components/TasaCambioModal';
import CuentaModal from './components/CuentaModal';
import EnvioModal from './components/EnvioModal';
import TransaccionModal from './components/TransaccionModal';
import { Producto } from '../shared/entities/Producto';
import { Moneda } from '../shared/entities/Moneda';
import { Cuenta } from '../shared/entities/Cuenta';
import { Envio } from '../shared/entities/Envio';
import { ProductoEnvio } from '../shared/entities/ProductoEnvio';
import { Transaccion } from '../shared/entities/Transaccion';

const App: React.FC = () => {
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
  const [isEnvioModalOpen, setIsEnvioModalOpen] = useState(false);
  const [envioEditar, setEnvioEditar] = useState<Partial<Envio> | null>(null);
  const [productosEnvio, setProductosEnvio] = useState<ProductoEnvio[]>([]);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [isTransaccionModalOpen, setIsTransaccionModalOpen] = useState(false);
  const [transaccionEditar, setTransaccionEditar] = useState<Partial<Transaccion> | null>(null);

  // ========== PESTAÑA ACTIVA ==========
  const [activeTab, setActiveTab] = useState<'productos' | 'monedas' | 'cuentas' | 'envios' | 'transacciones'>('productos');

  // ========== FUNCIONES PARA PRODUCTOS ==========
  const fetchProductos = async () => {
    const data = await window.electronAPI.getProductos();
    setProductos(data);
  };

  const handleCreateProducto = async (producto: Partial<Producto>) => {
    await window.electronAPI.createProducto(producto);
    fetchProductos();
  };

  const handleUpdateProducto = async (id: string, producto: Partial<Producto>) => {
    await window.electronAPI.updateProducto(id, producto);
    fetchProductos();
    setIsProductoModalOpen(false);
  };

  const handleDeleteProducto = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      await window.electronAPI.deleteProducto(id);
      fetchProductos();
    }
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
  };

  const handleUpdateMoneda = async (codigo: string, moneda: Partial<Moneda>) => {
    await window.electronAPI.updateMoneda(codigo, moneda);
    fetchMonedas();
    setIsMonedaModalOpen(false);
  };

  const handleDeleteMoneda = async (codigo: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta moneda?')) {
      await window.electronAPI.deleteMoneda(codigo);
      fetchMonedas();
    }
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
  };

  const handleUpdateCuenta = async (id: string, cuenta: Partial<Cuenta>) => {
    await window.electronAPI.updateCuenta(id, cuenta);
    fetchCuentas();
    setIsCuentaModalOpen(false);
  };

  const handleDeleteCuenta = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta cuenta?')) {
      await window.electronAPI.deleteCuenta(id);
      fetchCuentas();
    }
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
      const nuevoEnvio = await window.electronAPI.createEnvio(envio);
      
      // Crear ProductoEnvio para cada producto
      for (const pe of productosEnvio) {
        await window.electronAPI.addProductoEnvio(
          nuevoEnvio.id,
          pe.producto.id_prod,
          pe.cantidad,
          pe.precio_unitario
        );
      }
      
      fetchEnvios();
      setIsEnvioModalOpen(false);
    } catch (error) {
      console.error('Error al crear envío:', error);
    }
  };

  const handleUpdateEnvio = async (id: number, envio: Partial<Envio>, productosEnvio: any[]) => {
    try {
      await window.electronAPI.updateEnvio(id, envio);
      
      // Eliminar productos existentes y volver a crear
      const productosExistentes = await window.electronAPI.getProductosEnvio(id);
      for (const pe of productosExistentes) {
        await window.electronAPI.removeProductoEnvio(pe.id);
      }
      
      // Crear nuevos ProductoEnvio
      for (const pe of productosEnvio) {
        await window.electronAPI.addProductoEnvio(
          id,
          pe.producto.id_prod,
          pe.cantidad,
          pe.precio_unitario
        );
      }
      
      fetchEnvios();
      setIsEnvioModalOpen(false);
    } catch (error) {
      console.error('Error al actualizar envío:', error);
    }
  };

  const handleDeleteEnvio = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este envío?')) {
      try {
        // Eliminar productos del envío primero
        const productosExistentes = await window.electronAPI.getProductosEnvio(id);
        for (const pe of productosExistentes) {
          await window.electronAPI.removeProductoEnvio(pe.id);
        }
        
        await window.electronAPI.deleteEnvio(id);
        fetchEnvios();
      } catch (error) {
        console.error('Error al eliminar envío:', error);
      }
    }
  };

  const openEditEnvioModal = async (envio: Envio) => {
    setEnvioEditar(envio);
    const productosEnvioData = await window.electronAPI.getProductosEnvio(envio.id);
    setProductosEnvio(productosEnvioData);
    setIsEnvioModalOpen(true);
  };


  // ========== FUNCIONES PARA TRANSACCIONES ==========
  const fetchTransacciones = async () => {
    const data = await window.electronAPI.getTransacciones();
    setTransacciones(data);
  };

  const handleCreateTransaccion = async (transaccion: Partial<Transaccion>) => {
    await window.electronAPI.createTransaccion(transaccion);
    fetchTransacciones();
    setIsTransaccionModalOpen(false);
  };

  const handleUpdateTransaccion = async (id: number, transaccion: Partial<Transaccion>) => {
    await window.electronAPI.updateTransaccion(id, transaccion);
    fetchTransacciones();
    setIsTransaccionModalOpen(false);
  };

  const handleDeleteTransaccion = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar esta transacción?')) {
      await window.electronAPI.deleteTransaccion(id);
      fetchTransacciones();
    }
  };

  const openEditTransaccionModal = (transaccion: Transaccion) => {
    setTransaccionEditar(transaccion);
    setIsTransaccionModalOpen(true);
  };

// ========== CARGAR DATOS AL CAMBIAR DE PESTAÑA ==========
  useEffect(() => {
    if (activeTab === 'productos') {
      fetchProductos();
    } else if (activeTab === 'monedas') {
      fetchMonedas();
    } else if (activeTab === 'cuentas') {
      fetchCuentas();
    } else if (activeTab === 'envios') {
      fetchEnvios();
    } else if (activeTab === 'transacciones') {
      fetchTransacciones();
    }
  }, [activeTab]);

  // ========== CARGAR MONEDAS AL INICIO (para la tasa actual) ==========
  useEffect(() => {
    fetchMonedas();
  }, []);

  // ========== OBTENER TASA DE CAMBIO USD ==========
  const tasaUSD = monedas.find(m => m.codigo === 'USD')?.tasa_cambio || 1;

  // ========== RENDERIZADO ==========
  return (
    <div className="p-4">
      {/* Encabezado */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-blue-600">Mi App de Ventas 🚀</h1>
          <p className="mt-2">Electron + React + TypeScript + Tailwind + PostgreSQL</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-3 py-2 bg-gray-100 rounded text-sm">
            Tasa actual: <span className="font-semibold text-green-700">1 USD = {Number(tasaUSD).toFixed(2)} CUP</span>
          </span>
          <button
            onClick={() => setIsTasaModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Tasas de Cambio
          </button>
        </div>
      </div>

      {/* Pestañas */}
      <div className="mt-6 flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('productos')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'productos'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500'
          }`}
        >
          Productos
        </button>
        <button
          onClick={() => setActiveTab('monedas')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'monedas'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500'
          }`}
        >
          Monedas
        </button>
        <button
          onClick={() => setActiveTab('cuentas')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'cuentas'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500'
          }`}
        >
          Cuentas
        </button>
        <button
          onClick={() => setActiveTab('envios')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'envios'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500'
          }`}
        >
          Envíos
        </button>
        <button
          onClick={() => setActiveTab('transacciones')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'transacciones'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500'
          }`}
        >
          Transacciones
        </button>
      </div>

      {/* Contenido según pestaña */}
      <div className="mt-4">
        {/* ========== PESTAÑA PRODUCTOS ========== */}
        {activeTab === 'productos' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Productos</h2>
              <button
                onClick={() => {
                  setProductoEditar(null);
                  setIsProductoModalOpen(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                + Nuevo Producto
              </button>
            </div>

            <table className="min-w-full mt-2 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">ID</th>
                  <th className="p-2 border">Nombre</th>
                  <th className="p-2 border">Descripción</th>
                  <th className="p-2 border">Costo (USD)</th>
                  <th className="p-2 border">Precio Venta (USD/CUP)</th>
                  <th className="p-2 border">Stock</th>
                  <th className="p-2 border">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id_prod}>
                    <td className="p-2 border">{p.id_prod}</td>
                    <td className="p-2 border">{p.nombre_prod}</td>
                    <td className="p-2 border">{p.descripcion || 'N/A'}</td>
                    <td className="p-2 border">${Number(p.costo).toFixed(2)}</td>
                    <td className="p-2 border">
                      ${Number(p.precio_venta).toFixed(2)} / <br />
                      <span className="text-green-600 font-medium">
                        {Number(p.precio_venta * tasaUSD).toFixed(2)} CUP
                      </span>
                    </td>
                    <td className={`p-2 border ${
                      p.stock_actual >= 5 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {p.stock_actual}
                    </td>
                    <td className="p-2 border space-x-2">
                      <button
                        onClick={() => openEditProductoModal(p)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteProducto(p.id_prod)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
              <button
                onClick={() => {
                  setMonedaEditar(null);
                  setIsMonedaModalOpen(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                + Nueva Moneda
              </button>
            </div>

            <table className="min-w-full mt-2 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Código</th>
                  <th className="p-2 border">Nombre</th>
                  <th className="p-2 border">Tasa de Cambio (vs CUP)</th>
                  <th className="p-2 border">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {monedas.map((m) => (
                  <tr key={m.codigo}>
                    <td className="p-2 border">{m.codigo}</td>
                    <td className="p-2 border">{m.nombre}</td>
                    <td className="p-2 border">{Number(m.tasa_cambio).toFixed(2)}</td>
                    <td className="p-2 border space-x-2">
                      <button
                        onClick={() => openEditMonedaModal(m)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteMoneda(m.codigo)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
              <button
                onClick={() => {
                  setCuentaEditar(null);
                  setIsCuentaModalOpen(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                + Nueva Cuenta
              </button>
            </div>

            <table className="min-w-full mt-2 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">ID</th>
                  <th className="p-2 border">Nombre</th>
                  <th className="p-2 border">Moneda</th>
                  <th className="p-2 border">Saldo</th>
                  <th className="p-2 border">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map((c) => (
                  <tr key={c.id_cuenta}>
                    <td className="p-2 border">{c.id_cuenta}</td>
                    <td className="p-2 border">{c.nombre}</td>
                    <td className="p-2 border">{c.moneda?.codigo || 'N/A'}</td>
                    <td className="p-2 border">{Number(c.saldo).toFixed(2)} {c.moneda?.codigo || ''}</td>
                    <td className="p-2 border space-x-2">
                      <button
                        onClick={() => openEditCuentaModal(c)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteCuenta(c.id_cuenta)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
              <button
                onClick={() => {
                  setEnvioEditar(null);
                  setProductosEnvio([]);
                  setIsEnvioModalOpen(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                + Nuevo Envío
              </button>
            </div>

            <table className="min-w-full mt-2 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">ID</th>
                  <th className="p-2 border">Proveedor</th>
                  <th className="p-2 border">Peso (lbs)</th>
                  <th className="p-2 border">Costo (USD)</th>
                  <th className="p-2 border">Aranceles (USD)</th>
                  <th className="p-2 border">Estado</th>
                  <th className="p-2 border">Fecha Creación</th>
                  <th className="p-2 border">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {envios.map((e) => (
                  <tr key={e.id} className={e.estado === 'recibido' ? 'bg-green-50' : 'bg-yellow-50'}>
                    <td className="p-2 border">{e.id}</td>
                    <td className="p-2 border">{e.proveedor}</td>
                    <td className="p-2 border">{e.peso_total_lbs}</td>
                    <td className="p-2 border">${e.costo.toFixed(2)}</td>
                    <td className="p-2 border">${e.aranceles_usd.toFixed(2)}</td>
                    <td className="p-2 border">
                      <span className={`px-2 py-1 rounded text-xs ${e.estado === 'recibido' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                        {e.estado}
                      </span>
                    </td>
                    <td className="p-2 border">{new Date(e.fecha_creacion).toLocaleDateString()}</td>
                    <td className="p-2 border space-x-2">
                      <button
                        onClick={() => openEditEnvioModal(e)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteEnvio(e.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <EnvioModal
              isOpen={isEnvioModalOpen}
              onClose={() => setIsEnvioModalOpen(false)}
              onSave={handleCreateEnvio}
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
              <button
                onClick={() => {
                  setTransaccionEditar(null);
                  setIsTransaccionModalOpen(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                + Nueva Transacción
              </button>
            </div>

            <table className="min-w-full mt-2 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">ID</th>
                  <th className="p-2 border">Tipo</th>
                  <th className="p-2 border">Origen</th>
                  <th className="p-2 border">Destino</th>
                  <th className="p-2 border">Monto Origen</th>
                  <th className="p-2 border">Monto Destino</th>
                  <th className="p-2 border">Tasa</th>
                  <th className="p-2 border">Comisión</th>
                  <th className="p-2 border">Fecha</th>
                  <th className="p-2 border">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {transacciones.map((t) => (
                  <tr key={t.id_trans}>
                    <td className="p-2 border">{t.id_trans}</td>
                    <td className="p-2 border">{t.tipo}</td>
                    <td className="p-2 border">{t.cuenta_origen?.nombre || 'N/A'}</td>
                    <td className="p-2 border">{t.cuenta_destino?.nombre || 'N/A'}</td>
                    <td className="p-2 border">${t.monto_origen.toFixed(2)}</td>
                    <td className="p-2 border">${t.monto_destino.toFixed(2)}</td>
                    <td className="p-2 border">{t.tasa_cambio.toFixed(4)}</td>
                    <td className="p-2 border">${t.comision.toFixed(2)}</td>
                    <td className="p-2 border">{new Date(t.fecha).toLocaleDateString()}</td>
                    <td className="p-2 border space-x-2">
                      <button
                        onClick={() => openEditTransaccionModal(t)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteTransaccion(t.id_trans)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <TransaccionModal
              isOpen={isTransaccionModalOpen}
              onClose={() => setIsTransaccionModalOpen(false)}
              onSave={handleCreateTransaccion}
              transaccionEditar={transaccionEditar}
              cuentas={cuentas}
              monedas={monedas}
            />
          </>
        )}
      </div>

      <TasaCambioModal
        isOpen={isTasaModalOpen}
        onClose={() => setIsTasaModalOpen(false)}
        onChanged={fetchMonedas}
      />
    </div>
  );
};

export default App;