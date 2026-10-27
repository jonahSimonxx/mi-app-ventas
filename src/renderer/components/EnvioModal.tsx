import React, { useState, useEffect, useRef } from 'react';
import { Envio } from '../../shared/entities/Envio';
import { Producto } from '../../shared/entities/Producto';
import { ProductoEnvio } from '../../shared/entities/ProductoEnvio';
import NumInput from './NumInput';
import ErrorFormulario from './ErrorFormulario';
import CampoFecha from './CampoFecha';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import Selector from './Selector';
import SelectorBuscable from './SelectorBuscable';

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
  const [errores, setErrores] = useState<string[]>([]);
  const [envio, setEnvio] = useState<Partial<Envio>>({
    proveedor: 'WeShipYou',
    costo: 0,
    aranceles_usd: 0,
    otros_costos_usd: 0,
    peso_total_lbs: 0,
    estado: 'pendiente',
    fecha_recepcion: undefined,
  });

  const [productosEnvio, setProductosEnvio] = useState<ProductoEnEnvio[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [pesoEditado, setPesoEditado] = useState<boolean>(false);

  // Un envío ya recibido tiene su stock y su FIFO consolidados: sus productos quedan bloqueados.
  const envioRecibido = Boolean(envioEditar?.id && envioEditar.estado === 'recibido');
  const productosBloqueados = envioRecibido && envio.estado === 'recibido';

  const overheadTotal =
    Number(envio.costo) + Number(envio.aranceles_usd) + Number(envio.otros_costos_usd);
  const totalUnidades = productosEnvio.reduce((sum, pe) => sum + Number(pe.cantidad), 0);
  const overheadPorUnidad = totalUnidades > 0 ? overheadTotal / totalUnidades : 0;

  // Suma el peso de los productos del envío: Σ cantidad × peso_lbs del producto
  const pesoDesdeProductos = (lista: ProductoEnEnvio[]): number => {
    const total = lista.reduce((sum, pe) => {
      return sum + Number(pe.cantidad) * Number(pe.producto.peso_lbs || 0);
    }, 0);
    return Number(total.toFixed(2));
  };

  // Cargar datos si estamos editando.
  //
  // Antes esto se resincronizaba en cada cambio de `productosEnvioExistentes`, lo que
  // podía pisar los productos que el usuario acababa de añadir en el formulario. Ahora
  // la carga ocurre UNA vez por cada apertura: mientras el modal siga abierto sobre el
  // mismo envío, la lista es del usuario y no se toca.
  const cargadoPara = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Al cerrar se olvida la marca, para que la próxima apertura recargue de verdad.
      cargadoPara.current = null;
      return;
    }

    const clave = envioEditar?.id != null ? String(envioEditar.id) : 'nuevo';
    if (cargadoPara.current === clave) return;
    cargadoPara.current = clave;
    setErrores([]);

    if (envioEditar) {
      setEnvio({
        id: envioEditar.id,
        proveedor: envioEditar.proveedor || 'WeShipYou',
        costo: envioEditar.costo || 0,
        aranceles_usd: envioEditar.aranceles_usd || 0,
        otros_costos_usd: envioEditar.otros_costos_usd || 0,
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
      // Si el peso guardado difiere del calculado, era un ajuste manual y se conserva
      const calculado = pesoDesdeProductos(productosEnvioMapeados);
      const guardado = Number(envioEditar.peso_total_lbs) || 0;
      setPesoEditado(Math.abs(guardado - calculado) > 0.001);
    } else {
      setEnvio({
        proveedor: 'WeShipYou',
        costo: 0,
        aranceles_usd: 0,
        otros_costos_usd: 0,
        peso_total_lbs: 0,
        estado: 'pendiente',
        fecha_recepcion: undefined,
      });
      setProductosEnvio([]);
      setPesoEditado(false);
    }
  }, [isOpen, envioEditar, productosEnvioExistentes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ========== VALIDACIÓN ==========
    // El motivo es que un envío inválido no revienta: el motor FIFO divide el overhead
    // entre las unidades (`unidades <= 0 → 0`), así que un envío sin productos marcado como
    // "recibido" hace que flete + aranceles + otros **desaparezcan en silencio** del costo
    // FIFO y la ganancia de las ventas sale inflada sin que nada lo delate.
    const errores: string[] = [];

    if (envio.estado === 'recibido' && productosEnvio.length === 0) {
      errores.push('Un envío recibido necesita al menos un producto: sin unidades, el flete y los aranceles no se reparten y el costo real queda en 0.');
    }

    for (const pe of productosEnvio) {
      const cant = Number(pe.cantidad);
      if (!Number.isFinite(cant) || cant < 1) {
        errores.push(`La cantidad de "${pe.producto.nombre_prod}" debe ser al menos 1 (quedó en ${pe.cantidad}).`);
      } else if (!Number.isInteger(cant)) {
        // `ProductoEnvio.cantidad` es INT en la BD: un decimal se redondearía solo y
        // el peso/overhead que muestra el modal no serían los que quedan guardados.
        errores.push(`La cantidad de "${pe.producto.nombre_prod}" debe ser un número entero (quedó en ${cant}).`);
      }
    }

    if (Number(envio.peso_total_lbs) < 0) {
      errores.push('El peso total no puede ser negativo.');
    }

    setErrores(errores);
    if (errores.length > 0) return;

    onSave(envio, productosEnvio);
    onClose();
  };

  const agregarProducto = () => {
    if (!productoSeleccionado) return;

    const producto = productos.find(p => p.id_prod === productoSeleccionado);
    if (!producto) return;

    // `min="1"` en el NumInput no hace nada (es `type="text"`), así que el 0 se puede
    // teclear. Se corrige acá, que es el único lugar por donde entra una línea.
    if (!Number.isInteger(Number(cantidad)) || Number(cantidad) < 1) {
      setErrores([`La cantidad de "${producto.nombre_prod}" debe ser un entero mayor o igual a 1.`]);
      return;
    }
    setErrores([]);

    const productoExistenteIndex = productosEnvio.findIndex(
      pe => pe.producto.id_prod === productoSeleccionado
    );

    const nuevosProductos: ProductoEnEnvio[] = [];
    if (productoExistenteIndex >= 0) {
      nuevosProductos.push(...productosEnvio);
      nuevosProductos[productoExistenteIndex] = {
        ...nuevosProductos[productoExistenteIndex],
        cantidad: Number(nuevosProductos[productoExistenteIndex].cantidad) + Number(cantidad),
      };
    } else {
      nuevosProductos.push(...productosEnvio, {
        producto,
        cantidad,
        precio_unitario: Number(producto.costo) || 0,
      });
    }
    setProductosEnvio(nuevosProductos);

    if (!pesoEditado) {
      setEnvio((prev) => ({ ...prev, peso_total_lbs: pesoDesdeProductos(nuevosProductos) }));
    }

    // Limpiar selección
    setProductoSeleccionado('');
    setCantidad(1);
  };

  const eliminarProducto = (index: number) => {
    const nuevosProductos = [...productosEnvio];
    nuevosProductos.splice(index, 1);
    setProductosEnvio(nuevosProductos);
    if (!pesoEditado) {
      setEnvio((prev) => ({ ...prev, peso_total_lbs: pesoDesdeProductos(nuevosProductos) }));
    }
  };

  const actualizarPrecioUnitario = (index: number, valor: number) => {
    const nuevosProductos = [...productosEnvio];
    nuevosProductos[index] = { ...nuevosProductos[index], precio_unitario: valor };
    setProductosEnvio(nuevosProductos);
  };

  const productoSeleccionadoInfo = productos.find(p => p.id_prod === productoSeleccionado);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
      <Modal.Container placement="center" scroll="inside" size="full">
        <Modal.Dialog>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <Modal.Header>
              <Modal.Heading>{envioEditar ? 'Editar Envío' : 'Nuevo Envío'}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ErrorFormulario errores={errores} />
          {/* Datos del envío */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Proveedor:</label>
              <Selector
                valor={envio.proveedor || ''}
                onChange={(v) => setEnvio({ ...envio, proveedor: v })}
                opciones={[
                  { valor: 'WeShipYou', etiqueta: 'WeShipYou' },
                  { valor: 'Otro', etiqueta: 'Otro' },
                ]}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado:</label>
              <Selector
                valor={envio.estado || ''}
                onChange={(v) => setEnvio({ ...envio, estado: v })}
                opciones={[
                  { valor: 'pendiente', etiqueta: 'Pendiente' },
                  { valor: 'recibido', etiqueta: 'Recibido' },
                ]}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Costo Envío (USD):</label>
              <NumInput
                step="0.01"
                value={envio.costo}
                onChange={(n) => setEnvio({ ...envio, costo: n })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Aranceles (USD):</label>
              <NumInput
                step="0.01"
                value={envio.aranceles_usd}
                onChange={(n) => setEnvio({ ...envio, aranceles_usd: n })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Peso Total (lbs):</label>
              <NumInput
                step="0.01"
                min="0"
                value={envio.peso_total_lbs}
                onChange={(n) => {
                  setPesoEditado(true);
                  setEnvio({ ...envio, peso_total_lbs: n });
                }}
                className="w-full p-2 border rounded"
              />
              <p className="text-xs text-muted mt-1">
                Se calcula desde el peso de los productos; se puede ajustar manualmente.
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Otros costos del camino (USD):</label>
            <NumInput
              step="0.01"
              min="0"
              value={envio.otros_costos_usd}
              onChange={(n) => setEnvio({ ...envio, otros_costos_usd: n })}
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-muted mt-1">
              Comisiones, gestoría u otros gastos que no son flete ni aranceles. Se reparten entre
              todas las unidades del envío para calcular el costo real.
            </p>
          </div>

          {totalUnidades > 0 && (
            <div className="mb-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                Overhead total (flete + aranceles + otros):{' '}
                <strong>${overheadTotal.toFixed(2)}</strong> ·{' '}
                {totalUnidades} unidad{totalUnidades === 1 ? '' : 'es'} →{' '}
                <strong>${overheadPorUnidad.toFixed(2)}</strong> por unidad
              </p>
            </div>
          )}

          {envio.estado === 'recibido' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Fecha Recepción:</label>
              <CampoFecha
                valor={envio.fecha_recepcion ? new Date(envio.fecha_recepcion).toISOString().slice(0, 16) : ''}
                onChange={(fecha) =>
                  setEnvio({ ...envio, fecha_recepcion: fecha ? new Date(fecha) : undefined })
                }
                conHora
                etiqueta="Fecha de recepción"
                fullWidth
              />
            </div>
          )}

          {/* Lista de productos del envío */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Productos en el Envío</h3>
            
            {/* Tabla de productos agregados */}
            <div className="mb-4">
              {envioRecibido && envio.estado === 'recibido' && (
                <div className="mb-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg p-2">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Este envío ya fue recibido: sus productos están bloqueados para no alterar el
                    stock ni el costo FIFO de ventas ya registradas. Devuélvelo a «Pendiente» si
                    necesitas corregirlo.
                  </p>
                </div>
              )}
              <table className="min-w-full border">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="p-2 border">Producto</th>
                    <th className="p-2 border">Cantidad</th>
                    <th className="p-2 border">Peso (lbs)</th>
                    <th className="p-2 border">Precio Unitario (USD)</th>
                    <th className="p-2 border">Costo Real (USD)</th>
                    <th className="p-2 border">Subtotal (USD)</th>
                    <th className="p-2 border">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosEnvio.map((pe, index) => (
                    <tr key={index}>
                      <td className="p-2 border">{pe.producto.nombre_prod}</td>
                      <td className="p-2 border">{pe.cantidad}</td>
                      <td className="p-2 border">{Number(pe.producto.peso_lbs || 0).toFixed(2)}</td>
                      <td className="p-2 border">
                        {productosBloqueados ? (
                          Number(pe.precio_unitario).toFixed(2)
                        ) : (
                          <NumInput
                            step="0.01"
                            min="0"
                            value={pe.precio_unitario}
                            onChange={(n) => actualizarPrecioUnitario(index, n)}
                            className="w-24 p-1 border rounded"
                          />
                        )}
                      </td>
                      <td className="p-2 border text-blue-700 dark:text-blue-400">
                        {(Number(pe.precio_unitario) + overheadPorUnidad).toFixed(2)}
                      </td>
                      <td className="p-2 border">
                        {(Number(pe.cantidad) * Number(pe.precio_unitario)).toFixed(2)}
                      </td>
                      <td className="p-2 border">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onPress={() => eliminarProducto(index)}
                          isDisabled={productosBloqueados}
                        >
                          Eliminar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Formulario para agregar productos */}
            <div className={`grid grid-cols-3 gap-2 mb-2 ${productosBloqueados ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-sm font-medium mb-1">Producto:</label>
                <SelectorBuscable
                  valor={productoSeleccionado}
                  onChange={setProductoSeleccionado}
                  opciones={productos.map((p) => ({ valor: p.id_prod, etiqueta: p.nombre_prod }))}
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
              <p className="text-xs text-muted mb-4">
                Precio: ${Number(productoSeleccionadoInfo.costo).toFixed(2)} USD · Peso:{' '}
                {Number(productoSeleccionadoInfo.peso_lbs || 0).toFixed(2)} lbs
              </p>
            )}
          </div>

          </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {envioEditar ? 'Guardar Cambios' : 'Crear Envío'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default EnvioModal;
