import React from 'react';
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/config";

export default function Navbar({ user, role }) {
  const cerrarSesion = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white p-4 rounded shadow border border-gray-200">
      <h1 className="text-2xl font-bold text-gray-800">Panel Central</h1>
      <div className="flex gap-4 items-center mt-4 sm:mt-0">
        <span className="bg-gray-100 px-3 py-1 rounded text-sm border">
          Usuario: <strong>{user?.email}</strong> | Rango: <strong className="uppercase text-orange-600">{role || 'Cargando...'}</strong>
        </span>
        <button onClick={cerrarSesion} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded text-sm font-bold">
          Salir
        </button>
      </div>
    </div>
  );
}
