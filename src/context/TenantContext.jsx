import { createContext, useContext, useState } from 'react';

const TenantContext = createContext();

export const TenantProvider = ({ children }) => {
  // Inicializamos con el ID de prueba para que apunte al entorno de desarrollo
  const [tenantId, setTenantId] = useState('sancho_plancha_dev_01');

  // En el futuro, podríamos añadir funciones aquí como `switchTenant(newId)`
  // que permita cambiar de sucursal.

  return (
    <TenantContext.Provider value={{ tenantId, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
