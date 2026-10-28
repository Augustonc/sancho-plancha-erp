import React, { useState, useEffect } from 'react';
import { Settings, Utensils, Trash2 } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { onSnapshot } from 'firebase/firestore';
import { getProductsRef, getIngredientsRef, guardarProducto, eliminarProducto, guardarIngrediente, eliminarIngrediente } from '../firebase/firebaseService';

export default function CatalogView() {
  const { tenantId } = useTenant();
  const [ingredientes, setIngredientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [recetaTemp, setRecetaTemp] = useState([]);

  useEffect(() => {
    if (!tenantId) return;
    const unsubProd = onSnapshot(getProductsRef(tenantId), snap => {
      setProductos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubIng = onSnapshot(getIngredientsRef(tenantId), snap => {
      setIngredientes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubProd(); unsubIng(); };
  }, [tenantId]);

  const handleCrearIngrediente = async (e) => {
    e.preventDefault();
    if (!tenantId) return;
    const nuevo = {
      nombre: e.target.nombre.value,
      unidad: e.target.unidad.value,
      costo: parseFloat(e.target.costo.value),
      stock: parseFloat(e.target.stock.value),
      stockMinimo: parseFloat(e.target.stockMinimo.value)
    };
    await guardarIngrediente(tenantId, nuevo);
    e.target.reset();
  };

  const handleAgregarItemReceta = (e) => {
    e.preventDefault();
    const ingId = e.target.ingredienteId.value;
    const cantidad = parseFloat(e.target.cantidad.value);
    const ingActual = ingredientes.find(i => i.id === ingId);

    if (ingActual) {
      setRecetaTemp([...recetaTemp, {
        ingredienteId: ingId,
        nombre: ingActual.nombre,
        cantidad,
        costoParcial: ingActual.costo * cantidad
      }]);
      e.target.reset();
    }
  };

  const handleCrearProducto = async (e) => {
    e.preventDefault();
    if (!tenantId) return;
    const nuevoProd = {
      nombre: e.target.nombre.value,
      precioVenta: parseFloat(e.target.precioVenta.value),
      categoria: e.target.categoria?.value || 'General',
      receta: recetaTemp
    };
    await guardarProducto(tenantId, nuevoProd);
    e.target.reset();
    setRecetaTemp([]);
  };

  const calcularCostoReceta = (receta) => {
    if (!receta || receta.length === 0) return 0;
    return receta.reduce((total, item) => {
      const ing = ingredientes.find(i => i.id === item.ingredienteId);
      return total + (ing ? ing.costo * item.cantidad : 0);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" /> Crear Nuevo Ingrediente (Materia Prima)
        </h2>
        <form onSubmit={handleCrearIngrediente} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input type="text" name="nombre" placeholder="Nombre (Ej. Pan)" className="p-2 border rounded" required />
          <select name="unidad" className="p-2 border rounded" required>
            <option value="unidades">Unidades</option>
            <option value="gramos">Gramos</option>
            <option value="litros">Litros</option>
          </select>
          <input type="number" step="0.01" name="costo" placeholder="Costo Unitario $" className="p-2 border rounded" required />
          <input type="number" step="0.01" name="stock" placeholder="Stock Inicial" className="p-2 border rounded" required />
          <input type="number" step="0.01" name="stockMinimo" placeholder="Stock Mínimo" className="p-2 border rounded" required />
          <button type="submit" className="sm:col-span-5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition-colors">Guardar Ingrediente</button>
        </form>

        <div className="mt-6">
          <h3 className="font-bold text-gray-700 mb-2">Ingredientes Actuales en BD:</h3>
          <div className="flex flex-wrap gap-2">
            {ingredientes.map(ing => (
              <span key={ing.id} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2 border shadow-sm">
                {ing.nombre} (${ing.costo}) 
                <button onClick={() => tenantId && eliminarIngrediente(tenantId, ing.id)} className="text-red-500 hover:text-red-700 ml-2"><Trash2 className="w-4 h-4"/></button>
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
          <form onSubmit={handleAgregarItemReceta} className="flex gap-2">
            <select name="ingredienteId" className="flex-1 p-2 border rounded" required>
              <option value="">Selecciona un ingrediente...</option>
              {ingredientes.map(ing => <option key={ing.id} value={ing.id}>{ing.nombre} (Medida en {ing.unidad})</option>)}
            </select>
            <input type="number" step="0.001" name="cantidad" placeholder="Cantidad usada (ej. 0.2)" className="w-40 p-2 border rounded" required />
            <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 rounded font-bold transition-colors">Añadir</button>
          </form>
          
          <ul className="mt-3 space-y-1">
            {recetaTemp.map((item, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex justify-between bg-white p-2 rounded border shadow-sm">
                <span>{item.cantidad}x {item.nombre}</span>
                <span className="font-medium text-orange-600">Costo: ${item.costoParcial.toFixed(2)}</span>
              </li>
            ))}
            {recetaTemp.length > 0 && (
              <li className="text-sm font-bold text-gray-900 flex justify-between bg-orange-100 p-2 rounded mt-2">
                <span>Costo Total Receta:</span>
                <span>${recetaTemp.reduce((acc, curr) => acc + curr.costoParcial, 0).toFixed(2)}</span>
              </li>
            )}
          </ul>
        </div>

        <form onSubmit={handleCrearProducto} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input type="text" name="nombre" placeholder="Nombre del Producto (Ej. Super Hamburguesa)" className="sm:col-span-2 p-2 border rounded text-lg font-medium" required />
          <input type="text" name="categoria" placeholder="Categoría (Ej. Bebidas)" className="p-2 border rounded text-lg" required />
          <input type="number" name="precioVenta" placeholder="Precio Venta $" className="p-2 border rounded text-lg font-bold text-green-700" required />
          <button type="submit" className="sm:col-span-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded text-lg transition-colors shadow-sm">Guardar Producto en Catálogo</button>
        </form>

        <div className="mt-8">
          <h3 className="font-bold text-gray-700 mb-4 text-lg">Catálogo / Rentabilidad:</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {productos.map(prod => {
              const costoReceta = calcularCostoReceta(prod.receta);
              const margen = prod.precioVenta - costoReceta;
              const margenPorcentaje = costoReceta > 0 ? ((margen / costoReceta) * 100).toFixed(1) : 100;
              const esRentable = margen > 0;

              return (
                <div key={prod.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-start shadow-sm hover:border-gray-300 transition-colors">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-lg text-gray-800">{prod.nombre}</p>
                    <p className="text-sm text-gray-500 mb-2">Categoría: {prod.categoria || 'General'}</p>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-white p-2 rounded border border-gray-100">
                      <span className="text-gray-600">Precio Venta:</span>
                      <span className="font-bold text-gray-900">${prod.precioVenta}</span>
                      
                      <span className="text-gray-600">Costo Receta:</span>
                      <span className="font-medium text-orange-600">${costoReceta.toFixed(2)}</span>
                      
                      <span className="text-gray-600 mt-1">Margen / Ganancia:</span>
                      <span className={`font-black mt-1 ${esRentable ? 'text-green-600' : 'text-red-600'}`}>
                        ${margen.toFixed(2)} ({margenPorcentaje}%)
                      </span>
                    </div>
                  </div>
                  <button onClick={() => tenantId && eliminarProducto(tenantId, prod.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5"/>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
