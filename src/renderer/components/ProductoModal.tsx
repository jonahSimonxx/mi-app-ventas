import React, { useState, useEffect } from 'react';
import ErrorFormulario from './ErrorFormulario';
import { Producto } from '../../shared/entities/Producto';
import NumInput from './NumInput';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import { Input } from '@heroui/react/input';
import { TextArea } from '@heroui/react/textarea';

interface ProductoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (producto: any) => void;
  productoEditar: Partial<Producto> | null;
  tasaUSD?: number;
}

const ProductoModal: React.FC<ProductoModalProps> = ({ isOpen, onClose, onSave, productoEditar, tasaUSD = 1 }) => {
  const [errores, setErrores] = useState<string[]>([]);
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
    setErrores([]);
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

    // ========== VALIDACIÓN ==========
    const errores: string[] = [];

    if (!String(producto.nombre_prod || '').trim()) {
      errores.push('El nombre del producto es obligatorio.');
    }

    if (Number(producto.costo) < 0) {
      errores.push('El costo no puede ser negativo.');
    }

    if (Number(producto.precio_venta) < 0) {
      errores.push('El precio de venta no puede ser negativo.');
    }

    if (Number(producto.peso_lbs) < 0) {
      errores.push('El peso por unidad no puede ser negativo.');
    }

    setErrores(errores);
    if (errores.length > 0) return;

    onSave(producto);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
      <Modal.Container placement="center" scroll="inside" size="sm">
        <Modal.Dialog>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <Modal.Header>
              <Modal.Heading>{productoEditar ? 'Editar Producto' : 'Nuevo Producto'}</Modal.Heading>
              <Modal.CloseTrigger aria-label="Cerrar" />
            </Modal.Header>
            <Modal.Body>
              <ErrorFormulario errores={errores} />
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">ID (automático):</label>
            <Input
              fullWidth
              type="text"
              value={productoEditar ? producto.id_prod : ''}
              placeholder={productoEditar ? '' : 'Se generará automáticamente'}
              onChange={(e) => setProducto({ ...producto, id_prod: e.target.value })}
              className="bg-surface-secondary"
              readOnly
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nombre:</label>
            <Input
              fullWidth
              type="text"
              value={producto.nombre_prod}
              onChange={(e) => setProducto({ ...producto, nombre_prod: e.target.value })}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Descripción:</label>
            <TextArea
              fullWidth
              value={producto.descripcion || ''}
              onChange={(e) => setProducto({ ...producto, descripcion: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Costo (USD):</label>
              <NumInput
                step="0.01"
                value={producto.costo}
                onChange={(n) => setProducto({ ...producto, costo: n })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Precio Venta (USD):</label>
              <NumInput
                step="0.01"
                value={producto.precio_venta}
                onChange={(n) => setProducto({ ...producto, precio_venta: n })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
          <div className="mb-4 text-sm text-foreground/70">
            Precio en CUP (tasa actual 1 USD = {Number(tasaUSD).toFixed(2)} CUP):{' '}
            <span className="font-semibold text-green-700 dark:text-green-400">
              {(Number(producto.precio_venta || 0) * Number(tasaUSD)).toFixed(2)} CUP
            </span>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Stock:</label>
              <NumInput
                allowNegative
                value={producto.stock_actual}
                onChange={(n) => setProducto({ ...producto, stock_actual: n })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Peso (lbs):</label>
              <NumInput
                step="0.01"
                min="0"
                value={producto.peso_lbs}
                onChange={(n) => setProducto({ ...producto, peso_lbs: n })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {productoEditar ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default ProductoModal;

