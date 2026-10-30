// Matriz única de permisos por rol: qué pestañas (vistas) puede ver cada uno.
// Para cambiar los accesos de un rol, basta con editar este archivo.

export const ALL_TABS = ['dashboard', 'pos', 'inventory', 'catalog', 'hr', 'finance'];

export const ROLE_PERMISSIONS = {
  admin: ALL_TABS,
  cajero: ['pos', 'inventory'],
};

// Alias de roles: variantes de nombre que se tratan como el mismo rol
const ROLE_ALIASES = {
  operador: 'cajero',
  operator: 'cajero',
};

export const normalizeRole = (role) => {
  if (!role) return null;
  const r = String(role).toLowerCase().trim();
  return ROLE_ALIASES[r] ?? r;
};

/**
 * Devuelve las pestañas permitidas para un rol.
 * Rol desconocido o ausente => sin accesos (fail-closed).
 */
export const getAllowedTabs = (role) => ROLE_PERMISSIONS[normalizeRole(role)] ?? [];
