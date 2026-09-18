import React, { useState, useEffect } from 'react';
import { Producto } from '../../shared/entities/Producto';

interface ProductoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (producto: any) => void;
  productoEditar: Partial<Producto> | null;
  tasaUSD?: number;
}

const ProductoModal: React.FC<ProductoModalProps> = ({ isOpen, onClose, onSave, productoEditar, tasaUSD = 1 }) => {
  const [producto, setProducto] = useState<Partial<Producto>>({
    id_prod: '',
    nombre_prod: '',
    descripcion: '',
    costo: 0,
    precio_venta: 0,
    stock_actual: 0,
    peso_lbs: 0,
  });

  useEffect(() => {
    if (productoEditar) {
      setProducto(productoEditar);
    } else {
      setProducto({
        id_prod: '',
        nombre_prod: '',
        descripcion: '',
        costo: 0,
        precio_venta: 0,
        stock_actual: 0,
        peso_lbs: 0,
      });
    }
  }, [productoEditar, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(producto);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">
          {productoEditar ? 'Editar Producto' : 'Nuevo Producto'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">ID (automático):</label>
            <input
              type="text"
              value={productoEditar ? producto.id_prod : ''}
              placeholder={productoEditar ? '' : 'Se generará automáticamente'}
              onChange={(e) => setProducto({ ...producto, id_prod: e.target.value })}
              className="w-full p-2 border rounded bg-gray-100"
              readOnly
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nombre:</label>
            <input
              type="text"
              value={producto.nombre_prod}
              onChange={(e) => setProducto({ ...producto, nombre_prod: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Descripción:</label>
            <textarea
              value={producto.descripcion || ''}
              onChange={(e) => setProducto({ ...producto, descripcion: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Costo (USD):</label>
              <input
                type="number"
                step="0.01"
                value={Number(producto.costo) === 0 ? '' : producto.costo}
                onChange={(e) => setProducto({ ...producto, costo: Number(e.target.value) })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Precio Venta (USD):</label>
              <input
                type="number"
                step="0.01"
                value={Number(producto.precio_venta) === 0 ? '' : producto.precio_venta}
                onChange={(e) => setProducto({ ...producto, precio_venta: Number(e.target.value) })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
          <div className="mb-4 text-sm text-gray-700">
            Precio en CUP (tasa actual 1 USD = {Number(tasaUSD).toFixed(2)} CUP):{' '}
            <span className="font-semibold text-green-700">
              {(Number(producto.precio_venta || 0) * Number(tasaUSD)).toFixed(2)} CUP
            </span>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Stock:</label>
              <input
                type="number"
                value={Number(producto.stock_actual) === 0 ? '' : producto.stock_actual}
                onChange={(e) => setProducto({ ...producto, stock_actual: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Peso (lbs):</label>
              <input
                type="number"
                step="0.01"
                value={Number(producto.peso_lbs) === 0 ? '' : producto.peso_lbs}
                onChange={(e) => setProducto({ ...producto, peso_lbs: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              {productoEditar ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductoModal;