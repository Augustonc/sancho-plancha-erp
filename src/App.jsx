import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Utensils, 
  Users, 
  Wallet, 
  Plus, 
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFl5q6u4WYsv60wOJk0-DJp4vtUYUBqgo",
  authDomain: "sancho-plancha.firebaseapp.com",
  projectId: "sancho-plancha",
  storageBucket: "sancho-plancha.firebasestorage.app",
  messagingSenderId: "112778410330",
  appId: "1:112778410330:web:0ddaeb69f8b1f7b7ce5b63"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- DATOS INICIALES (MOCK DATA) ---
// Simulamos una base de datos inicial para que puedas probar el sistema inmediatamente.
const INITIAL_INGREDIENTS = [
  { id: '1', nombre: 'Pan de Hamburguesa', unidad: 'unidades', costo: 150, stock: 50, stockMinimo: 20 },
  { id: '2', nombre: 'Medallón de Carne', unidad: 'unidades', costo: 400, stock: 40, stockMinimo: 15 },
  { id: '3', nombre: 'Pan de pancho/choripán', unidad: 'unidades', costo: 120, stock: 30, stockMinimo: 10 },
  { id: '4', nombre: 'Chorizo', unidad: 'unidades', costo: 300, stock: 25, stockMinimo: 10 },
  { id: '5', nombre: 'Aderezos', unidad: 'gramos', costo: 2, stock: 5000, stockMinimo: 1000 },
  { id: '6', nombre: 'Lechuga', unidad: 'gramos', costo: 1.5, stock: 2000, stockMinimo: 500 },
  { id: '7', nombre: 'Tomate', unidad: 'gramos', costo: 2.5, stock: 3000, stockMinimo: 1000 },
];

const INITIAL_PRODUCTS = [
  { 
    id: '1', 
    nombre: 'Hamburguesa Completa', 
    precioVenta: 2500, 
    receta: [
      { ingredienteId: '1', cantidad: 1 }, // 1 Pan
      { ingredienteId: '2', cantidad: 1 }, // 1 Carne
      { ingredienteId: '5', cantidad: 50 }, // 50g aderezo
      { ingredienteId: '6', cantidad: 30 }, // 30g lechuga
      { ingredienteId: '7', cantidad: 50 }, // 50g tomate
    ] 
  },
  { 
    id: '2', 
    nombre: 'Choripán Especial', 
    precioVenta: 1800, 
    receta: [
      { ingredienteId: '3', cantidad: 1 }, // 1 Pan
      { ingredienteId: '4', cantidad: 2 }, // 2 Chorizos (como pediste en el ejemplo)
      { ingredienteId: '5', cantidad: 80 }, // 80g aderezo
      { ingredienteId: '6', cantidad: 20 }, // 20g lechuga
      { ingredienteId: '7', cantidad: 40 }, // 40g tomate
    ] 
  }
];

const INITIAL_EMPLOYEES = [
  { id: '1', nombre: 'Juan Pérez', valorHora: 1500 }
];

export default function App() {
  // --- ESTADOS GLOBALES ---
  const [activeTab, setActiveTab] = useState('pos');
  const [user, setUser] = useState(null);
  
  const [ingredientes, setIngredientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [deudas, setDeudas] = useState([]);

  // --- CARRITO DE VENTAS (POS) ---
  const [carrito, setCarrito] = useState([]);

  // --- EFECTOS FIREBASE ---
  React.useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!user) return;
    
    const path = (colName) => collection(db, 'artifacts', appId, 'users', user.uid, colName);
    
    const sub = (colName, setter) => onSnapshot(path(colName), 
      (snap) => setter(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (err) => console.error(err)
    );

    const unsubs = [
      sub('ingredientes', setIngredientes),
      sub('productos', setProductos),
      sub('ventas', setVentas),
      sub('empleados', setEmpleados),
      sub('jornadas', setJornadas),
      sub('gastos', setGastos),
      sub('deudas', setDeudas)
    ];

    return () => unsubs.forEach(u => u());
  }, [user]);

  // Función para sembrar datos iniciales si la DB está vacía
  const cargarDatosDePrueba = async () => {
    if (!user) return;
    const promises = [];
    INITIAL_INGREDIENTS.forEach(ing => promises.push(setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'ingredientes', ing.id), ing)));
    INITIAL_PRODUCTS.forEach(prod => promises.push(setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'productos', prod.id), prod)));
    INITIAL_EMPLOYEES.forEach(emp => promises.push(setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'empleados', emp.id), emp)));
    promises.push(setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'deudas', '1'), { proveedor: 'Carnicería Don Tito', monto: 15000, pagado: false, fecha: new Date().toISOString() }));
    await Promise.all(promises);
    alert("¡Datos de prueba cargados con éxito en la nube!");
  };

  // --- FUNCIONES DE LÓGICA DE NEGOCIO ---

  const calcularCostoReceta = (receta) => {
    return receta.reduce((total, itemReceta) => {
      const ingrediente = ingredientes.find(i => i.id === itemReceta.ingredienteId);
      return total + (ingrediente ? ingrediente.costo * itemReceta.cantidad : 0);
    }, 0);
  };

  const agregarAlCarrito = (producto) => {
    setCarrito([...carrito, producto]);
  };

  const procesarVenta = async () => {
    if (carrito.length === 0 || !user) return;

    let totalIngreso = 0;
    let totalCostoMateriaPrima = 0;
    const ingredientesAActualizar = {};

    // Procesar cada ítem del carrito
    carrito.forEach(producto => {
      const costoReceta = calcularCostoReceta(producto.receta);
      totalIngreso += producto.precioVenta;
      totalCostoMateriaPrima += costoReceta;

      // Preparar descuentos de stock
      producto.receta.forEach(itemReceta => {
        const iId = itemReceta.ingredienteId;
        if (ingredientesAActualizar[iId] === undefined) {
          const ingActual = ingredientes.find(i => i.id === iId);
          ingredientesAActualizar[iId] = ingActual ? ingActual.stock : 0;
        }
        ingredientesAActualizar[iId] -= itemReceta.cantidad;
      });
    });

    const gananciaNetaTransaccion = totalIngreso - totalCostoMateriaPrima;

    // Escribir en Firestore
    const ventaData = {
      fecha: new Date().toISOString(),
      items: carrito,
      totalIngreso,
      totalCosto: totalCostoMateriaPrima,
      gananciaNeta: gananciaNetaTransaccion
    };

    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'ventas'), ventaData);
      
      // Actualizar inventario en la base de datos
      for (const [id, nuevoStock] of Object.entries(ingredientesAActualizar)) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'ingredientes', id), { stock: nuevoStock });
      }

      setCarrito([]); // Limpiar carrito local
      alert(`¡Venta registrada en la nube!\nIngreso: $${totalIngreso}\nCosto: $${totalCostoMateriaPrima}\nGanancia Neta: $${gananciaNetaTransaccion}`);
    } catch (error) {
      console.error("Error al procesar la venta:", error);
      alert("Hubo un error al guardar la venta.");
    }
  };

  const registrarJornada = async (e) => {
    e.preventDefault();
    if (!user) return;
    const empleadoId = e.target.empleadoId.value; // Ya es string
    const horas = parseFloat(e.target.horas.value);
    const empleado = empleados.find(emp => emp.id === empleadoId);
    
    if (empleado && horas) {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'jornadas'), {
        empleadoId,
        fecha: new Date().toISOString(),
        horas,
        totalAPagar: horas * empleado.valorHora,
        pagado: false
      });
      e.target.reset();
    }
  };

  const pagarJornada = async (id) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'jornadas', id), { pagado: true });
  };

  const registrarGasto = async (e) => {
    e.preventDefault();
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'gastos'), {
      descripcion: e.target.descripcion.value,
      monto: parseFloat(e.target.monto.value),
      fecha: new Date().toISOString()
    });
    e.target.reset();
  };

  const registrarDeuda = async (e) => {
    e.preventDefault();
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'deudas'), {
      proveedor: e.target.proveedor.value,
      monto: parseFloat(e.target.monto.value),
      fecha: new Date().toISOString(),
      pagado: false
    });
    e.target.reset();
  };

  const pagarDeuda = async (id) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'deudas', id), { pagado: true });
  };


  // --- CÁLCULOS GLOBALES (DASHBOARD) ---
  const stats = useMemo(() => {
    const ventasTotales = ventas.reduce((acc, v) => acc + v.totalIngreso, 0);
    const costoMateriaPrima = ventas.reduce((acc, v) => acc + v.totalCosto, 0);
    const sueldosPagados = jornadas.filter(j => j.pagado).reduce((acc, j) => acc + j.totalAPagar, 0);
    const sueldosPendientes = jornadas.filter(j => !j.pagado).reduce((acc, j) => acc + j.totalAPagar, 0);
    const gastosOperativos = gastos.reduce((acc, g) => acc + g.monto, 0);
    const deudasPagadas = deudas.filter(d => d.pagado).reduce((acc, d) => acc + d.monto, 0);
    const deudasPendientes = deudas.filter(d => !d.pagado).reduce((acc, d) => acc + d.monto, 0);

    // Ganancia Neta = Ingresos - (Costo Materia Prima + Sueldos Pagados + Gastos Operativos + Deudas Pagadas)
    const gananciaNeta = ventasTotales - (costoMateriaPrima + sueldosPagados + gastosOperativos + deudasPagadas);

    return {
      ventasTotales,
      costoMateriaPrima,
      sueldosPagados,
      sueldosPendientes,
      gastosOperativos,
      deudasPendientes,
      gananciaNeta
    };
  }, [ventas, jornadas, gastos, deudas]);


  // --- COMPONENTES DE VISTAS ---

  const ViewDashboard = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Resumen General (Resultados)</h2>
        {ingredientes.length === 0 && (
          <button onClick={cargarDatosDePrueba} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow transition-colors text-sm">
            Cargar Datos Iniciales a Nube
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta Ganancia Neta */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium opacity-90">Ganancia Neta (Caja Real)</h3>
            <DollarSign className="w-8 h-8 opacity-70" />
          </div>
          <p className="text-4xl font-bold mt-4">${stats.gananciaNeta.toLocaleString()}</p>
          <p className="text-sm mt-2 opacity-80">Lo que te queda en el bolsillo</p>
        </div>

        {/* Tarjeta Ventas Totales */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <div className="flex justify-between items-center text-gray-500">
            <h3 className="text-lg font-medium">Ingresos por Ventas</h3>
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-4">${stats.ventasTotales.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-2">{ventas.length} ventas registradas</p>
        </div>

        {/* Tarjeta Costos Totales */}
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
         {/* Alertas de Liquidez y Deudas */}
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

        {/* Últimas Ventas */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 overflow-y-auto max-h-64">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Últimas Ventas</h3>
          {ventas.length === 0 ? (
            <p className="text-gray-500 italic">No hay ventas registradas aún.</p>
          ) : (
            <div className="space-y-3">
              {[...ventas].reverse().slice(0, 5).map(v => (
                <div key={v.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{v.items.length} ítems vendidos</p>
                    <p className="text-xs text-gray-500">{new Date(v.fecha).toLocaleTimeString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">+${v.totalIngreso}</p>
                    <p className="text-xs text-gray-500">Neta: ${v.gananciaNeta}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const ViewPOS = () => (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Menú de Productos */}
      <div className="flex-1 bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Utensils className="w-6 h-6 text-orange-500" /> Vender Producto
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {productos.map(prod => (
            <button 
              key={prod.id}
              onClick={() => agregarAlCarrito(prod)}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all text-left group"
            >
              <h3 className="text-lg font-bold text-gray-800 group-hover:text-orange-600">{prod.nombre}</h3>
              <p className="text-2xl font-black text-gray-900 mt-2">${prod.precioVenta}</p>
              <p className="text-xs text-gray-500 mt-1">Costo aprox: ${calcularCostoReceta(prod.receta)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Carrito */}
      <div className="w-full md:w-96 bg-gray-50 p-6 rounded-xl shadow-md border border-gray-200 flex flex-col">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-gray-600" /> Pedido Actual
        </h2>
        
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {carrito.length === 0 ? (
            <p className="text-gray-400 text-center mt-10">El carrito está vacío</p>
          ) : (
            carrito.map((item, index) => (
              <div key={index} className="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-gray-100">
                <span className="font-medium text-gray-800">{item.nombre}</span>
                <span className="font-bold text-gray-600">${item.precioVenta}</span>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-medium text-gray-600">Total:</span>
            <span className="text-3xl font-black text-gray-900">
              ${carrito.reduce((acc, item) => acc + item.precioVenta, 0).toLocaleString()}
            </span>
          </div>
          <button 
            onClick={procesarVenta}
            disabled={carrito.length === 0}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl transition-colors text-lg"
          >
            Cobrar y Descontar Stock
          </button>
        </div>
      </div>
    </div>
  );

  const ViewInventory = () => (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Package className="w-6 h-6 text-blue-500" /> Inventario y Stock
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <th className="p-3 font-medium">Ingrediente</th>
              <th className="p-3 font-medium">Unidad</th>
              <th className="p-3 font-medium">Costo Unit.</th>
              <th className="p-3 font-medium">Stock Actual</th>
              <th className="p-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {ingredientes.map(ing => (
              <tr key={ing.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="p-3 font-medium text-gray-800">{ing.nombre}</td>
                <td className="p-3 text-gray-500">{ing.unidad}</td>
                <td className="p-3 text-gray-600">${ing.costo}</td>
                <td className="p-3 font-bold text-gray-900">{ing.stock}</td>
                <td className="p-3">
                  {ing.stock <= ing.stockMinimo ? (
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
                      <AlertCircle className="w-3 h-3" /> ¡Comprar! (Min: {ing.stockMinimo})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Óptimo
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const ViewHR = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-500" /> Recursos Humanos (Horas Trabajadas)
        </h2>
        
        <form onSubmit={registrarJornada} className="flex flex-col sm:flex-row gap-4 items-end mb-8 bg-purple-50 p-4 rounded-lg border border-purple-100">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
            <select name="empleadoId" className="w-full p-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500" required>
              {empleados.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nombre} (${emp.valorHora}/hr)</option>
              ))}
            </select>
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
                  <td className="p-3 font-medium text-gray-800">{empleados.find(e => e.id === j.empleadoId)?.nombre}</td>
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

  const ViewFinance = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Módulo de Deudas / Fiado */}
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
              <div className="text-right flex items-center gap-4">
                <span className={`font-black text-lg ${d.pagado ? 'text-gray-400' : 'text-red-600'}`}>${d.monto}</span>
                {!d.pagado && (
                  <button onClick={() => pagarDeuda(d.id)} className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded font-bold transition-colors">
                    Pagar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Módulo de Gastos Varios */}
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
              <span className="font-bold text-gray-600">${g.monto}</span>
            </div>
          ))}
          {gastos.length === 0 && <p className="text-gray-500 text-sm">No hay gastos registrados.</p>}
        </div>
      </div>
    </div>
  );


  // --- LAYOUT PRINCIPAL ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
         <div className="text-center">
           <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
           <p className="text-gray-600 font-bold animate-pulse">Conectando a la nube segura...</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR NAVEGACIÓN */}
      <nav className="w-full md:w-64 bg-gray-900 text-gray-300 p-4 flex flex-col gap-2 shadow-2xl z-10">
        <div className="px-4 py-6 mb-4">
          <h1 className="text-2xl font-black text-white tracking-tight">
            SANCHO<span className="text-orange-500">PLANCHA</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Control & ERP</p>
        </div>

        <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors font-medium ${activeTab === 'dashboard' ? 'bg-orange-500 text-white' : 'hover:bg-gray-800 hover:text-white'}`}>
          <LayoutDashboard className="w-5 h-5" /> Dashboard
        </button>
        <button onClick={() => setActiveTab('pos')} className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors font-medium ${activeTab === 'pos' ? 'bg-orange-500 text-white' : 'hover:bg-gray-800 hover:text-white'}`}>
          <ShoppingCart className="w-5 h-5" /> Punto de Venta
        </button>
        <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors font-medium ${activeTab === 'inventory' ? 'bg-orange-500 text-white' : 'hover:bg-gray-800 hover:text-white'}`}>
          <Package className="w-5 h-5" /> Inventario
        </button>
        <button onClick={() => setActiveTab('hr')} className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors font-medium ${activeTab === 'hr' ? 'bg-orange-500 text-white' : 'hover:bg-gray-800 hover:text-white'}`}>
          <Users className="w-5 h-5" /> Empleados
        </button>
        <button onClick={() => setActiveTab('finance')} className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors font-medium ${activeTab === 'finance' ? 'bg-orange-500 text-white' : 'hover:bg-gray-800 hover:text-white'}`}>
          <Wallet className="w-5 h-5" /> Finanzas y Fiado
        </button>
      </nav>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <ViewDashboard />}
          {activeTab === 'pos' && <ViewPOS />}
          {activeTab === 'inventory' && <ViewInventory />}
          {activeTab === 'hr' && <ViewHR />}
          {activeTab === 'finance' && <ViewFinance />}
        </div>
      </main>

    </div>
  );
}
