import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TasaCambioHistorico } from '../../shared/entities/TasaCambioHistorico';
import NumInput from './NumInput';
import ErrorFormulario from './ErrorFormulario';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import { Input } from '@heroui/react/input';

interface TasaCambioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

const hoy = () => new Date().toISOString().slice(0, 10);

const TasaCambioModal: React.FC<TasaCambioModalProps> = ({ isOpen, onClose, onChanged }) => {
  const [errores, setErrores] = useState<string[]>([]);
  const [historico, setHistorico] = useState<TasaCambioHistorico[]>([]);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({
    fecha: hoy(),
    usd_to_cup: '' as number | '',
    eur_to_cup: '' as number | '',
    gbp_to_cup: '' as number | '',
  });

  const cargarHistorico = async () => {
    setCargando(true);
    try {
      const data = await window.electronAPI.getTasasHistoricas();
      setHistorico(data);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarHistorico();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ========== VALIDACIÓN ==========
    // Una tasa 0 (o vacía) es la peor falla posible acá: `tasa_cambio_historico` es la
    // fuente de la tasa vigente que usa el autocalculado de montos de las transacciones y
    // de las ventas, así que un 0 guardado convierte todos los USD a $0 sin que nada falle.
    const errores: string[] = [];

    if (!form.fecha) {
      errores.push('Elegí la fecha de la tasa.');
    }

    if (!(Number(form.usd_to_cup) > 0)) {
      errores.push('La tasa USD→CUP tiene que ser un número mayor que 0.');
    }

    for (const [campo, etiqueta] of [
      ['eur_to_cup', 'EUR→CUP'],
      ['gbp_to_cup', 'GBP→CUP'],
    ] as const) {
      const valor = form[campo];
      if (valor !== '' && !(Number(valor) > 0)) {
        errores.push(`La tasa ${etiqueta} quedó en ${valor}: si la vas a dejar, tiene que ser mayor que 0 (o vacía).`);
      }
    }

    setErrores(errores);
    if (errores.length > 0) return;

    await window.electronAPI.agregarTasaManual({
      fecha: form.fecha,
      usd_to_cup: Number(form.usd_to_cup),
      eur_to_cup: form.eur_to_cup === '' ? undefined : Number(form.eur_to_cup),
      gbp_to_cup: form.gbp_to_cup === '' ? undefined : Number(form.gbp_to_cup),
      fuente: 'manual',
    });
    setErrores([]);
    setForm({ fecha: hoy(), usd_to_cup: '', eur_to_cup: '', gbp_to_cup: '' });
    await cargarHistorico();
    onChanged?.();
  };

  const handleImportarExcel = async () => {
    const resultado = await window.electronAPI.importarTasasExcel();
    if (resultado?.importado) {
      await cargarHistorico();
      onChanged?.();
    }
  };

  if (!isOpen) return null;

  const datosGrafico = historico.map((t) => ({
    fecha: t.fecha,
    usd_to_cup: Number(t.usd_to_cup),
  }));

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
      <Modal.Container placement="center" scroll="inside" size="lg">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>Tasas de Cambio</Modal.Heading>
            <Modal.CloseTrigger aria-label="Cerrar" />
          </Modal.Header>
          <Modal.Body>
              <ErrorFormulario errores={errores} />

        {/* Formulario manual. El <form> es columna flex para que `Modal.Body` pueda
            scrollear (`.modal__dialog` es flex-col y `.modal__body` usa min-h-0 + flex-1),
            así que las clases del grid van en un <div> interno. Este modal además no
            tiene `Modal.Footer`: sus botones viven dentro del propio formulario. */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-4 gap-3 mb-6 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha</label>
            <Input
              fullWidth
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">USD → CUP</label>
            <NumInput
              step="0.0001"
              value={form.usd_to_cup}
              onChange={(n) => setForm({ ...form, usd_to_cup: n })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">EUR → CUP</label>
            <NumInput
              step="0.0001"
              value={form.eur_to_cup}
              onChange={(n) => setForm({ ...form, eur_to_cup: n === 0 ? '' : n })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GBP → CUP</label>
            <NumInput
              step="0.0001"
              value={form.gbp_to_cup}
              onChange={(n) => setForm({ ...form, gbp_to_cup: n === 0 ? '' : n })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="col-span-4 flex gap-2">
            <Button type="submit" className="bg-success text-success-foreground">
              + Añadir tasa
            </Button>
            <Button type="button" variant="primary" onPress={handleImportarExcel}>
              Importar desde Excel
            </Button>
          </div>
          </div>
        </form>

        {/* Gráfico de variación USD → CUP */}
        <h3 className="text-lg font-semibold mb-2">Variación USD → CUP</h3>
        {datosGrafico.length > 0 ? (
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="usd_to_cup" name="USD → CUP" stroke="#2563eb" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted mb-6">Aún no hay datos históricos para graficar.</p>
        )}

        {/* Tabla de histórico */}
        <h3 className="text-lg font-semibold mb-2">Histórico</h3>
        {cargando ? (
          <p className="text-muted">Cargando…</p>
        ) : (
          <table className="min-w-full border">
            <thead className="bg-surface-secondary">
              <tr>
                <th className="p-2 border">Fecha</th>
                <th className="p-2 border">USD → CUP</th>
                <th className="p-2 border">EUR → CUP</th>
                <th className="p-2 border">GBP → CUP</th>
                <th className="p-2 border">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((t) => (
                <tr key={t.id}>
                  <td className="p-2 border">{t.fecha}</td>
                  <td className="p-2 border">{Number(t.usd_to_cup).toFixed(4)}</td>
                  <td className="p-2 border">{t.eur_to_cup != null ? Number(t.eur_to_cup).toFixed(4) : '—'}</td>
                  <td className="p-2 border">{t.gbp_to_cup != null ? Number(t.gbp_to_cup).toFixed(4) : '—'}</td>
                  <td className="p-2 border">{t.fuente}</td>
                </tr>
              ))}
              {historico.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-2 border text-center text-muted">
                    Sin registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default TasaCambioModal;
