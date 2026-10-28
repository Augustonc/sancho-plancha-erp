import React, { useEffect, useState } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { onSnapshot } from 'firebase/firestore';
import { useTenant } from '../context/TenantContext';
import {
  getEmployeesRef, getShiftsRef, crearEmpleado as crearEmpleadoSrv,
  actualizarValorHora as actualizarValorHoraSrv, registrarJornada as registrarJornadaSrv,
  pagarJornada as pagarJornadaSrv, eliminarDocTenant
} from '../firebase/firebaseService';

export default function HRView() {
  const { tenantId } = useTenant();
  const [empleados, setEmpleados] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [notificacion, setNotificacion] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    const toList = (setter) => (snap) => setter(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    const unsubEmp = onSnapshot(getEmployeesRef(tenantId), toList(setEmpleados), err => console.error('Error cargando empleados:', err));
    const unsubJor = onSnapshot(getShiftsRef(tenantId), toList(setJornadas), err => console.error('Error cargando jornadas:', err));
    return () => { unsubEmp(); unsubJor(); };
  }, [tenantId]);

  const mostrarMensaje = (msj) => {
    setNotificacion(msj);
    setTimeout(() => setNotificacion(''), 3000);
  };

  const crearEmpleado = async (e) => {
    e.preventDefault();
    if (!tenantId) return;
    const nuevo = {
      nombre: e.target.nombre.value,
      valorHora: parseFloat(e.target.valorHora.value)
    };
    e.target.reset();
    await crearEmpleadoSrv(tenantId, nuevo);
    mostrarMensaje("Empleado registrado");
  };

  const actualizarValorHora = async (id, nuevoValor) => {
    const valor = parseFloat(nuevoValor);
    if (!tenantId || isNaN(valor) || valor <= 0) return;
    await actualizarValorHoraSrv(tenantId, id, valor);
    mostrarMensaje("Precio por hora actualizado");
  };

  const registrarJornada = async (e) => {
    e.preventDefault();
    if (!tenantId) return;

    const empleadoId = e.target.empleadoId.value;
    const horas = parseFloat(e.target.horas.value);
    const fechaElegida = e.target.fechaJornada.value;
    const empleado = empleados.find(emp => emp.id === empleadoId);
    if (!empleado || !horas) return;

    const nuevo = {
      empleadoId,
      fecha: new Date(fechaElegida + 'T12:00:00').toISOString(),
      horas,
      totalAPagar: horas * empleado.valorHora,
      pagado: false
    };

    e.target.reset();
    e.target.fechaJornada.value = new Date().toISOString().split('T')[0];

    await registrarJornadaSrv(tenantId, nuevo);
    mostrarMensaje("Jornada registrada");
  };

  const pagarJornada = async (id) => {
    if (!tenantId) return;
    await pagarJornadaSrv(tenantId, id);
    mostrarMensaje("Jornada pagada");
  };

  const eliminarDoc = async (coleccion, id) => {
    if (!tenantId) return;
    await eliminarDocTenant(tenantId, coleccion, id);
    mostrarMensaje("Elemento eliminado");
  };

  // Regla de negocio: una jornada ya liquidada no se puede borrar
  // (rompería el historial de pagos y el cálculo de sueldos pagados).
  const eliminarJornada = async (jornada) => {
    if (jornada.pagado) {
      mostrarMensaje("No se puede eliminar una jornada que ya fue pagada.");
      return;
    }
    await eliminarDoc('jornadas', jornada.id);
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
          <Users className="w-5 h-5 text-blue-500" /> Gestión de Personal
        </h2>

        <form onSubmit={crearEmpleado} className="flex flex-col sm:flex-row gap-3 mb-6">
          <input type="text" name="nombre" placeholder="Nombre del empleado" className="flex-1 p-2 border rounded" required />
          <input type="number" step="0.01" name="valorHora" placeholder="Valor por hora $" className="w-40 p-2 border rounded" required />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold">Agregar Empleado</button>
        </form>

        <div className="space-y-2">
          {empleados.map(emp => {
            const deudaAcumulada = jornadas
              .filter(j => j.empleadoId === emp.id && !j.pagado)
              .reduce((acc, j) => acc + j.totalAPagar, 0);

            return (
              <div key={emp.id} className="flex justify-between items-center bg-gray-50 p-3 rounded border">

                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-800">{emp.nombre}</span>
                  {deudaAcumulada > 0 ? (
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full border border-red-200">
                      Deuda: ${deudaAcumulada}
                    </span>
                  ) : (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full border border-green-200">
                      Al día
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">$/hora:</span>
                  <input
                    type="number"
                    defaultValue={emp.valorHora}
                    onBlur={(e) => actualizarValorHora(emp.id, e.target.value)}
                    className="w-24 p-1 border rounded text-right focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button onClick={() => eliminarDoc('empleados', emp.id)} className="text-red-500 hover:text-red-700 ml-2" title="Eliminar empleado">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {empleados.length === 0 && <p className="text-sm text-gray-500">No hay empleados registrados.</p>}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-500" /> Registro de Horas Trabajadas
        </h2>

        <form onSubmit={registrarJornada} className="flex flex-col sm:flex-row gap-4 items-end mb-8 bg-purple-50 p-4 rounded-lg border border-purple-100">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
            <select name="empleadoId" className="w-full p-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500" required>
              <option value="">Seleccionar empleado...</option>
              {empleados.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nombre} (${emp.valorHora}/hr)</option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Día de trabajo</label>
            <input
              type="date"
              name="fechaJornada"
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full p-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>

          <div className="w-full sm:w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Horas trab.</label>
            <input type="number" step="0.5" name="horas" className="w-full p-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500" required />
          </div>
          <button type="submit" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Registrar
          </button>
        </form>

        <h3 className="text-lg font-bold text-gray-800 mb-4">Liquidaciones Pendientes e Historial</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="p-3 font-medium">Fecha</th>
                <th className="p-3 font-medium">Empleado</th>
                <th className="p-3 font-medium">Horas</th>
                <th className="p-3 font-medium">Total a Pagar</th>
                <th className="p-3 font-medium">Estado</th>
                <th className="p-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {jornadas.map(j => (
                <tr key={j.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 text-sm">{new Date(j.fecha).toLocaleDateString()}</td>
                  <td className="p-3 font-medium text-gray-800">{empleados.find(e => e.id === j.empleadoId)?.nombre || 'Empleado Eliminado'}</td>
                  <td className="p-3 text-gray-600">{j.horas}h</td>
                  <td className="p-3 font-bold text-gray-900">${j.totalAPagar}</td>
                  <td className="p-3">
                    {j.pagado
                      ? <span className="text-green-600 text-sm font-bold">Pagado</span>
                      : <span className="text-red-600 text-sm font-bold">Pendiente</span>
                    }
                  </td>

                  <td className="p-3">
                    {!j.pagado && (
                      <button onClick={() => pagarJornada(j.id)} className="bg-gray-800 hover:bg-gray-900 text-white text-xs px-3 py-1 rounded font-medium">
                        Marcar Pagado
                      </button>
                    )}

                    <button
                      onClick={() => eliminarJornada(j)}
                      disabled={j.pagado}
                      className="text-red-500 hover:text-red-700 p-1 align-middle disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:text-gray-300"
                      title={j.pagado ? "No se puede eliminar una jornada pagada" : "Eliminar jornada"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </td>
                </tr>
              ))}
              {jornadas.length === 0 && (
                <tr><td colSpan="6" className="p-4 text-center text-gray-500">No hay jornadas registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
