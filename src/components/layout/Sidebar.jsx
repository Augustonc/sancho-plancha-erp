import React from 'react';
import {
  LayoutDashboard, ShoppingCart, Package,
  Users, Wallet, Settings
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, text: 'Panel General' },
    { id: 'pos', icon: ShoppingCart, text: 'Punto de Venta' },
    { id: 'inventory', icon: Package, text: 'Inventario y Compras' },
    { id: 'catalog', icon: Settings, text: 'Catálogo y Precios' },
    { id: 'hr', icon: Users, text: 'Empleados' },
    { id: 'finance', icon: Wallet, text: 'Finanzas y Fiado' },
  ];

  return (
    <nav className="w-full md:w-64 bg-gray-900 text-gray-300 p-4 flex flex-col gap-2 shadow-2xl z-10 shrink-0">
      <div className="px-4 py-6 mb-4">
        <h1 className="text-2xl font-black text-white tracking-tight">SANCHO<span className="text-orange-500">PLANCHA</span></h1>
      </div>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-3 p-3 rounded-lg text-left font-medium ${activeTab === tab.id ? 'bg-orange-500 text-white' : 'hover:bg-gray-800'}`}
        >
          <tab.icon className="w-5 h-5" /> {tab.text}
        </button>
      ))}
    </nav>
  );
}
