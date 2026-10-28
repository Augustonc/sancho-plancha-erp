import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Ban, Loader2 } from 'lucide-react';
import { onSnapshot } from 'firebase/firestore';
import { useTenant } from '../context/TenantContext';
import {
  getRecentSalesQuery, getShiftsRef, getExpensesRef, getDebtsRef, anularVentaConStock
} from '../firebase/firebaseService';

export default function DashboardView() {
  const { tenantId } = useTenant();
  const [ventas, setVentas] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [anulandoId, setAnulandoId] = useState(null);
  const [notificacion, setNotificacion] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    const toList = (setter) => (snap) => setter(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    const onErr = (nombre) => (err) => console.error(`Error cargando ${nombre}:`, err);

    const unsubs = [
      onSnapshot(getRecentSalesQuery(tenantId), toList(setVentas), onErr('ventas')),
      onSnapshot(getShiftsRef(tenantId), toList(setJornadas), onErr('jornadas')),
      onSnapshot(getExpensesRef(tenantId), toList(setGastos), onErr('gastos')),
      onSnapshot(getDebtsRef(tenantId), toList(setDeudas), onErr('deudas')),
    ];
    return () => unsubs.forEach(u => u());
  }, [tenantId]);

  const mostrarMensaje = (msj) => {
    setNotificacion(msj);
    setTimeout(() => setNotificacion(''), 4000);
  };

  const anularVenta = async (ventaId) => {
    if (!tenantId) return;
    try {
      await anularVentaConStock(tenantId, ventaId);
      mostrarMensaje("Venta anulada correctamente. Stock devuelto.");
    } catch (error) {
      console.error("Error anulando venta:", error);
      mostrarMensaje(error.message || "Error al anular la venta.");
    }
  };

  const stats = useMemo(() => {
    const ventasValidas = ventas.filter(v => v.estado !== 'Anulada');
    const ventasTotales = ventasValidas.reduce((acc, v) => acc + v.totalIngreso, 0);
    const costoMateriaPrima = ventasValidas.reduce((acc, v) => acc + v.totalCosto, 0);

    const sueldosPagados = jornadas.filter(j => j.pagado).reduce((acc, j) => acc + j.totalAPagar, 0);
    const sueldosPendientes = jornadas.filter(j => !j.pagado).reduce((acc, j) => acc + j.totalAPagar, 0);
    const gastosOperativos = gastos.reduce((acc, g) => acc + g.monto, 0);
    const deudasPagadas = deudas.filter(d => d.pagado).reduce((acc, d) => acc + d.monto, 0);
    const deudasPendientes = deudas.filter(d => !d.pagado).reduce((acc, d) => acc + d.monto, 0);

    const gananciaNeta = ventasTotales - (costoMateriaPrima + sueldosPagados + gastosOperativos + deudasPagadas);

    return { ventasTotales, costoMateriaPrima, sueldosPagados, sueldosPendientes, gastosOperativos, deudasPendientes, gananciaNeta, cantidadVentasValidas: ventasValidas.length };
  }, [ventas, jornadas, gastos, deudas]);

  return (
    <div className="space-y-6">
      {notificacion && (
        <div className="bg-gray-800 text-white p-3 rounded-lg text-center font-bold shadow-lg">
          {notificacion}
        </div>
      )}
      <h2 className="text-2xl font-bold text-gray-800">Resumen General (Resultados)</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium opacity-90">Ganancia Neta (Caja Real)</h3>
            <DollarSign className="w-8 h-8 opacity-70" />
          </div>
          <p className="text-4xl font-bold mt-4">${stats.gananciaNeta.toLocaleString()}</p>
          <p className="text-sm mt-2 opacity-80">Lo que te queda en el bolsillo</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <div className="flex justify-between items-center text-gray-500">
            <h3 className="text-lg font-medium">Ingresos por Ventas</h3>
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-4">${stats.ventasTotales.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-2">{stats.cantidadVentasValidas} ventas registradas</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <div className="flex justify-between items-center text-gray-500">
            <h3 className="text-lg font-medium">Costos Totales (Pagados)</h3>
            <TrendingDown className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-4">
            ${(stats.costoMateriaPrima + stats.sueldosPagados + stats.gastosOperativos).toLocaleString()}
          </p>
          <div className="text-xs text-gray-500 mt-2 flex justify-between">
            <span>Mat. Prima: ${stats.costoMateriaPrima}</span>
            <span>Op/Sueldos: ${(stats.sueldosPagados + stats.gastosOperativos)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
          <h3 className="text-xl font-bold text-orange-800 flex items-center gap-2 mb-4">
            <AlertCircle className="w-6 h-6" /> Estado de Deudas y Fiado
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-orange-200">
              <span className="text-orange-900">Deuda total pendiente:</span>
              <span className="font-bold text-red-600">${stats.deudasPendientes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-orange-200">
              <span className="text-orange-900">Sueldos a pagar:</span>
              <span className="font-bold text-red-600">${stats.sueldosPendientes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-orange-900 font-medium">Capacidad de Pago (Ganancia - Deudas):</span>
              <span className={`font-bold ${stats.gananciaNeta - (stats.deudasPendientes + stats.sueldosPendientes) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${(stats.gananciaNeta - (stats.deudasPendientes + stats.sueldosPendientes)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 overflow-y-auto max-h-64">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Últimas Ventas</h3>
          {ventas.length === 0 ? (
            <p className="text-gray-500 italic">No hay ventas registradas aún.</p>
          ) : (
            <div className="space-y-3">
              {ventas.slice(0, 15).map(v => {
                const isAnulada = v.estado === 'Anulada';
                return (
                  <div key={v.id} className={`flex justify-between items-center p-3 rounded-lg border ${isAnulada ? 'bg-red-50 border-red-100 opacity-75' : 'bg-gray-50 border-transparent'}`}>
                    <div>
                      <p className={`font-medium ${isAnulada ? 'line-through text-red-500' : ''}`}>
                        {v.items.length} ítems vendidos {isAnulada && '(Anulada)'}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(v.fecha).toLocaleTimeString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-bold ${isAnulada ? 'text-red-400 line-through' : 'text-green-600'}`}>
                          +${v.totalIngreso}
                        </p>
                        <p className="text-xs text-gray-500">Neta: ${v.gananciaNeta}</p>
                      </div>
                      {!isAnulada && (
                        <button
                          onClick={async () => {
                            if (window.confirm('¿Estás seguro de anular esta venta y devolver el stock? Esta acción no se puede deshacer.')) {
                              setAnulandoId(v.id);
                              await anularVenta(v.id);
                              setAnulandoId(null);
                            }
                          }}
                          disabled={anulandoId === v.id}
                          className="p-2 text-red-500 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                          title="Anular venta y devolver stock"
                        >
                          {anulandoId === v.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Ban className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
