// Este es el corazón de la seguridad de tu ERP
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/config"; // Chequea que esta ruta sea correcta
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Aquí guardamos el mail y el ID
  const [role, setRole] = useState(null); // ¡AQUÍ guardamos si es Admin u Operador!
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Esto se ejecuta apenas se abre la app
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // 1. Si hay usuario, buscamos su "ficha" en la colección 'users' de Firestore
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setRole(docSnap.data().role); // Guardamos el rol (admin/operator)
        }
        setUser(currentUser);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Esta es la "frecuencia" que van a escuchar los demás componentes
  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
