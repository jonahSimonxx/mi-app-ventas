import React, { useState, useEffect } from 'react';
import { Envio } from '../../shared/entities/Envio';
import NumInput from './NumInput';
import ErrorFormulario from './ErrorFormulario';
import CampoFecha from './CampoFecha';
import { Alert } from '@heroui/react/alert';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import { Input } from '@heroui/react/input';
import Selector from './Selector';

interface InversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (datos: {
    inversorId: number;
    productoId: string;
    envioId: number;
    unidades: number;
    monto: number;
    fecha: string;
    descripcion: string;
  }) => void;
  inversores: { id: number; nombre: string; activo: boolean }[];
  envios: Envio[];
  inversorPorDefecto: number | null;
  // Capital ya asignado por (envio, producto), para no ofrecer más unidades de las que hay.
  invertidoPorClave: Map<string, number>;
  // Unidades ya vendidas de cada producto, para avisar de la consecuencia de asignar
  // capital a una mercancía que ya salió.
  vendidoPorProducto: Map<string, number>;
}

const InversionModal: React.FC<InversionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  inversores,
  envios,
  inversorPorDefecto,
  invertidoPorClave,
  vendidoPorProducto,
}) => {
  const [errores, setErrores] = useState<string[]>([]);
  const [inversorId, setInversorId] = useState<number | ''>('');
  const [envioId, setEnvioId] = useState<number | ''>('');
  const [productoId, setProductoId] = useState<string>('');
  const [unidades, setUnidades] = useState(0);
  const [monto, setMonto] = useState(0);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 16));
  const [descripcion, setDescripcion] = useState('');

  const enviosOrdenados = [...envios].sort((a, b) => (b.id || 0) - (a.id || 0));

  useEffect(() => {
    if (isOpen) {
      setInversorId(inversorPorDefecto || (inversores.length ? inversores[0].id : ''));
      setEnvioId(enviosOrdenados.length ? enviosOrdenados[0].id : '');
      setProductoId('');
      setUnidades(0);
      setMonto(0);
      setFecha(new Date().toISOString().slice(0, 16));
      setDescripcion('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, inversorPorDefecto]);

  const envio = envios.find((e) => e.id === envioId);
  const lineas = envio?.productos || [];

  // Cambiar de envío reinicia el producto, porque el producto tiene que estar en ese envío.
  useEffect(() => {
    setProductoId('');
  }, [envioId]);

  const linea = lineas.find((pe) => pe.producto?.id_prod === productoId);
  const usadas = envioId && productoId ? invertidoPorClave.get(`${envioId}::${productoId}`) || 0 : 0;
  const disponibles = linea ? Number(linea.cantidad) - usadas : 0;

  // El costo real por unidad vive en el envío (precio del producto + el overhead
  // repartido). Se calcula igual que lo hace rentabilidadService, para que lo que ve
  // aquí sea lo mismo que va a decir el FIFO.
  const unidadesEnvio = lineas.reduce((sum, pe) => sum + (Number(pe.cantidad) || 0), 0);
  const overhead = envio
    ? (Number(envio.costo) + Number(envio.aranceles_usd) + Number(envio.otros_costos_usd)) /
      (unidadesEnvio || 1)
    : 0;
  const costoRealUnitario = linea ? Number(linea.precio_unitario) + overhead : 0;

  // Sugiere el costo real de las unidades, pero el campo es editable: lo que el socio
  // puso puede no ser lo que está en la ficha.
  useEffect(() => {
    if (costoRealUnitario > 0 && unidades > 0) setMonto(Number((costoRealUnitario * unidades).toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId, unidades]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ========== VALIDACIÓN ==========
    // El backend ya valida que las unidades quepan en el envío (`validarAsignacionEnEnvio`)
    // y que el capital esté liberado. Acá se corta lo que el backend no puede ver bien:
    // un 0 que se guardaría como una inversión sin unidades ni monto.
    const errores: string[] = [];

    if (!inversorId) {
      errores.push('Elegí el socio.');
    }

    if (!envioId) {
      errores.push('Elegí el envío donde se asigna el capital.');
    }

    if (!productoId) {
      errores.push('Elegí el producto que financia el socio.');
    }

    if (!(Number(unidades) >= 1) || !Number.isInteger(Number(unidades))) {
      errores.push('Las unidades tienen que ser un entero mayor o igual a 1.');
    }

    if (!(Number(monto) > 0)) {
      errores.push('El monto invertido tiene que ser mayor que 0.');
    }

    if (Number.isNaN(new Date(fecha).getTime())) {
      errores.push('La fecha de la inversión no es válida.');
    }

    setErrores(errores);
    if (errores.length > 0) return;

    onSave({
      inversorId: Number(inversorId),
      productoId,
      envioId: Number(envioId),
      unidades,
      monto,
      fecha: new Date(fecha).toISOString(),
      descripcion,
    });
    onClose();
  };

  if (!isOpen) return null;
  if (inversores.length === 0) {
    return (
      <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <Modal.Backdrop>
        <Modal.Container placement="center" scroll="inside" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Asignar Capital</Modal.Heading>
              <Modal.CloseTrigger aria-label="Cerrar" />
            </Modal.Header>
            <Modal.Body>
              <p className="text-foreground/70 text-sm mb-4">
                Todavía no hay ningún socio. Crea uno primero en la pestaña Inversores.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cerrar
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    );
  }

  const envioNoRecibido = envio && envio.estado !== 'recibido';

  // Una venta NUNCA devenga comisión a una inversión posterior a ella: el FIFO salta el
  // segmento si la fecha de la inversión es más nueva que la de la venta. Así que
  // asignar capital hoy a un producto que ya se vendió no da 1% por esas ventas viejas.
  // No se bloquea: puede ser justo lo que el usuario quiere (registrar el capital que
  // financiara las ventas siguientes), pero tiene que saberlo antes de confirmar.
  //
  // OJO: se avisa con el total de unidades vendidas del PRODUCTO, no las que quedan de
  // esta linea. ProductoVenta no tiene relacion con el envio, asi que no hay forma de
  // saber cuantas unidades de este envio concreto ya se vendieron (y el FIFO consume el
  // envio mas viejo primero, no esta linea). Cualquier numero mas preciso seria inventado.
  const yaVendidas = productoId ? vendidoPorProducto.get(productoId) || 0 : 0;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
      <Modal.Container placement="center" scroll="inside" size="lg">
        <Modal.Dialog>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <Modal.Header>
              <Modal.Heading>Asignar Capital a un Producto</Modal.Heading>
              <Modal.CloseTrigger aria-label="Cerrar" />
            </Modal.Header>
            <Modal.Body>
              <ErrorFormulario errores={errores} />
        <p className="text-foreground/70 text-xs mb-4">
          El capital se asigna a un producto concreto dentro de un envío. Cuando ese
          producto se venda, el capital se libera y tú decides si se reinvierte o se le
          paga al socio. El 1% se devenga con las ventas posteriores a esta fecha y se
          cobra aparte, cuando el socio lo paga al depositar en QvaPay.
        </p>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Socio:</label>
            <Selector
              valor={inversorId ? String(inversorId) : ''}
              onChange={(v) => setInversorId(Number(v))}
              opciones={inversores.map((i) => ({ valor: String(i.id), etiqueta: i.nombre }))}
              placeholder="Seleccionar socio"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Envío:</label>
              <Selector
                valor={envioId ? String(envioId) : ''}
                onChange={(v) => setEnvioId(Number(v))}
                opciones={enviosOrdenados.map((e) => ({
                  valor: String(e.id),
                  etiqueta: `#${e.id} — ${e.proveedor} (${e.estado})`,
                }))}
                placeholder="Seleccionar envío"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Producto del envío:</label>
              <Selector
                valor={productoId || ''}
                onChange={(v) => setProductoId(v)}
                opciones={lineas.map((pe) => ({
                  valor: String(pe.producto?.id_prod ?? ''),
                  etiqueta: `${pe.producto?.nombre_prod} (${pe.cantidad} und.)`,
                }))}
                placeholder="Seleccionar producto"
                required
              />
            </div>
          </div>

          {envioNoRecibido && (
            <Alert status="warning" className="mb-4">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  Este envío está <strong>pendiente</strong>. Su capital no entra al FIFO ni
                  genera comisión hasta que lo marques como recibido.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {yaVendidas > 0 && !envioNoRecibido && (
            <Alert status="warning" className="mb-4">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  Ojo: de <strong>{linea?.producto?.nombre_prod}</strong> ya se vendieron{' '}
                  <strong>{yaVendidas}</strong> unidades en total. Tu capital de hoy no
                  devengará el 1% de esas ventas (su capital no estaba en la mercancía que se
                  vendió): el 1% solo cuenta a partir de hoy, sobre las ventas que cubran
                  unidades de este envío. Puedes registrarlo igual si es justo lo que
                  financiará las ventas siguientes.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Unidades a financiar:</label>
              <NumInput
                step="1"
                min="0"
                value={unidades}
                onChange={setUnidades}
                sufijo="und"
                className="w-full"
                required
              />
              {linea && (
                <p className="text-foreground/70 text-xs mt-1">
                  Quedan {disponibles} libres de {Number(linea.cantidad)} del envío
                  {usadas > 0 ? ` (${usadas} ya asignadas a otros socios)` : ''}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monto (USD):</label>
              <NumInput
                step="0.01"
                min="0"
                value={monto}
                onChange={setMonto}
                prefijo="$"
                className="w-full"
                required
              />
              {costoRealUnitario > 0 && unidades > 0 && (
                <p className="text-foreground/70 text-xs mt-1">
                  Costo real FIFO: {costoRealUnitario.toFixed(2)}/und
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha:</label>
              <CampoFecha
                valor={fecha}
                onChange={setFecha}
                conHora
                etiqueta="Fecha de la inversión"
                fullWidth
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción:</label>
              <Input fullWidth
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
               
                placeholder="Opcional"
              />
            </div>
          </div>

          </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Asignar
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default InversionModal;
