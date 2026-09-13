import React, { useState, useEffect } from 'react';
import { Envio } from '../../shared/entities/Envio';
import { Producto } from '../../shared/entities/Producto';
import { ProductoEnvio } from '../../shared/entities/ProductoEnvio';

interface ProductoEnEnvio {
  id?: number;
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
}

interface EnvioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (envio: Partial<Envio>, productosEnvio: ProductoEnEnvio[]) => void;
  envioEditar: Partial<Envio> | null;
  productos: Producto[];
  productosEnvioExistentes: ProductoEnvio[];
}

const EnvioModal: React.FC<EnvioModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  envioEditar, 
  productos,
  productosEnvioExistentes 
}) => {
  const [envio, setEnvio] = useState<Partial<Envio>>({
    proveedor: 'WeShipYou',
    costo: 0,
    aranceles_usd: 0,
    peso_total_lbs: 0,
    estado: 'pendiente',
    fecha_recepcion: undefined,
  });

  const [productosEnvio, setProductosEnvio] = useState<ProductoEnEnvio[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [precioUnitario, setPrecioUnitario] = useState<number>(0);

  // Cargar datos si estamos editando
  useEffect(() => {
    if (envioEditar) {
      setEnvio({
        id: envioEditar.id,
        proveedor: envioEditar.proveedor || 'WeShipYou',
        costo: envioEditar.costo || 0,
        aranceles_usd: envioEditar.aranceles_usd || 0,
        peso_total_lbs: envioEditar.peso_total_lbs || 0,
        estado: envioEditar.estado || 'pendiente',
        fecha_recepcion: envioEditar.fecha_recepcion || undefined,
      });
      
      // Cargar productos del envío existente
      const productosEnvioMapeados = productosEnvioExistentes.map(pe => ({
        id: pe.id,
        producto: pe.producto,
        cantidad: pe.cantidad,
        precio_unitario: pe.precio_unitario,
      }));
      setProductosEnvio(productosEnvioMapeados);
    } else {
      setEnvio({
        proveedor: 'WeShipYou',
        costo: 0,
        aranceles_usd: 0,
        peso_total_lbs: 0,
        estado: 'pendiente',
        fecha_recepcion: undefined,
      });
      setProductosEnvio([]);
    }
  }, [envioEditar, productosEnvioExistentes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(envio, productosEnvio);
    onClose();
  };

  const agregarProducto = () => {
    if (!productoSeleccionado) return;
    
    const producto = productos.find(p => p.id_prod === productoSeleccionado);
    if (!producto) return;

    const productoExistenteIndex = productosEnvio.findIndex(
      pe => pe.producto.id_prod === productoSeleccionado
    );

    if (productoExistenteIndex >= 0) {
      // Actualizar cantidad si el producto ya existe
      const nuevosProductos = [...productosEnvio];
      nuevosProductos[productoExistenteIndex] = {
        ...nuevosProductos[productoExistenteIndex],
        cantidad: nuevosProductos[productoExistenteIndex].cantidad + cantidad,
      };
      setProductosEnvio(nuevosProductos);
    } else {
      // Agregar nuevo producto
      setProductosEnvio([
        ...productosEnvio,
        {
          producto,
          cantidad,
          precio_unitario: precioUnitario,
        },
      ]);
    }

    // Limpiar selección
    setProductoSeleccionado('');
    setCantidad(1);
    setPrecioUnitario(0);
  };

  const eliminarProducto = (index: number) => {
    const nuevosProductos = [...productosEnvio];
    nuevosProductos.splice(index, 1);
    setProductosEnvio(nuevosProductos);
  };

  const calcularPesoTotal = () => {
    return productosEnvio.reduce((total, pe) => {
      const producto = pe.producto;
      // Asumimos que cada producto tiene un peso aproximado (por ahora usamos cantidad como peso)
      return total + (pe.cantidad * 0.1); // 0.1 lbs por unidad (valor de ejemplo)
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[90vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {envioEditar ? 'Editar Envío' : 'Nuevo Envío'}
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Datos del envío */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Proveedor:</label>
              <select
                value={envio.proveedor}
                onChange={(e) => setEnvio({ ...envio, proveedor: e.target.value })}
                className="w-full p-2 border rounded"
                required
              >
                <option value="WeShipYou">WeShipYou</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado:</label>
              <select
                value={envio.estado}
                onChange={(e) => setEnvio({ ...envio, estado: e.target.value })}
                className="w-full p-2 border rounded"
                required
              >
                <option value="pendiente">Pendiente</option>
                <option value="recibido">Recibido</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Costo Envío (USD):</label>
              <input
                type="number"
                step="0.01"
                value={envio.costo}
                onChange={(e) => setEnvio({ ...envio, costo: Number(e.target.value) })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Aranceles (USD):</label>
              <input
                type="number"
                step="0.01"
                value={envio.aranceles_usd}
                onChange={(e) => setEnvio({ ...envio, aranceles_usd: Number(e.target.value) })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Peso Total (lbs):</label>
              <input
                type="number"
                step="0.01"
                value={calcularPesoTotal()}
                onChange={(e) => setEnvio({ ...envio, peso_total_lbs: Number(e.target.value) })}
                className="w-full p-2 border rounded bg-gray-100"
                readOnly
              />
            </div>
          </div>

          {envio.estado === 'recibido' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Fecha Recepción:</label>
              <input
                type="datetime-local"
                value={envio.fecha_recepcion ? new Date(envio.fecha_recepcion).toISOString().slice(0, 16) : ''}
                onChange={(e) => setEnvio({ ...envio, fecha_recepcion: new Date(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
          )}

          {/* Lista de productos del envío */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Productos en el Envío</h3>
            
            {/* Tabla de productos agregados */}
            <div className="mb-4">
              <table className="min-w-full border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Producto</th>
                    <th className="p-2 border">Cantidad</th>
                    <th className="p-2 border">Precio Unitario (USD)</th>
                    <th className="p-2 border">Subtotal (USD)</th>
                    <th className="p-2 border">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosEnvio.map((pe, index) => (
                    <tr key={index}>
                      <td className="p-2 border">{pe.producto.nombre_prod}</td>
                      <td className="p-2 border">{pe.cantidad}</td>
                      <td className="p-2 border">{pe.precio_unitario.toFixed(2)}</td>
                      <td className="p-2 border">{(pe.cantidad * pe.precio_unitario).toFixed(2)}</td>
                      <td className="p-2 border">
                        <button
                          type="button"
                          onClick={() => eliminarProducto(index)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Formulario para agregar productos */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Producto:</label>
                <select
                  value={productoSeleccionado}
                  onChange={(e) => setProductoSeleccionado(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Seleccionar producto</option>
                  {productos.map((p) => (
                    <option key={p.id_prod} value={p.id_prod}>
                      {p.nombre_prod}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cantidad:</label>
                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Precio Unitario (USD):</label>
                <input
                  type="number"
                  step="0.01"
                  value={precioUnitario}
                  onChange={(e) => setPrecioUnitario(Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={agregarProducto}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  + Agregar
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              {envioEditar ? 'Guardar Cambios' : 'Crear Envío'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnvioModal;
