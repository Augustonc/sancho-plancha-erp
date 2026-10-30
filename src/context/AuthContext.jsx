// Este es el corazón de la seguridad de tu ERP
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { normalizeRole } from "../config/roles";

const AuthContext = createContext();

/**
 * profileStatus:
 *  - 'ok'         → perfil válido con tenantId
 *  - 'no-profile' → no existe /users/{uid}
 *  - 'no-tenant'  → existe el perfil pero no tiene tenantId
 *  - 'error'      → falló la lectura de Firestore
 *  - null         → no hay sesión
 */
const EMPTY_SESSION = { user: null, role: null, tenantId: null, profileStatus: null };

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(EMPTY_SESSION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Se ejecuta al abrir la app y en cada login/logout
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setSession(EMPTY_SESSION);
        setLoading(false);
        return;
      }

      // Mientras leemos /users/{uid} la app queda en "cargando":
      // así nunca se renderiza una vista con rol/tenant a medio resolver.
      setLoading(true);

      let next;
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (!snap.exists()) {
          next = { user: currentUser, role: null, tenantId: null, profileStatus: 'no-profile' };
        } else {
          const data = snap.data();
          next = {
            user: currentUser,
            role: normalizeRole(data.role),
            tenantId: data.tenantId || null,
            profileStatus: data.tenantId ? 'ok' : 'no-tenant',
          };
        }
      } catch (error) {
        console.error("Error leyendo el perfil del usuario:", error);
        next = { user: currentUser, role: null, tenantId: null, profileStatus: 'error' };
      }

      // Un único setState: user, role y tenantId cambian juntos
      setSession(next);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ ...session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
