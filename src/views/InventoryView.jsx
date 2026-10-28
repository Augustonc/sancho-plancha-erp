import React, { useState, useEffect } from 'react';
import { Package, AlertCircle, CheckCircle2, Plus, Minus } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { onSnapshot } from 'firebase/firestore';
import { getIngredientsRef, actualizarStockYCosto } from '../firebase/firebaseService';

export default function InventoryView() {
  const { tenantId } = useTenant();
  const [ingredientes, setIngredientes] = useState([]);
  const [notificacion, setNotificacion] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(getIngredientsRef(tenantId), snap => {
      setIngredientes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [tenantId]);

  const ingresarMercaderia = async (e) => {
    e.preventDefault();
    const ingId = e.target.ingredienteId.value;
    const cantidadComprada = parseFloat(e.target.cantidad.value);
    const nuevoCosto = parseFloat(e.target.nuevoCosto.value);
    
    const ingActual = ingredientes.find(i => i.id === ingId);
    e.target.reset();

    if(ingActual && tenantId) {
      await actualizarStockYCosto(tenantId, ingId, ingActual.stock + cantidadComprada, nuevoCosto || ingActual.costo);
      setNotificacion("Compra registrada con éxito.");
      setTimeout(() => setNotificacion(''), 3000);
    }
  };

  const ajustarStockManual = async (ingId, variacion) => {
    if (!tenantId) return;
    const ingActual = ingredientes.find(i => i.id === ingId);
    if (ingActual) {
      const nuevoStock = Math.max(0, ingActual.stock + variacion);
      await actualizarStockYCosto(tenantId, ingId, nuevoStock);
    }
  };

  return (
    <div className="space-y-6">
      {notificacion && (
        <div className="bg-green-100 text-green-800 p-3 rounded-lg border border-green-200 text-center font-bold">
          {notificacion}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-500" /> Ingresar Compra de Mercadería
        </h2>
        <form onSubmit={ingresarMercaderia} className="flex flex-col md:flex-row gap-3">
          <select name="ingredienteId" className="flex-1 p-2 border rounded" required>
            <option value="">¿Qué compraste?</option>
            {ingredientes.map(ing => <option key={ing.id} value={ing.id}>{ing.nombre}</option>)}
          </select>
          <input type="number" step="0.01" name="cantidad" placeholder="Cantidad que entra" className="w-full md:w-40 p-2 border rounded" required />
          <input type="number" step="0.01" name="nuevoCosto" placeholder="Nuevo Costo Unitario $" className="w-full md:w-48 p-2 border rounded" required />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold transition-colors">Actualizar Stock</button>
        </form>
        <p className="text-xs text-gray-500 mt-2">Al actualizar el costo unitario, las próximas ventas calcularán la ganancia con este nuevo valor.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 border-b">
              <th className="p-3 font-medium">Ingrediente</th>
              <th className="p-3 font-medium">Costo Unit.</th>
              <th className="p-3 font-medium">Stock Actual</th>
              <th className="p-3 font-medium text-center">Ajuste Manual</th>
              <th className="p-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {ingredientes.map(ing => {
              const stockCritico = ing.stockMinimo !== undefined ? ing.stockMinimo : 10;
              const isCritico = ing.stock <= stockCritico;
              return (
                <tr key={ing.id} className={`border-b border-gray-100 ${isCritico ? 'bg-red-50/50' : ''}`}>
                  <td className="p-3 font-medium">{ing.nombre} <span className="text-xs text-gray-400">({ing.unidad})</span></td>
                  <td className="p-3 text-gray-600">${ing.costo}</td>
                  <td className={`p-3 font-bold ${isCritico ? 'text-red-600' : 'text-gray-900'}`}>{ing.stock}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => ajustarStockManual(ing.id, -1)}
                        className="p-1.5 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-600 rounded transition-colors"
                        title="Restar 1 (Merma)"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => ajustarStockManual(ing.id, 1)}
                        className="p-1.5 bg-gray-100 hover:bg-green-100 hover:text-green-600 text-gray-600 rounded transition-colors"
                        title="Sumar 1 (Ajuste)"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    {isCritico ? (
                      <span className="text-red-600 font-bold text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> ¡Crítico!</span>
                    ) : (
                      <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Óptimo</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
