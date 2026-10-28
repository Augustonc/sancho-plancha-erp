import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit, where, getDocs, runTransaction } from "firebase/firestore";
import { db } from "./config";

/**
 * Retorna la referencia a la colección de un restaurante específico
 * Ruta base: /restaurants/{tenantId}/{collectionName}
 */
export const getTenantCollection = (tenantId, collectionName) => {
  return collection(db, 'restaurants', tenantId, collectionName);
};

// ==========================================
// PRODUCTOS E INGREDIENTES
// ==========================================

export const getProductsRef = (tenantId) => {
  return getTenantCollection(tenantId, 'productos');
};

export const guardarProducto = async (tenantId, producto) => {
  try {
    if (producto.id) {
      const { id, ...data } = producto;
      await updateDoc(doc(db, 'restaurants', tenantId, 'productos', id), data);
      return id;
    } else {
      const docRef = await addDoc(getProductsRef(tenantId), producto);
      return docRef.id;
    }
  } catch (error) {
    console.error("Error guardando producto:", error);
    throw error;
  }
};

export const eliminarProducto = async (tenantId, productoId) => {
  try {
    await deleteDoc(doc(db, 'restaurants', tenantId, 'productos', productoId));
  } catch (error) {
    console.error("Error eliminando producto:", error);
    throw error;
  }
};
export const guardarIngrediente = async (tenantId, ingrediente) => {
  try {
    const docRef = await addDoc(getIngredientsRef(tenantId), ingrediente);
    return docRef.id;
  } catch (error) {
    console.error("Error guardando ingrediente:", error);
    throw error;
  }
};

export const eliminarIngrediente = async (tenantId, ingredienteId) => {
  try {
    await deleteDoc(doc(db, 'restaurants', tenantId, 'ingredientes', ingredienteId));
  } catch (error) {
    console.error("Error eliminando ingrediente:", error);
    throw error;
  }
};
export const getIngredientsRef = (tenantId) => {
  return getTenantCollection(tenantId, 'ingredientes');
};

export const actualizarStockYCosto = async (tenantId, ingredienteId, nuevoStock, nuevoCosto = null) => {
  try {
    const ingRef = doc(db, 'restaurants', tenantId, 'ingredientes', ingredienteId);
    const updates = { stock: nuevoStock };
    if (nuevoCosto !== null && !isNaN(nuevoCosto)) {
      updates.costo = nuevoCosto;
    }
    await updateDoc(ingRef, updates);
  } catch (error) {
    console.error("Error al actualizar stock/costo:", error);
    throw error;
  }
};

// ==========================================
// VENTAS
// ==========================================

export const getSalesRef = (tenantId) => {
  return getTenantCollection(tenantId, 'ventas');
};

/**
 * Query de las últimas N ventas, ordenadas de más nueva a más vieja.
 */
export const getRecentSalesQuery = (tenantId, max = 150) => {
  return query(getSalesRef(tenantId), orderBy('fecha', 'desc'), limit(max));
};

export const saveSale = async (tenantId, saleData) => {
  try {
    const docRef = await addDoc(getSalesRef(tenantId), {
      ...saleData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving sale:", error);
    throw error;
  }
};

export const cancelSale = async (tenantId, saleId, newStatus = "Anulada") => {
  try {
    const saleRef = doc(db, 'restaurants', tenantId, 'ventas', saleId);
    await updateDoc(saleRef, {
      estado: newStatus,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error cancelling sale:", error);
    throw error;
  }
};

/**
 * Anula una venta y devuelve al inventario la materia prima de cada receta.
 * Todo ocurre en una única transacción para evitar inconsistencias de stock.
 */
export const anularVentaConStock = async (tenantId, ventaId) => {
  const ventaRef = doc(db, 'restaurants', tenantId, 'ventas', ventaId);

  await runTransaction(db, async (transaction) => {
    const ventaDoc = await transaction.get(ventaRef);
    if (!ventaDoc.exists()) {
      throw new Error("La venta no existe.");
    }

    const venta = ventaDoc.data();
    if (venta.estado === 'Anulada') {
      throw new Error("Esta venta ya fue anulada.");
    }

    // Calcular stock a devolver
    const stockADevolver = {};
    (venta.items || []).forEach(producto => {
      const cantidad = producto.cantidadPedido || 1;
      (producto.receta || []).forEach(item => {
        stockADevolver[item.ingredienteId] = (stockADevolver[item.ingredienteId] || 0) + (item.cantidad * cantidad);
      });
    });

    // Firestore exige todas las lecturas antes de las escrituras
    const ingRefs = {};
    const ingDocs = {};
    for (const ingId of Object.keys(stockADevolver)) {
      ingRefs[ingId] = doc(db, 'restaurants', tenantId, 'ingredientes', ingId);
      ingDocs[ingId] = await transaction.get(ingRefs[ingId]);
    }

    transaction.update(ventaRef, { estado: 'Anulada', fechaAnulacion: new Date().toISOString() });

    for (const [ingId, qty] of Object.entries(stockADevolver)) {
      const d = ingDocs[ingId];
      if (d.exists()) {
        const currentStock = d.data().stock || 0;
        transaction.update(ingRefs[ingId], { stock: currentStock + qty });
      }
    }
  });
};

// ==========================================
// GENÉRICOS
// ==========================================

export const eliminarDocTenant = async (tenantId, collectionName, docId) => {
  try {
    await deleteDoc(doc(db, 'restaurants', tenantId, collectionName, docId));
  } catch (error) {
    console.error(`Error eliminando en ${collectionName}:`, error);
    throw error;
  }
};

// ==========================================
// RECURSOS HUMANOS (EMPLEADOS Y JORNADAS)
// ==========================================

export const getEmployeesRef = (tenantId) => {
  return getTenantCollection(tenantId, 'empleados');
};

export const getShiftsRef = (tenantId) => {
  return getTenantCollection(tenantId, 'jornadas');
};

export const crearEmpleado = async (tenantId, empleado) => {
  const docRef = await addDoc(getEmployeesRef(tenantId), empleado);
  return docRef.id;
};

export const actualizarValorHora = async (tenantId, empleadoId, valorHora) => {
  await updateDoc(doc(db, 'restaurants', tenantId, 'empleados', empleadoId), { valorHora });
};

export const registrarJornada = async (tenantId, jornada) => {
  const docRef = await addDoc(getShiftsRef(tenantId), jornada);
  return docRef.id;
};

export const pagarJornada = async (tenantId, jornadaId) => {
  await updateDoc(doc(db, 'restaurants', tenantId, 'jornadas', jornadaId), { pagado: true });
};

// ==========================================
// FINANZAS (GASTOS Y DEUDAS / FIADO)
// ==========================================

export const getExpensesRef = (tenantId) => {
  return getTenantCollection(tenantId, 'gastos');
};

export const getDebtsRef = (tenantId) => {
  return getTenantCollection(tenantId, 'deudas');
};

export const registrarGasto = async (tenantId, gasto) => {
  const docRef = await addDoc(getExpensesRef(tenantId), gasto);
  return docRef.id;
};

export const registrarDeuda = async (tenantId, deuda) => {
  const docRef = await addDoc(getDebtsRef(tenantId), deuda);
  return docRef.id;
};

export const pagarDeuda = async (tenantId, deudaId) => {
  await updateDoc(doc(db, 'restaurants', tenantId, 'deudas', deudaId), { pagado: true });
};

export const obtenerVentasDelDia = async (tenantId) => {
  try {
    const inicioDelDia = new Date();
    inicioDelDia.setHours(0, 0, 0, 0);

    const q = query(
      getSalesRef(tenantId),
      where('fecha', '>=', inicioDelDia.toISOString())
    );

    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Error obteniendo ventas del día", err);
    return [];
  }
};

export const procesarVentaConStock = async (tenantId, carrito, metodoPago, montoAbonado, vuelto, ingredientesState) => {
  if (!carrito || carrito.length === 0) return null;

  let totalIngreso = 0;
  let totalCosto = 0;
  const ingredientesAActualizar = {};

  const calcularCostoReceta = (receta) => {
    if (!receta) return 0;
    return receta.reduce((total, itemReceta) => {
      const ingrediente = ingredientesState.find(i => i.id === itemReceta.ingredienteId);
      return total + (ingrediente ? ingrediente.costo * itemReceta.cantidad : 0);
    }, 0);
  };

  carrito.forEach(producto => {
    const cantidad = producto.cantidadPedido || 1;
    totalIngreso += (producto.precioVenta * cantidad);
    totalCosto += (calcularCostoReceta(producto.receta) * cantidad);

    if (producto.receta) {
      producto.receta.forEach(item => {
        if (ingredientesAActualizar[item.ingredienteId] === undefined) {
          const ing = ingredientesState.find(i => i.id === item.ingredienteId);
          ingredientesAActualizar[item.ingredienteId] = ing ? ing.stock : 0;
        }
        ingredientesAActualizar[item.ingredienteId] -= (item.cantidad * cantidad);
      });
    }
  });

  try {
    const ventaData = {
      fecha: new Date().toISOString(),
      items: [...carrito],
      totalIngreso,
      totalCosto,
      gananciaNeta: totalIngreso - totalCosto,
      metodoPago,
      montoAbonado,
      vuelto,
      estado: "Completada"
    };

    // Save sale
    const docRef = await addDoc(getSalesRef(tenantId), ventaData);

    // Update stock sequentially for simplicity (ideally use a runTransaction or writeBatch in production)
    await Promise.all(
      Object.entries(ingredientesAActualizar).map(([id, nuevoStock]) =>
        updateDoc(doc(db, 'restaurants', tenantId, 'ingredientes', id), { stock: nuevoStock })
      )
    );

    return { id: docRef.id, ...ventaData };
  } catch (error) {
    console.error("Error al procesar la venta:", error);
    return null;
  }
};
