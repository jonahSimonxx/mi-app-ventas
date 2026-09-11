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

interface TasaCambioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

const hoy = () => new Date().toISOString().slice(0, 10);

const TasaCambioModal: React.FC<TasaCambioModalProps> = ({ isOpen, onClose, onChanged }) => {
  const [historico, setHistorico] = useState<TasaCambioHistorico[]>([]);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({
    fecha: hoy(),
    usd_to_cup: 0,
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
    await window.electronAPI.agregarTasaManual({
      fecha: form.fecha,
      usd_to_cup: Number(form.usd_to_cup),
      eur_to_cup: form.eur_to_cup === '' ? undefined : Number(form.eur_to_cup),
      gbp_to_cup: form.gbp_to_cup === '' ? undefined : Number(form.gbp_to_cup),
      fuente: 'manual',
    });
    setForm({ fecha: hoy(), usd_to_cup: 0, eur_to_cup: '', gbp_to_cup: '' });
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[800px] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Tasas de Cambio</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Formulario manual */}
        <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-3 mb-6 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">USD → CUP</label>
            <input
              type="number"
              step="0.0001"
              value={form.usd_to_cup}
              onChange={(e) => setForm({ ...form, usd_to_cup: Number(e.target.value) })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">EUR → CUP</label>
            <input
              type="number"
              step="0.0001"
              value={form.eur_to_cup}
              onChange={(e) =>
                setForm({ ...form, eur_to_cup: e.target.value === '' ? '' : Number(e.target.value) })
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GBP → CUP</label>
            <input
              type="number"
              step="0.0001"
              value={form.gbp_to_cup}
              onChange={(e) =>
                setForm({ ...form, gbp_to_cup: e.target.value === '' ? '' : Number(e.target.value) })
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="col-span-4 flex gap-2">
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              + Añadir tasa
            </button>
            <button
              type="button"
              onClick={handleImportarExcel}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Importar desde Excel
            </button>
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
          <p className="text-gray-500 mb-6">Aún no hay datos históricos para graficar.</p>
        )}

        {/* Tabla de histórico */}
        <h3 className="text-lg font-semibold mb-2">Histórico</h3>
        {cargando ? (
          <p className="text-gray-500">Cargando…</p>
        ) : (
          <table className="min-w-full border">
            <thead className="bg-gray-100">
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
                  <td colSpan={5} className="p-2 border text-center text-gray-500">
                    Sin registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TasaCambioModal;
