import React, { useState } from 'react';
import { useAuth } from "./context/AuthContext";

import LoginView from './views/LoginView';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import DashboardView from './views/DashboardView';
import POSView from './views/POSView';
import InventoryView from './views/InventoryView';
import CatalogView from './views/CatalogView';
import HRView from './views/HRView';
import FinanceView from './views/FinanceView';

// Cada vista es un Smart Component: obtiene su propio tenantId vía useTenant()
// y lee/escribe en /restaurants/{tenantId}/... a través de firebaseService.js.
const VIEWS = {
  dashboard: DashboardView,
  pos: POSView,
  inventory: InventoryView,
  catalog: CatalogView,
  hr: HRView,
  finance: FinanceView,
};

export default function App() {
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // ==========================================
  // RENDER PRINCIPAL (EL GUARDIA DE SEGURIDAD)
  // ==========================================

  // 1. Pantalla de carga mientras React averigua si estás logueado
  if (loading) return <div className="p-10 text-center font-bold text-xl mt-20">Arrancando motores...</div>;

  // 2. Si NO hay usuario, mostramos el Formulario (Candado)
  if (!user) return <LoginView />;

  // 3. Si PASÓ la seguridad, mostramos el sistema completo
  const ActiveView = VIEWS[activeTab] ?? DashboardView;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans relative">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Navbar user={user} role={role} />

        {/* ALERTA DE JEFE */}
        {role === 'admin' && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
            <p className="font-bold">¡Bienvenido Jefe!</p>
            <p>Tenés control total sobre la base de datos.</p>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          <ActiveView />
        </div>
      </main>
    </div>
  );
}