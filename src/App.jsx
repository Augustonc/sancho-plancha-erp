import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, ShoppingCart, Package, Utensils, 
  Users, Wallet, Plus, AlertCircle, CheckCircle2,
  TrendingUp, TrendingDown, DollarSign, Settings, Trash2
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [notificacion, setNotificacion] = useState('');
  
  const [ingredientes, setIngredientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [empleados, setEmpleados] = useState([{ id: 'emp1', nombre: 'Juan Pérez', valorHora: 1500 }]);
  const [jornadas, setJornadas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [deudas, setDeudas] = useState([]);

  const [carrito, setCarrito] = useState([]);
  
  // Estado para armar recetas nuevas en el panel de administración
  const [recetaTemp, setRecetaTemp] = useState([]);

  useEffect(() => {
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

  useEffect(() => {
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
      sub('jornadas', setJornadas),
      sub('gastos', setGastos),
      sub('deudas', setDeudas)
    ];
    return () => unsubs.forEach(u => u());
  }, [user]);

  const mostrarMensaje = (msj) => {
    setNotificacion(msj);
    setTimeout(() => setNotificacion(''), 4000);
  };

  // --- LÓGICA CORE Y VENTAS ---

  const calcularCostoReceta = (receta) => {
    return receta.reduce((total, itemReceta) => {
      const ingrediente = ingredientes.find(i => i.id === itemReceta.ingredienteId);
      return total + (ingrediente ? ingrediente.costo * itemReceta.cantidad : 0);
    }, 0);
  };

  const procesarVenta = async () => {
    if (carrito.length === 0 || !user) return;
    let totalIngreso = 0;
    let totalCosto = 0;
    const ingredientesAActualizar = {};

    carrito.forEach(producto => {
      totalIngreso += producto.precioVenta;
      totalCosto += calcularCostoReceta(producto.receta);
      producto.receta.forEach(item => {
        if (ingredientesAActualizar[item.ingredienteId] === undefined) {
          const ing = ingredientes.find(i => i.id === item.ingredienteId);
          ingredientesAActualizar[item.ingredienteId] = ing ? ing.stock : 0;
        }
        ingredientesAActualizar[item.ingredienteId] -= item.cantidad;
      });
    });

    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'ventas'), {
        fecha: new Date().toISOString(),
        items: carrito,
        totalIngreso,
        totalCosto,
        gananciaNeta: totalIngreso - totalCosto
      });
      
      for (const [id, nuevoStock] of Object.entries(ingredientesAActualizar)) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'ingredientes', id), { stock: nuevoStock });
      }

      setCarrito([]);
      mostrarMensaje(`¡Venta registrada! Ganancia neta: $${totalIngreso - totalCosto}`);
    } catch (error) {
      mostrarMensaje("Error al procesar la venta.");
    }
  };

  // --- LÓGICA DE ADMINISTRACIÓN Y CATÁLOGO ---

  const crearIngrediente = async (e) => {
    e.preventDefault();
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'ingredientes'), {
      nombre: e.target.nombre.value,
      unidad: e.target.unidad.value,
      costo: parseFloat(e.target.costo.value),
      stock: parseFloat(e.target.stock.value),
      stockMinimo: parseFloat(e.target.stockMinimo.value)
    });
    e.target.reset();
    mostrarMensaje("Ingrediente creado con éxito");
  };

  const eliminarDoc = async (coleccion, id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, coleccion, id));
    mostrarMensaje("Elemento eliminado");
  };

  const agregarItemReceta = (e) => {
    e.preventDefault();
    const ingredienteId = e.target.ingredienteId.value;
    const cantidad = parseFloat(e.target.cantidad.value);
    const ing = ingredientes.find(i => i.id === ingredienteId);
    if (ing && cantidad > 0) {
      setRecetaTemp([...recetaTemp, { ingredienteId, nombre: ing.nombre, cantidad, costoParcial: ing.costo * cantidad }]);
      e.target.reset();
    }
  };

  const crearProducto = async (e) => {
    e.preventDefault();
    if (!user || recetaTemp.length === 0) {
      mostrarMensaje("Agrega al menos un ingrediente a la receta.");
      return;
    }
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'productos'), {
      nombre: e.target.nombre.value,
      precioVenta: parseFloat(e.target.precioVenta.value),
      receta: recetaTemp.map(r => ({ ingredienteId: r.ingredienteId, cantidad: r.cantidad }))
    });
    e.target.reset();
    setRecetaTemp([]);
    mostrarMensaje("Producto guardado con éxito");
  };

  const ingresarMercaderia = async (e) => {
    e.preventDefault();
    if (!user) return;
    const ingId = e.target.ingredienteId.value;
    const cantidadComprada = parseFloat(e.target.cantidad.value);
    const nuevoCosto = parseFloat(e.target.nuevoCosto.value);
    
    const ingActual = ingredientes.find(i => i.id === ingId);
    if(ingActual) {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'ingredientes', ingId), {
        stock: ingActual.stock + cantidadComprada,
        costo: nuevoCosto || ingActual.costo
      });
      e.target.reset();
      mostrarMensaje("Stock y costo actualizados");
    }
  };

  // --- LÓGICA DE RRHH Y FINANZAS ---

  const registrarJornada = async (e) => {
    e.preventDefault();
    if (!user) return;
    const empleadoId = e.target.empleadoId.value;
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
      mostrarMensaje("Jornada registrada");
    }
  };

  const pagarJornada = async (id) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'jornadas', id), { pagado: true });
    mostrarMensaje("Jornada pagada");
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
    mostrarMensaje("Gasto registrado");
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
    mostrarMensaje("Deuda registrada");
  };

  const pagarDeuda = async (id) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'deudas', id), { pagado: true });
    mostrarMensaje("Deuda saldada");
  };

  // --- CÁLCULOS DEL DASHBOARD ---

  const stats = useMemo(() => {
    const ventasTotales = ventas.reduce((acc, v) => acc + v.totalIngreso, 0);
    const costoMateriaPrima = ventas.reduce((acc, v) => acc + v.totalCosto, 0);
    const sueldosPagados = jornadas.filter(j => j.pagado).reduce((acc, j) => acc + j.totalAPagar, 0);
    const sueldosPendientes = jornadas.filter(j => !j.pagado).reduce((acc, j) => acc + j.totalAPagar, 0);
    const gastosOperativos = gastos.reduce((acc, g) => acc + g.monto, 0);
    const deudasPagadas = deudas.filter(d => d.pagado).reduce((acc, d) => acc + d.monto, 0);
    const deudasPendientes = deudas.filter(d => !d.pagado).reduce((acc, d) => acc + d.monto, 0);

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

  // --- VISTAS ---

  const ViewDashboard = () => (
    <div className="space-y-6">
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
          <p className="text-sm text-gray-500 mt-2">{ventas.length} ventas registradas</p>
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

  const ViewCatalog = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" /> Crear Nuevo Ingrediente (Materia Prima)
        </h2>
        <form onSubmit={crearIngrediente} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input type="text" name="nombre" placeholder="Nombre (Ej. Pan)" className="p-2 border rounded" required />
          <select name="unidad" className="p-2 border rounded" required>
            <option value="unidades">Unidades</option>
            <option value="gramos">Gramos</option>
            <option value="litros">Litros</option>
          </select>
          <input type="number" step="0.01" name="costo" placeholder="Costo Unitario $" className="p-2 border rounded" required />
          <input type="number" step="0.01" name="stock" placeholder="Stock Inicial" className="p-2 border rounded" required />
          <input type="number" step="0.01" name="stockMinimo" placeholder="Stock Mínimo" className="p-2 border rounded" required />
          <button type="submit" className="sm:col-span-5 bg-blue-600 text-white font-bold py-2 rounded">Guardar Ingrediente</button>
        </form>

        <div className="mt-6">
          <h3 className="font-bold text-gray-700 mb-2">Ingredientes Actuales en BD:</h3>
          <div className="flex flex-wrap gap-2">
            {ingredientes.map(ing => (
              <span key={ing.id} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2 border">
                {ing.nombre} (${ing.costo}) 
                <button onClick={() => eliminarDoc('ingredientes', ing.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4"/></button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Utensils className="w-5 h-5 text-orange-500" /> Armar Nuevo Producto (Para Vender)
        </h2>
        
        <div className="bg-orange-50 p-4 rounded-lg mb-6 border border-orange-100">
          <h3 className="font-medium text-orange-800 mb-2">1. Añadir ingredientes a la receta:</h3>
          <form onSubmit={agregarItemReceta} className="flex gap-2">
            <select name="ingredienteId" className="flex-1 p-2 border rounded" required>
              <option value="">Selecciona un ingrediente...</option>
              {ingredientes.map(ing => <option key={ing.id} value={ing.id}>{ing.nombre} (Medida en {ing.unidad})</option>)}
            </select>
            <input type="number" step="0.01" name="cantidad" placeholder="Cantidad usada" className="w-32 p-2 border rounded" required />
            <button type="submit" className="bg-orange-500 text-white px-4 rounded font-bold">Añadir</button>
          </form>
          
          <ul className="mt-3 space-y-1">
            {recetaTemp.map((item, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex justify-between bg-white p-2 rounded border">
                <span>{item.cantidad}x {item.nombre}</span>
                <span className="font-medium text-orange-600">Costo: ${item.costoParcial}</span>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={crearProducto} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" name="nombre" placeholder="Nombre del Producto (Ej. Super Hamburguesa)" className="sm:col-span-2 p-2 border rounded text-lg font-medium" required />
          <input type="number" name="precioVenta" placeholder="Precio de Venta al Público $" className="p-2 border rounded text-lg font-bold text-green-700" required />
          <button type="submit" className="sm:col-span-3 bg-green-600 text-white font-bold py-3 rounded text-lg">Guardar Producto en Catálogo</button>
        </form>

        <div className="mt-6">
          <h3 className="font-bold text-gray-700 mb-2">Productos a la venta:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {productos.map(prod => (
              <div key={prod.id} className="bg-gray-50 p-3 rounded border text-sm flex justify-between items-start">
                <div>
                  <p className="font-bold">{prod.nombre}</p>
                  <p className="text-green-600 font-medium">${prod.precioVenta}</p>
                </div>
                <button onClick={() => eliminarDoc('productos', prod.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const ViewInventory = () => (
    <div className="space-y-6">
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
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold">Actualizar Stock</button>
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
              <th className="p-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {ingredientes.map(ing => (
              <tr key={ing.id} className="border-b border-gray-100">
                <td className="p-3 font-medium">{ing.nombre} <span className="text-xs text-gray-400">({ing.unidad})</span></td>
                <td className="p-3 text-gray-600">${ing.costo}</td>
                <td className="p-3 font-bold text-gray-900">{ing.stock}</td>
                <td className="p-3">
                  {ing.stock <= ing.stockMinimo ? (
                    <span className="text-red-600 font-bold text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> ¡Comprar!</span>
                  ) : (
                    <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Óptimo</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const ViewPOS = () => (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      <div className="flex-1 bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Utensils className="w-6 h-6 text-orange-500" /> Vender Producto
        </h2>
        {productos.length === 0 ? (
          <p className="text-gray-500">Ve a "Catálogo y Precios" para crear tus productos.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos.map(prod => (
              <button key={prod.id} onClick={() => setCarrito([...carrito, prod])} className="p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 transition-all text-left">
                <h3 className="text-lg font-bold text-gray-800">{prod.nombre}</h3>
                <p className="text-2xl font-black text-gray-900 mt-2">${prod.precioVenta}</p>
                <p className="text-xs text-gray-500 mt-1">Costo: ${calcularCostoReceta(prod.receta)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-full md:w-96 bg-gray-50 p-6 rounded-xl shadow-md border border-gray-200 flex flex-col">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Pedido Actual</h2>
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-[200px]">
          {carrito.map((item, index) => (
            <div key={index} className="flex justify-between items-center bg-white p-3 rounded border">
              <span className="font-medium">{item.nombre}</span>
              <span className="font-bold">${item.precioVenta}</span>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-medium text-gray-600">Total:</span>
            <span className="text-3xl font-black text-gray-900">${carrito.reduce((acc, item) => acc + item.precioVenta, 0)}</span>
          </div>
          <button onClick={procesarVenta} disabled={carrito.length === 0} className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl text-lg">
            Cobrar y Descontar Stock
          </button>
        </div>
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans relative">
      {notificacion && (
        <div className="absolute top-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-2xl z-50 animate-bounce">
          {notificacion}
        </div>
      )}
      <nav className="w-full md:w-64 bg-gray-900 text-gray-300 p-4 flex flex-col gap-2 shadow-2xl z-10">
        <div className="px-4 py-6 mb-4">
          <h1 className="text-2xl font-black text-white tracking-tight">SANCHO<span className="text-orange-500">PLANCHA</span></h1>
        </div>
        {[
          { id: 'dashboard', icon: LayoutDashboard, text: 'Dashboard' },
          { id: 'pos', icon: ShoppingCart, text: 'Punto de Venta' },
          { id: 'inventory', icon: Package, text: 'Inventario y Compras' },
          { id: 'catalog', icon: Settings, text: 'Catálogo y Precios' },
          { id: 'hr', icon: Users, text: 'Empleados' },
          { id: 'finance', icon: Wallet, text: 'Finanzas y Fiado' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 p-3 rounded-lg text-left font-medium ${activeTab === tab.id ? 'bg-orange-500 text-white' : 'hover:bg-gray-800'}`}>
            <tab.icon className="w-5 h-5" /> {tab.text}
          </button>
        ))}
      </nav>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <ViewDashboard />}
          {activeTab === 'pos' && <ViewPOS />}
          {activeTab === 'inventory' && <ViewInventory />}
          {activeTab === 'catalog' && <ViewCatalog />}
          {activeTab === 'hr' && <ViewHR />}
          {activeTab === 'finance' && <ViewFinance />}
        </div>
      </main>
    </div>
  );
}
