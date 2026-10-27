import React, { useState, useEffect } from 'react';
import { Venta } from '../../shared/entities/Venta';
import { Producto } from '../../shared/entities/Producto';
import { PreviewCostoVenta } from '../../main/services/rentabilidadService';
import NumInput from './NumInput';
import ErrorFormulario from './ErrorFormulario';
import CampoFecha from './CampoFecha';
import { Alert } from '@heroui/react/alert';
import { Separator } from '@heroui/react/separator';
import { ScrollShadow } from '@heroui/react/scroll-shadow';
import Selector from './Selector';
import SelectorBuscable from './SelectorBuscable';
import { Modal, Button, Input, Select, SelectTrigger, SelectValue, SelectPopover, ListBox, ListBoxItem } from '@heroui/react';

interface ProductoEnVenta {
  id?: number;
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
}

interface VentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (venta: Partial<Venta>, productosVenta: ProductoEnVenta[]) => void;
  ventaEditar: Partial<Venta> | null;
  productos: Producto[];
}

const formasPago = [
  { valor: 'efectivo_cup', label: 'Efectivo CUP' },
  { valor: 'transferencia_cup', label: 'CUP Transferencia' },
  { valor: 'efectivo_usd', label: 'Efectivo USD' },
  { valor: 'usdt', label: 'USDT' },
];

const VentaModal: React.FC<VentaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  ventaEditar,
  productos,
}) => {
  const [venta, setVenta] = useState<Partial<Venta>>({
    forma_pago: 'efectivo_cup',
    estado: 'completada',
    tasa_usd_cup: 120,
    fecha: new Date(),
    descripcion: '',
  });

  const [errores, setErrores] = useState<string[]>([]);
  const [productosVenta, setProductosVenta] = useState<ProductoEnVenta[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [preview, setPreview] = useState<PreviewCostoVenta | null>(null);

  useEffect(() => {
    if (ventaEditar?.id) {
      setErrores([]);
      setVenta({
        id: ventaEditar.id,
        forma_pago: ventaEditar.forma_pago || 'efectivo_cup',
        estado: ventaEditar.estado || 'completada',
        tasa_usd_cup: Number(ventaEditar.tasa_usd_cup) || 120,
        fecha: ventaEditar.fecha ? new Date(ventaEditar.fecha) : new Date(),
        descripcion: ventaEditar.descripcion || '',
      });

      window.electronAPI
        .getProductosVenta(ventaEditar.id)
        .then((data) => {
          const mapeados = data.map((pv) => ({
            id: pv.id,
            producto: pv.producto,
            cantidad: pv.cantidad,
            precio_unitario: pv.precio_unitario,
          }));
          setProductosVenta(mapeados);
        })
        .catch(() => setProductosVenta([]));
    } else {
      setErrores([]);
      setVenta({
        forma_pago: 'efectivo_cup',
        estado: 'completada',
        tasa_usd_cup: 120,
        fecha: new Date(),
        descripcion: '',
      });
      setProductosVenta([]);

      window.electronAPI
        .getTasaActual('USD')
        .then((tasa) => {
          if (tasa && Number(tasa) > 0) {
            setVenta((prev) => ({ ...prev, tasa_usd_cup: Number(tasa) }));
          }
        })
        .catch(() => {});
    }
    setProductoSeleccionado('');
    setCantidad(1);
  }, [isOpen, ventaEditar]);

  useEffect(() => {
    if (!isOpen) return;
    if (productosVenta.length === 0) {
      setPreview(null);
      return;
    }
    const lineas = productosVenta.map((pv) => ({
      productoId: pv.producto.id_prod,
      nombre: pv.producto.nombre_prod,
      cantidad: Number(pv.cantidad),
      precioUnitario: Number(pv.precio_unitario),
      costoFallback: Number(pv.producto.costo) || 0,
    }));
    let vigente = true;
    window.electronAPI
      .previewCostoVenta(lineas)
      .then((data) => {
        if (vigente) setPreview(data);
      })
      .catch(() => {
        if (vigente) setPreview(null);
      });
    return () => {
      vigente = false;
    };
  }, [isOpen, productosVenta]);

  // ========== CÁLCULOS EN VIVO ==========
  const totalUsd = productosVenta.reduce(
    (sum, pv) => sum + Number(pv.cantidad) * Number(pv.precio_unitario),
    0
  );
  const costoTotalUsd = preview ? Number(preview.costoTotalUsd) : 0;
  const gananciaUsd = totalUsd - costoTotalUsd;
  const tasa = Number(venta.tasa_usd_cup) || 0;
  const totalCup = totalUsd * tasa;

  const costoRealPorProducto = new Map<string, { envioId: number | null; costoUnitario: number; unidades: number }>();
  if (preview) {
    for (const d of preview.detalle) {
      const previo = costoRealPorProducto.get(d.productoId);
      const subtotal = d.unidades * d.costoUnitarioReal;
      const unidades = (previo?.unidades || 0) + d.unidades;
      costoRealPorProducto.set(d.productoId, {
        envioId: previo ? previo.envioId : d.envioOrigenId,
        costoUnitario: unidades > 0 ? subtotal / unidades : 0,
        unidades,
      });
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ========== VALIDACIÓN ==========
    // Una venta sin productos o con unidades 0 no avisa nada: se guarda con total 0 y
    // deja el stock y el FIFO intactos como si nada. Eso después se lee como "no hubo
    // venta" en los reportes, sin rastro de por qué.
    const errores: string[] = [];

    if (productosVenta.length === 0) {
      errores.push('La venta necesita al menos un producto.');
    }

    for (const pv of productosVenta) {
      const cant = Number(pv.cantidad);
      if (!Number.isFinite(cant) || cant < 1) {
        errores.push(`La cantidad vendida de "${pv.producto.nombre_prod}" debe ser al menos 1 (quedó en ${pv.cantidad}).`);
      } else if (!Number.isInteger(cant)) {
        // `ProductoVenta.cantidad` es INT: un decimal se redondearía y el total que se ve
        // en vivo no sería el que queda guardado.
        errores.push(`La cantidad vendida de "${pv.producto.nombre_prod}" debe ser un entero (quedó en ${cant}).`);
      }

      // Vender a 0 descuenta stock y entra en los reportes como una venta de $0, con la
      // ganancia y los pagos distortidos. No debería ser una venta.
      if (Number(pv.precio_unitario) <= 0) {
        errores.push(`El precio de venta de "${pv.producto.nombre_prod}" es 0. Si fue un regalo o una cesión, no lo registres como venta.`);
      }
    }

    setErrores(errores);
    if (errores.length > 0) return;

    onSave(
      {
        ...venta,
        total_usd: Number(totalUsd.toFixed(2)),
        costo_total_usd: Number(costoTotalUsd.toFixed(2)),
        ganancia_usd: Number(gananciaUsd.toFixed(2)),
        total_cup: Number(totalCup.toFixed(2)),
      },
      productosVenta
    );
    onClose();
  };

  const agregarProducto = () => {
    if (!productoSeleccionado) return;

    const producto = productos.find((p) => p.id_prod === productoSeleccionado);
    if (!producto) return;

    // `min="1"` del NumInput no hace nada (es `type="text"`).
    if (!Number.isInteger(Number(cantidad)) || Number(cantidad) < 1) {
      setErrores([`La cantidad de "${producto.nombre_prod}" debe ser un entero mayor o igual a 1.`]);
      return;
    }
    setErrores([]);

    const existenteIndex = productosVenta.findIndex(
      (pv) => pv.producto.id_prod === productoSeleccionado
    );

    const nuevosProductos: ProductoEnVenta[] = [];
    if (existenteIndex >= 0) {
      nuevosProductos.push(...productosVenta);
      nuevosProductos[existenteIndex] = {
        ...nuevosProductos[existenteIndex],
        cantidad: Number(nuevosProductos[existenteIndex].cantidad) + Number(cantidad),
      };
    } else {
      nuevosProductos.push(...productosVenta, {
        producto,
        cantidad,
        precio_unitario: Number(producto.precio_venta) || 0,
      });
    }
    setProductosVenta(nuevosProductos);

    setProductoSeleccionado('');
    setCantidad(1);
  };

  const eliminarProducto = async (index: number) => {
    const pv = productosVenta[index];
    if (pv?.id) {
      try {
        await window.electronAPI.removeProductoVenta(pv.id);
      } catch (error) {
        console.error('Error al eliminar producto de la venta:', error);
      }
    }
    setProductosVenta((prev) => prev.filter((_, i) => i !== index));
  };

  const productoSeleccionadoInfo = productos.find((p) => p.id_prod === productoSeleccionado);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
      <Modal.Container placement="center" scroll="inside" size="full">
        <Modal.Dialog>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <Modal.Header>
              <Modal.Heading>{ventaEditar ? 'Editar Venta' : 'Nueva Venta'}</Modal.Heading>
              <Modal.CloseTrigger aria-label="Cerrar" />
            </Modal.Header>
            <Modal.Body>
              <ErrorFormulario errores={errores} />
          {/* Datos de la venta */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Forma de Pago:</label>
              <Selector
                valor={venta.forma_pago || ''}
                onChange={(key) => setVenta({ ...venta, forma_pago: key as any })}
                opciones={[
                  { valor: 'efectivo_cup', etiqueta: 'Efectivo CUP' },
                  { valor: 'transferencia_cup', etiqueta: 'CUP Transferencia' },
                  { valor: 'efectivo_usd', etiqueta: 'Efectivo USD' },
                  { valor: 'usdt', etiqueta: 'USDT' },
                ]}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Estado:</label>
              <Selector
                valor={venta.estado || ''}
                onChange={(key) => setVenta({ ...venta, estado: key as any })}
                opciones={[
                  { valor: 'completada', etiqueta: 'Completada' },
                  { valor: 'pendiente', etiqueta: 'Pendiente' },
                ]}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tasa USD → CUP:</label>
              <NumInput
                step="0.0001"
                min="0"
                value={venta.tasa_usd_cup}
                onChange={(n) => setVenta({ ...venta, tasa_usd_cup: n })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha:</label>
              <CampoFecha
                valor={venta.fecha ? new Date(venta.fecha).toISOString().slice(0, 16) : ''}
                onChange={(fecha) => setVenta({ ...venta, fecha: new Date(fecha) })}
                conHora
                etiqueta="Fecha de la venta"
                fullWidth
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción:</label>
              <Input fullWidth
                type="text"
                value={venta.descripcion || ''}
                onChange={(e) => setVenta({ ...venta, descripcion: e.target.value })}
              />
            </div>
          </div>

          {/* Resumen en vivo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-surface-secondary border rounded-lg p-3">
              <p className="text-muted text-xs">Total (USD)</p>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">${totalUsd.toFixed(2)}</p>
            </div>
            <div className="bg-surface-secondary border rounded-lg p-3">
              <p className="text-muted text-xs">Costo Real FIFO (USD)</p>
              <p className="text-lg font-semibold">${costoTotalUsd.toFixed(2)}</p>
            </div>
            <div className="bg-surface-secondary border rounded-lg p-3">
              <p className="text-muted text-xs">Ganancia (USD)</p>
              <p className={`text-lg font-semibold ${gananciaUsd >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                ${gananciaUsd.toFixed(2)}
              </p>
            </div>
            <div className="bg-surface-secondary border rounded-lg p-3">
              <p className="text-muted text-xs">Total (CUP)</p>
              <p className="text-lg font-semibold">${totalCup.toFixed(2)}</p>
            </div>
          </div>

          {preview && preview.unidadesSinOrigen > 0 && (
            <Alert status="warning" className="mb-4">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  {preview.unidadesSinOrigen} unidad(es) no tienen envío recibido asociado: se usan
                  como costo el precio de catálogo del producto.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <Separator className="my-5" />

          {/* Lista de productos de la venta */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Productos Vendidos</h3>

            <ScrollShadow orientation="horizontal" className="mb-4">
              <table className="min-w-full border tabular-nums">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="p-2 border">Producto</th>
                    <th className="p-2 border">Cantidad</th>
                    <th className="p-2 border">Precio Unitario (USD)</th>
                    <th className="p-2 border">Costo Real FIFO</th>
                    <th className="p-2 border">Origen</th>
                    <th className="p-2 border">Subtotal (USD)</th>
                    <th className="p-2 border">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosVenta.map((pv, index) => {
                    const costoReal = costoRealPorProducto.get(pv.producto.id_prod);
                    return (
                      <tr key={pv.id ?? index}>
                        <td className="p-2 border">{pv.producto.nombre_prod}</td>
                        <td className="p-2 border">{pv.cantidad}</td>
                          <td className="p-2 border tabular-nums">{Number(pv.precio_unitario).toFixed(2)}</td>
                          <td className="p-2 border text-blue-700 dark:text-blue-400 tabular-nums">
                            {costoReal ? costoReal.costoUnitario.toFixed(2) : '—'}
                          </td>
                          <td className="p-2 border tabular-nums">
                            {!costoReal ? (
                              '—'
                            ) : costoReal.envioId ? (
                              `Envío #${costoReal.envioId}`
                            ) : (
                              'Catálogo'
                            )}
                          </td>
                        <td className="p-2 border">
                          {(Number(pv.cantidad) * Number(pv.precio_unitario)).toFixed(2)}
                        </td>
                        <td className="p-2 border">
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onPress={() => eliminarProducto(index)}
                          >
                            Eliminar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollShadow>

            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="block text-sm font-medium mb-1">Producto:</label>
                <SelectorBuscable
                  valor={productoSeleccionado}
                  onChange={setProductoSeleccionado}
                  opciones={productos
                    .filter((p) => Number(p.stock_actual) > 0)
                    .map((p) => ({ valor: p.id_prod, etiqueta: p.nombre_prod }))}
                  placeholder="Seleccionar producto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cantidad:</label>
                <NumInput
                  min="1"
                  value={cantidad}
                  onChange={setCantidad}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onPress={agregarProducto}
                  className="w-full bg-success text-success-foreground"
                >
                  + Agregar
                </Button>
            </div>
          </div>

            {productoSeleccionadoInfo && (
              <p className="text-foreground/70 text-xs mb-4">
                Precio venta: ${Number(productoSeleccionadoInfo.precio_venta).toFixed(2)} USD ·
                Stock: {Number(productoSeleccionadoInfo.stock_actual)}
              </p>
            )}
          </div>

          </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {ventaEditar ? 'Guardar Cambios' : 'Crear Venta'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default VentaModal;
