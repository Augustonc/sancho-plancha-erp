import { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

const TenantContext = createContext();

/**
 * Expone la sucursal activa. El tenantId ya no está fijo en el código:
 * se deriva del perfil del usuario logueado (/users/{uid}.tenantId).
 *
 * En el futuro, acá se puede agregar `switchTenant(newId)` para usuarios
 * con acceso a varias sucursales.
 */
export const TenantProvider = ({ children }) => {
  const { tenantId } = useAuth();

  return (
    <TenantContext.Provider value={{ tenantId }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
