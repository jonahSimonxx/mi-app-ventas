import React, { useState, useEffect } from 'react';
import { Envio } from '../../shared/entities/Envio';
import { Cuenta } from '../../shared/entities/Cuenta';
import { ResumenInversor } from '../../main/services/inversoresService';
import NumInput from './NumInput';
import ErrorFormulario from './ErrorFormulario';
import CampoFecha from './CampoFecha';
import { Alert } from '@heroui/react/alert';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import { Input } from '@heroui/react/input';
import Selector from './Selector';

interface MovimientoCapitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (datos: {
    inversorId: number;
    tipo: 'retiro' | 'reinversion';
    monto: number;
    fecha: string;
    envioDestinoId?: number;
    productoDestinoId?: string;
    unidades?: number;
    cuentaOrigenId?: number;
    descripcion: string;
  }) => void;
  resumen: ResumenInversor[];
  envios: Envio[];
  cuentas: Cuenta[];
  inversorPorDefecto: number | null;
  tipoPorDefecto: 'retiro' | 'reinversion';
}

const MovimientoCapitalModal: React.FC<MovimientoCapitalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  resumen,
  envios,
  cuentas,
  inversorPorDefecto,
  tipoPorDefecto,
}) => {
  const [errores, setErrores] = useState<string[]>([]);
  const [inversorId, setInversorId] = useState<number | ''>('');
  const [tipo, setTipo] = useState<'retiro' | 'reinversion'>(tipoPorDefecto);
  const [monto, setMonto] = useState(0);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 16));
  const [envioDestinoId, setEnvioDestinoId] = useState<number | ''>('');
  const [productoDestinoId, setProductoDestinoId] = useState<string>('');
  const [unidades, setUnidades] = useState(0);
  const [cuentaOrigenId, setCuentaOrigenId] = useState<number | ''>('');
  const [descripcion, setDescripcion] = useState('');

  const socios = resumen;
  const envio = envios.find((e) => e.id === envioDestinoId);
  const lineas = envio?.productos || [];

  useEffect(() => {
    if (isOpen) {
      setInversorId(inversorPorDefecto || (socios.length ? socios[0].inversorId : ''));
      setTipo(tipoPorDefecto);
      setMonto(0);
      setFecha(new Date().toISOString().slice(0, 16));
      setDescripcion('');
      const efectivo = cuentas.find((c) => c.nombre?.toLowerCase().includes('efectivo usd'));
      setCuentaOrigenId(efectivo ? Number(efectivo.id_cuenta) : cuentas.length ? Number(cuentas[0].id_cuenta) : '');
      const ultimoEnvio = [...envios].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
      setEnvioDestinoId(ultimoEnvio ? ultimoEnvio.id : '');
      setProductoDestinoId('');
      setUnidades(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, inversorPorDefecto, tipoPorDefecto]);

  // Cambiar de envío reinicia el producto: tiene que estar en ese envío.
  useEffect(() => {
    setProductoDestinoId('');
  }, [envioDestinoId]);

  const socio = socios.find((i) => i.inversorId === inversorId);
  const disponible = socio ? Number(socio.disponible) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ========== VALIDACIÓN ==========
    // El backend ya valida el capital liberado (`capitalDisponible`). Acá se pide lo
    // mínimo para que el movimiento tenga sentido: monto > 0 y, en la reinversión, un
    // destino real (el servicio crea una `Inversion` nueva con esos datos).
    const errores: string[] = [];

    if (!inversorId) {
      errores.push('Elegí el socio.');
    }

    if (!(Number(monto) > 0)) {
      errores.push('El monto tiene que ser mayor que 0.');
    }

    if (Number.isNaN(new Date(fecha).getTime())) {
      errores.push('La fecha del movimiento no es válida.');
    }

    if (tipo === 'reinversion') {
      if (!envioDestinoId) {
        errores.push('Elegí el envío donde se reinvierte el capital.');
      }
      if (!productoDestinoId) {
        errores.push('Elegí el producto que se financia con la reinversión.');
      }
      if (!(Number(unidades) >= 1) || !Number.isInteger(Number(unidades))) {
        errores.push('Las unidades de la reinversión tienen que ser un entero mayor o igual a 1.');
      }
    }

    if (tipo === 'retiro' && !cuentaOrigenId) {
      errores.push('Elegí la cuenta de la que sale el pago al socio.');
    }

    setErrores(errores);
    if (errores.length > 0) return;

    onSave({
      inversorId: Number(inversorId),
      tipo,
      monto,
      fecha: new Date(fecha).toISOString(),
      envioDestinoId: tipo === 'reinversion' ? Number(envioDestinoId) : undefined,
      productoDestinoId: tipo === 'reinversion' ? productoDestinoId : undefined,
      unidades: tipo === 'reinversion' ? unidades : undefined,
      cuentaOrigenId: tipo === 'retiro' ? Number(cuentaOrigenId) : undefined,
      descripcion,
    });
    onClose();
  };

  if (!isOpen) return null;
  if (socios.length === 0) {
    return (
      <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <Modal.Backdrop>
        <Modal.Container placement="center" scroll="inside" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Movimiento de Capital</Modal.Heading>
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

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
      <Modal.Container placement="center" scroll="inside" size="lg">
        <Modal.Dialog>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <Modal.Header>
              <Modal.Heading>Reinvertir o Pagar</Modal.Heading>
              <Modal.CloseTrigger aria-label="Cerrar" />
            </Modal.Header>
            <Modal.Body>
              <ErrorFormulario errores={errores} />
        <p className="text-foreground/70 text-xs mb-4">
          Cuando vendes mercancía que financió un socio, su capital queda
          <strong> disponible</strong>. Aquí decides si vuelve al negocio o se le paga.
        </p>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">¿Qué quieres hacer?</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={tipo === 'reinversion' ? 'primary' : 'secondary'}
                onPress={() => setTipo('reinversion')}
                className="flex-1"
              >
                Reinvertir
              </Button>
              <Button
                type="button"
                variant={tipo === 'retiro' ? 'primary' : 'secondary'}
                onPress={() => setTipo('retiro')}
                className="flex-1"
              >
                Pagarle (retiro)
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Socio:</label>
            <Selector
              valor={inversorId ? String(inversorId) : ''}
              onChange={(v) => setInversorId(Number(v))}
              opciones={socios.map((i) => ({
                valor: String(i.inversorId),
                etiqueta: `${i.nombre} — disponible ${Number(i.disponible).toFixed(2)}`,
              }))}
              placeholder="Seleccionar socio"
              required
            />
          </div>

          {socio && !socio.cuadra && (
            <Alert status="danger" className="mb-4">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  Este socio no cuadra
                  {Number(socio.diferencia) !== 0
                    ? `: se invirtió distinto de lo aportado (diferencia ${Number(socio.diferencia).toFixed(2)}).`
                    : ': se movió más capital del que existía.'}{' '}
                  Conviene arreglarlo antes de mover más plata.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Monto:</label>
              <NumInput
                step="0.01"
                min="0"
                value={monto}
                onChange={setMonto}
                prefijo="$"
                className="w-full"
                required
                autoFocus
              />
              <p className="text-foreground/70 text-xs mt-1">
                Disponible: {disponible.toFixed(2)} USD (solo capital)
              </p>
              {Number(socio?.comisionPendiente) > 0.004 && (
                <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                  Aparte: {Number(socio?.comisionPendiente).toFixed(2)} USD de comisión del
                  1% por cobrar, que no sale de este movimiento.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha:</label>
              <CampoFecha
                valor={fecha}
                onChange={setFecha}
                conHora
                etiqueta="Fecha del movimiento"
                fullWidth
                required
              />
            </div>
          </div>

          {tipo === 'reinversion' ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Se reinvierte en el envío:</label>
                  <Selector
                    valor={envioDestinoId ? String(envioDestinoId) : ''}
                    onChange={(v) => setEnvioDestinoId(Number(v))}
                    opciones={[...envios]
                      .sort((a, b) => (b.id || 0) - (a.id || 0))
                      .map((e) => ({
                        valor: String(e.id),
                        etiqueta: `#${e.id} — ${e.proveedor} (${e.estado})`,
                      }))}
                    placeholder="Seleccionar envío"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Producto:</label>
                  <Selector
                    valor={productoDestinoId || ''}
                    onChange={(v) => setProductoDestinoId(v)}
                    opciones={lineas.map((pe) => ({
                      valor: String(pe.producto?.id_prod ?? ''),
                      etiqueta: `${pe.producto?.nombre_prod} (${pe.cantidad} und.)`,
                    }))}
                    placeholder="Seleccionar producto"
                    required
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Unidades que financia:</label>
                <NumInput
                  step="1"
                  min="0"
                  value={unidades}
                  onChange={setUnidades}
                  sufijo="und"
                  className="w-full"
                  required
                />
                <p className="text-foreground/70 text-xs mt-1">
                  Con este movimiento se crea la asignación de capital de {monto.toFixed(2)}{' '}
                  USD a esas unidades, y el capital deja de estar disponible.
                </p>
              </div>
            </>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Se paga desde la cuenta:</label>
              <Selector
                valor={cuentaOrigenId ? String(cuentaOrigenId) : ''}
                onChange={(v) => setCuentaOrigenId(Number(v))}
                opciones={cuentas
                  .filter((c) => !c.nombre?.toLowerCase().startsWith('socio'))
                  .map((c) => ({
                    valor: String(c.id_cuenta),
                    etiqueta: `${c.nombre} (${c.moneda?.codigo}) — saldo ${Number(c.saldo || 0).toFixed(2)}`,
                  }))}
                placeholder="Seleccionar cuenta"
                required
              />
              <p className="text-foreground/70 text-xs mt-1">
                Aquí se paga el <strong>capital íntegro</strong>. El 1% no se descuenta de
                este pago: se devengó al vender y se cobra aparte, con &laquo;+ Cobrar
                1%&raquo;, cuando el socio lo paga al depositar en QvaPay.
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Descripción:</label>
            <Input fullWidth
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
             
              placeholder="Opcional"
            />
          </div>

          </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {tipo === 'reinversion' ? 'Reinvertir' : 'Pagarle'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default MovimientoCapitalModal;
