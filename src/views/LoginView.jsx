import React, { useState } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  const iniciarSesion = async (e) => {
    e.preventDefault(); 
    setErrorLogin('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setErrorLogin('Credenciales incorrectas. Revisá el mail o la clave.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-200">
      <form onSubmit={iniciarSesion} className="p-8 bg-white rounded shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-orange-600">Acceso al ERP</h2>
        
        {errorLogin && <p className="text-red-500 mb-4 text-sm font-bold text-center">{errorLogin}</p>}
        
        <input 
          type="email" placeholder="Tu correo" 
          className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={email} onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input 
          type="password" placeholder="Tu contraseña" 
          className="w-full p-2 mb-6 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={password} onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white p-2 rounded font-bold transition-colors">
          Ingresar al Sistema
        </button>
      </form>
    </div>
  );
}
