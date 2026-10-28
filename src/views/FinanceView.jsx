import React, { useEffect, useState } from 'react';
import { Wallet, TrendingDown, Trash2 } from 'lucide-react';
import { onSnapshot } from 'firebase/firestore';
import { useTenant } from '../context/TenantContext';
import {
  getDebtsRef, getExpensesRef, registrarDeuda as registrarDeudaSrv, pagarDeuda as pagarDeudaSrv,
  registrarGasto as registrarGastoSrv, eliminarDocTenant
} from '../firebase/firebaseService';

export default function FinanceView() {
  const { tenantId } = useTenant();
  const [deudas, setDeudas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [notificacion, setNotificacion] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    const toList = (setter) => (snap) => setter(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    const unsubDeudas = onSnapshot(getDebtsRef(tenantId), toList(setDeudas), err => console.error('Error cargando deudas:', err));
    const unsubGastos = onSnapshot(getExpensesRef(tenantId), toList(setGastos), err => console.error('Error cargando gastos:', err));
    return () => { unsubDeudas(); unsubGastos(); };
  }, [tenantId]);

  const mostrarMensaje = (msj) => {
    setNotificacion(msj);
    setTimeout(() => setNotificacion(''), 3000);
  };

  const registrarDeuda = async (e) => {
    e.preventDefault();
    if (!tenantId) return;
    const nuevo = {
      proveedor: e.target.proveedor.value,
      monto: parseFloat(e.target.monto.value),
      fecha: new Date().toISOString(),
      pagado: false
    };
    e.target.reset();
    await registrarDeudaSrv(tenantId, nuevo);
    mostrarMensaje("Deuda registrada");
  };

  const pagarDeuda = async (id) => {
    if (!tenantId) return;
    await pagarDeudaSrv(tenantId, id);
    mostrarMensaje("Deuda saldada");
  };

  const registrarGasto = async (e) => {
    e.preventDefault();
    if (!tenantId) return;
    const nuevo = {
      descripcion: e.target.descripcion.value,
      monto: parseFloat(e.target.monto.value),
      fecha: new Date().toISOString()
    };
    e.target.reset();
    await registrarGastoSrv(tenantId, nuevo);
    mostrarMensaje("Gasto registrado");
  };

  const eliminarDoc = async (coleccion, id) => {
    if (!tenantId) return;
    await eliminarDocTenant(tenantId, coleccion, id);
    mostrarMensaje("Elemento eliminado");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {notificacion && (
        <div className="lg:col-span-2 bg-green-100 text-green-800 p-3 rounded-lg border border-green-200 text-center font-bold">
          {notificacion}
        </div>
      )}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-red-500" /> Cuentas por Pagar (Fiado)
        </h2>
        
        <form onSubmit={registrarDeuda} className="flex gap-2 mb-6">
          <input type="text" name="proveedor" placeholder="Proveedor (ej. Carnicería)" className="flex-1 p-2 border rounded text-sm" required />
          <input type="number" name="monto" placeholder="Monto $" className="w-24 p-2 border rounded text-sm" required />
          <button type="submit" className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-bold text-sm">Add</button>
        </form>

        <div className="space-y-3">
          {deudas.map(d => (
            <div key={d.id} className={`p-4 rounded-lg border ${d.pagado ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'} flex justify-between items-center`}>
              <div>
                <p className={`font-bold ${d.pagado ? 'text-gray-600 line-through' : 'text-gray-900'}`}>{d.proveedor}</p>
                <p className="text-xs text-gray-500">{new Date(d.fecha).toLocaleDateString()}</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className={`font-black text-lg ${d.pagado ? 'text-gray-400' : 'text-red-600'}`}>${d.monto}</span>
                {!d.pagado && (
                  <button onClick={() => pagarDeuda(d.id)} className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded font-bold transition-colors">
                    Pagar
                  </button>
                )}
                <button onClick={() => eliminarDoc('deudas', d.id)} className="text-red-500 hover:text-red-700 ml-2" title="Eliminar registro">
                  <Trash2 className="w-5 h-5"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <TrendingDown className="w-6 h-6 text-orange-500" /> Gastos Operativos
        </h2>
        
        <form onSubmit={registrarGasto} className="flex gap-2 mb-6">
          <input type="text" name="descripcion" placeholder="Descripción (ej. Gas, Delivery)" className="flex-1 p-2 border rounded text-sm" required />
          <input type="number" name="monto" placeholder="Monto $" className="w-24 p-2 border rounded text-sm" required />
          <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-bold text-sm">Add</button>
        </form>

        <div className="space-y-3">
          {gastos.map(g => (
             <div key={g.id} className="p-3 border-b border-gray-100 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">{g.descripcion}</p>
                <p className="text-xs text-gray-500">{new Date(g.fecha).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-600">${g.monto}</span>
                <button onClick={() => eliminarDoc('gastos', g.id)} className="text-red-500 hover:text-red-700" title="Eliminar gasto">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            </div>
          ))}
          {gastos.length === 0 && <p className="text-gray-500 text-sm">No hay gastos registrados.</p>}
        </div>
      </div>
    </div>
  );
}
