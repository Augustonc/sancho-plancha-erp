import React, { useState, useEffect } from 'react';
import { Utensils, Trash2, Loader2, Printer, CheckCircle2, X, Plus, Minus, Banknote, CreditCard, Smartphone, Calculator } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { onSnapshot } from 'firebase/firestore';
import { getProductsRef, getIngredientsRef, procesarVentaConStock, obtenerVentasDelDia } from '../firebase/firebaseService';

export default function POSView() {
  const { tenantId } = useTenant();

  const [productos, setProductos] = useState([]);
  const [ingredientes, setIngredientes] = useState([]);
  const [carrito, setCarrito] = useState([]);

  const [guardando, setGuardando] = useState(false);
  const [ticketActual, setTicketActual] = useState(null);

  const [metodoPago, setMetodoPago] = useState('efectivo'); // efectivo, tarjeta, mercado_pago
  const [pagoCon, setPagoCon] = useState('');

  // Estados para Cierre de Caja
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [cargandoCierre, setCargandoCierre] = useState(false);
  const [datosCierre, setDatosCierre] = useState(null);

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


  const totalVenta = carrito.reduce((acc, item) => acc + (item.precioVenta * item.cantidadPedido), 0);
  const vuelto = metodoPago === 'efectivo' && Number(pagoCon) > totalVenta ? Number(pagoCon) - totalVenta : 0;

  const agregarAlCarrito = (prod) => {
    const existe = carrito.find(item => item.id === prod.id);
    if (existe) {
      setCarrito(carrito.map(item => item.id === prod.id ? { ...item, cantidadPedido: item.cantidadPedido + 1 } : item));
    } else {
      setCarrito([...carrito, { ...prod, cantidadPedido: 1 }]);
    }
  };

  const restarDelCarrito = (prodId) => {
    const existe = carrito.find(item => item.id === prodId);
    if (existe && existe.cantidadPedido > 1) {
      setCarrito(carrito.map(item => item.id === prodId ? { ...item, cantidadPedido: item.cantidadPedido - 1 } : item));
    } else {
      setCarrito(carrito.filter(item => item.id !== prodId));
    }
  };

  const eliminarDelCarrito = (prodId) => {
    setCarrito(carrito.filter((item) => item.id !== prodId));
  };

  const handleAbrirCierre = async () => {
    setMostrarCierre(true);
    setCargandoCierre(true);
    const ventasHoy = await obtenerVentasDelDia(tenantId);

    const resumen = { efectivo: 0, mercado_pago: 0, tarjeta: 0, total: 0, cantidadVentas: ventasHoy.length };

    ventasHoy.forEach(v => {
      const metodo = v.metodoPago || 'efectivo';
      if (resumen[metodo] !== undefined) {
        resumen[metodo] += v.totalIngreso;
      }
      resumen.total += v.totalIngreso;
    });

    setDatosCierre(resumen);
    setCargandoCierre(false);
  };

  const handleCobrar = async () => {
    if (guardando || carrito.length === 0) return;
    if (metodoPago === 'efectivo' && pagoCon && Number(pagoCon) < totalVenta) {
      alert("El monto abonado es menor al total de la venta.");
      return;
    }
    setGuardando(true);
    try {
      const ventaRealizada = await procesarVentaConStock(
        tenantId,
        carrito,
        metodoPago,
        Number(pagoCon) || totalVenta,
        vuelto,
        ingredientes
      );
      if (ventaRealizada) {
        setTicketActual(ventaRealizada);
        setPagoCon('');
        setMetodoPago('efectivo');
        setCarrito([]); // Limpiar carrito
      }
    } finally {
      setGuardando(false);
    }
  };

  // El carrito ya agrupa por cantidadPedido, por lo que usamos los items directamente
  const itemsAgrupados = ticketActual ? ticketActual.items.map(item => ({
    nombre: item.nombre,
    precioVenta: item.precioVenta,
    cantidad: item.cantidadPedido,
    subtotal: item.precioVenta * item.cantidadPedido
  })) : [];
  // Estados para Filtro de Categorías
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const categorias = ['Todas', ...new Set(productos.map(p => p.categoria || 'General'))];

  const productosFiltrados = filtroCategoria === 'Todas'
    ? productos
    : productos.filter(p => (p.categoria || 'General') === filtroCategoria);

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      <div className="flex-1 bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Utensils className="w-6 h-6 text-orange-500" /> Vender Producto
          </h2>
          <button
            onClick={handleAbrirCierre}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg transition-colors border border-indigo-200"
          >
            <Calculator className="w-5 h-5" /> Cierre de Caja
          </button>
        </div>

        {/* Categorías (Filtros) */}
        {categorias.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full font-semibold transition-colors border ${filtroCategoria === cat
                  ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {productos.length === 0 ? (
          <p className="text-gray-500">Ve a "Catálogo y Precios" para crear tus productos.</p>
        ) : productosFiltrados.length === 0 ? (
          <p className="text-gray-500">No hay productos en esta categoría.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-4">
            {productosFiltrados.map(prod => (
              <button key={prod.id} onClick={() => agregarAlCarrito(prod)} className="p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 transition-all text-left bg-white shadow-sm">
                <h3 className="text-lg font-bold text-gray-800">{prod.nombre}</h3>
                <p className="text-2xl font-black text-gray-900 mt-2">${prod.precioVenta}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-full md:w-96 bg-gray-50 p-6 rounded-xl shadow-md border border-gray-200 flex flex-col">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Pedido Actual</h2>
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-[200px]">
          {carrito.map((item) => (
            <div key={item.id} className="flex flex-col bg-white p-3 rounded border gap-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-800">{item.nombre}</span>
                <span className="font-bold text-gray-900">${item.precioVenta * item.cantidadPedido}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                  <button
                    onClick={() => restarDelCarrito(item.id)}
                    className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-3 font-semibold text-sm">{item.cantidadPedido}</span>
                  <button
                    onClick={() => agregarAlCarrito(item)}
                    className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => eliminarDelCarrito(item.id)}
                  className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                  title="Eliminar producto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-gray-200">
          {/* SELECCIÓN DE PAGO */}
          {carrito.length > 0 && (
            <div className="mb-4 space-y-3">
              <p className="font-bold text-gray-700 text-sm">Método de Pago</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setMetodoPago('efectivo')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300 text-gray-500'}`}
                >
                  <Banknote className="w-5 h-5 mb-1" />
                  <span className="text-xs font-semibold">Efectivo</span>
                </button>
                <button
                  onClick={() => setMetodoPago('mercado_pago')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${metodoPago === 'mercado_pago' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-500'}`}
                >
                  <Smartphone className="w-5 h-5 mb-1" />
                  <span className="text-xs font-semibold">Transfer.</span>
                </button>
                <button
                  onClick={() => setMetodoPago('tarjeta')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${metodoPago === 'tarjeta' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 hover:border-gray-300 text-gray-500'}`}
                >
                  <CreditCard className="w-5 h-5 mb-1" />
                  <span className="text-xs font-semibold">Tarjeta</span>
                </button>
              </div>

              {metodoPago === 'efectivo' && (
                <div className="flex gap-2 items-center bg-white border border-gray-200 rounded-lg p-2">
                  <span className="text-gray-500 font-bold px-2">Abona con: $</span>
                  <input
                    type="number"
                    value={pagoCon}
                    onChange={(e) => setPagoCon(e.target.value)}
                    placeholder={totalVenta.toString()}
                    className="flex-1 outline-none text-lg font-bold text-gray-800 bg-transparent"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-medium text-gray-600">Total:</span>
            <span className="text-3xl font-black text-gray-900">${totalVenta}</span>
          </div>

          {metodoPago === 'efectivo' && vuelto > 0 && (
            <div className="flex justify-between items-center mb-4 text-green-600 bg-green-50 p-2 rounded-lg border border-green-100">
              <span className="text-sm font-bold">Vuelto a entregar:</span>
              <span className="text-xl font-black">${vuelto}</span>
            </div>
          )}

          <button
            onClick={handleCobrar}
            disabled={carrito.length === 0 || guardando}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99]"
          >
            {guardando ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Procesando venta...</span>
              </>
            ) : (
              'Cobrar y Descontar Stock'
            )}
          </button>
        </div>
      </div>

      {/* MODAL DE TICKET / COMPROBANTE DE VENTA */}
      {ticketActual && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col border border-gray-200">
            {/* Cabecera del modal */}
            <div className="bg-emerald-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-200" />
                <span className="font-bold text-lg">¡Cobro Exitoso!</span>
              </div>
              <button
                onClick={() => setTicketActual(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-emerald-700 transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ÁREA DEL TICKET (Diseño térmico para pantalla e impresora) */}
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              <div id="ticket-imprimible" className="bg-amber-50/60 p-4 rounded-xl border border-dashed border-gray-300 font-mono text-gray-800 text-sm">
                <div className="text-center mb-3">
                  <h3 className="font-black text-xl tracking-wider uppercase text-gray-900">SANCHO PLANCHA</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">Comprobante de Venta</p>
                  <p className="text-[11px] text-gray-400 mt-1">Ticket #{ticketActual.id?.slice(0, 8).toUpperCase() || '---'}</p>
                </div>

                <div className="border-t border-dashed border-gray-300 my-2 pt-2 text-xs text-gray-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Fecha:</span>
                    <span>{new Date(ticketActual.fecha).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hora:</span>
                    <span>{new Date(ticketActual.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-300 my-2 pt-2">
                  <p className="text-xs font-bold text-gray-700 mb-2">DETALLE:</p>
                  <div className="space-y-1.5 text-xs">
                    {itemsAgrupados.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div className="flex-1 pr-2">
                          <span className="font-medium text-gray-900">{item.nombre}</span>
                          {item.cantidad > 1 && (
                            <span className="text-gray-500 block text-[11px]">
                              {item.cantidad} x ${item.precioVenta}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-gray-900">${item.subtotal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t-2 border-dashed border-gray-400 my-3 pt-2">
                  <div className="flex justify-between items-center text-base font-black text-gray-900">
                    <span>TOTAL PAGADO:</span>
                    <span className="text-xl">${ticketActual.totalIngreso}</span>
                  </div>
                </div>

                <div className="text-center pt-2 text-[11px] text-gray-500 italic">
                  ¡Gracias por su compra!
                </div>
              </div>
            </div>

            {/* Botones de acción inferiores */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Printer className="w-4 h-4 text-gray-600" />
                <span>Imprimir</span>
              </button>
              <button
                onClick={() => setTicketActual(null)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>Nueva Venta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cierre de Caja */}
      {mostrarCierre && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-indigo-600 p-6 text-center relative">
              <button
                onClick={() => setMostrarCierre(false)}
                className="absolute top-4 right-4 text-indigo-200 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <Calculator className="w-12 h-12 text-white mx-auto mb-2 opacity-90" />
              <h2 className="text-2xl font-black text-white">Arqueo de Caja</h2>
              <p className="text-indigo-100 text-sm">Resumen de ventas del día actual</p>
            </div>
            <div className="p-6 bg-gray-50 flex-1">
              {cargandoCierre ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                  <p className="text-gray-500 font-medium">Calculando totales de hoy...</p>
                </div>
              ) : datosCierre ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                    <span className="flex items-center gap-2 text-gray-600 font-medium"><Banknote className="w-5 h-5 text-green-500" /> Efectivo:</span>
                    <span className="font-bold text-gray-900">${datosCierre.efectivo}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                    <span className="flex items-center gap-2 text-gray-600 font-medium"><Smartphone className="w-5 h-5 text-blue-500" /> Transferencias:</span>
                    <span className="font-bold text-gray-900">${datosCierre.mercado_pago}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                    <span className="flex items-center gap-2 text-gray-600 font-medium"><CreditCard className="w-5 h-5 text-orange-500" /> Tarjetas:</span>
                    <span className="font-bold text-gray-900">${datosCierre.tarjeta}</span>
                  </div>
                  <div className="border-t-2 border-dashed border-gray-300 my-4"></div>
                  <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <div>
                      <span className="block text-indigo-800 font-bold text-lg">Gran Total</span>
                      <span className="block text-indigo-600 text-sm">{datosCierre.cantidadVentas} ventas registradas</span>
                    </div>
                    <span className="font-black text-3xl text-indigo-900">${datosCierre.total}</span>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500">Error al cargar datos.</p>
              )}
            </div>
            <div className="p-6 bg-white border-t border-gray-100">
              <button
                onClick={() => {
                  window.print();
                }}
                disabled={cargandoCierre}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:bg-gray-300"
              >
                <Printer className="w-5 h-5" /> Imprimir Ticket Z
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
