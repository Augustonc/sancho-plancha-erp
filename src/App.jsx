import React, { useState } from 'react';
import { signOut } from "firebase/auth";
import { auth } from "./firebase/config";
import { useAuth } from "./context/AuthContext";
import { getAllowedTabs } from "./config/roles";

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

// Pantallas para usuarios autenticados cuyo perfil no permite operar
const ACCESS_SCREENS = {
  'no-tenant': {
    title: 'Usuario sin sucursal asignada',
    message: 'Tu cuenta todavía no está vinculada a ninguna sucursal. Pedile al administrador que te asigne una.',
  },
  'no-profile': {
    title: 'Perfil no encontrado',
    message: 'Tu cuenta no tiene un perfil configurado en el sistema. Contactá al administrador.',
  },
  'no-role': {
    title: 'Rol sin accesos',
    message: 'Tu rol no tiene secciones habilitadas. Contactá al administrador.',
  },
  error: {
    title: 'No se pudo cargar tu perfil',
    message: 'Revisá tu conexión e intentá ingresar nuevamente.',
  },
};

function AccessBlockedScreen({ title, message, email }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-200 p-4">
      <div className="p-8 bg-white rounded shadow-lg w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-orange-600">{title}</h2>
        <p className="text-gray-700 mb-2">{message}</p>
        <p className="text-sm text-gray-500 mb-6">Sesión iniciada como <strong>{email}</strong></p>
        <button
          onClick={() => signOut(auth)}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white p-2 rounded font-bold transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { user, role, tenantId, profileStatus, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(null);

  // ==========================================
  // RENDER PRINCIPAL (EL GUARDIA DE SEGURIDAD)
  // ==========================================

  // 1. Pantalla de carga mientras se resuelve la sesión y se lee /users/{uid}
  if (loading) return <div className="p-10 text-center font-bold text-xl mt-20">Arrancando motores...</div>;

  // 2. Si NO hay usuario, mostramos el Formulario (Candado)
  if (!user) return <LoginView />;

  // 3. Logueado pero sin perfil utilizable: pantalla explicativa + logout
  const allowedTabs = getAllowedTabs(role);
  const blocked = profileStatus !== 'ok'
    ? ACCESS_SCREENS[profileStatus] ?? ACCESS_SCREENS.error
    : allowedTabs.length === 0 ? ACCESS_SCREENS['no-role'] : null;

  if (blocked) return <AccessBlockedScreen {...blocked} email={user.email} />;

  // 4. Guardia de pestañas: si la activa no está permitida (o es la primera carga),
  //    caemos en la primera habilitada para el rol (admin → dashboard, cajero → pos).
  const currentTab = allowedTabs.includes(activeTab) ? activeTab : allowedTabs[0];
  const ActiveView = VIEWS[currentTab];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans relative">
      <Sidebar activeTab={currentTab} setActiveTab={setActiveTab} />

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
          {/* key={tenantId}: si cambia la sucursal, la vista se remonta y re-suscribe */}
          <ActiveView key={tenantId} />
        </div>
      </main>
    </div>
  );
}