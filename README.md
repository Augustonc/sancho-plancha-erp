# 🍔 Sancho Plancha ERP

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

Sistema de Planificación de Recursos Empresariales (ERP) diseñado a medida para la gestión integral del food truck **Sancho Plancha**. Permite administrar ventas, inventario, personal y finanzas en tiempo real mediante una interfaz rápida y optimizada para el uso operativo.

🚀 **Demo en vivo:** [https://sancho-plancha-erp.vercel.app](https://sancho-plancha-erp.vercel.app) (No disponible en este momento, se está desarrollando la seguridad y niveles de usuarios)

---

## ✨ Características Principales

El sistema está dividido en módulos independientes conectados a una base de datos en tiempo real, garantizando que el flujo de caja, el stock y las deudas estén siempre actualizados.

### 📊 Dashboard (Resumen General)
* Visualización en tiempo real de la ganancia neta, ingresos totales y costos operativos.
* Cálculo de capacidad de pago basado en ingresos vs. deudas pendientes.
* Historial de últimas ventas registradas.

### 🛒 Punto de Venta (POS)
* Interfaz táctil y ágil para el registro de pedidos.
* **Descuento de stock automatizado:** Al confirmar una venta, el sistema desglosa la receta del producto y descuenta los gramos/unidades exactas del inventario.
* **Anulación Inteligente:** Posibilidad de cancelar una venta, lo que automáticamente restituye la materia prima al inventario general y corrige la ganancia neta.

### 📦 Inventario y Compras
* Ingreso de mercadería con actualización dinámica de costos unitarios.
* Alertas de stock mínimo integradas.
* **Carga en "Modo Ráfaga":** Formularios optimizados con limpieza de estado en microsegundos (sin `e.target.reset()`) para cargar facturas de proveedores rápidamente sin solapamiento de datos.

### 📋 Catálogo y Precios
* Gestión de ingredientes (Materia prima).
* Armado dinámico de recetas para calcular el costo real de cada producto final.
* Definición de precios de venta al público.

### 👥 Recursos Humanos (Gestión de Personal)
* Alta y baja de empleados con configuración de valor hora individual.
* Registro de jornadas laborales (con selector de fechas para cargar turnos atrasados).
* **Cruce de datos en tiempo real:** Visualización instantánea de la deuda acumulada con cada empleado según las jornadas trabajadas y no liquidadas.
* Bloqueo de seguridad que impide borrar jornadas que ya fueron marcadas como "Pagadas".

### 💳 Finanzas y Fiado
* Registro de cuentas por pagar a proveedores (fiado).
* Carga de gastos operativos diarios (gas, delivery, etc.).

---

## 🛠️ Stack Tecnológico

* **Frontend:** React.js (Componentes funcionales y Hooks como `useState`, `useEffect`, `useMemo`).
* **Build Tool:** Vite.
* **Estilos:** Tailwind CSS para un diseño responsive y modular.
* **Íconos:** Lucide React.
* **Backend & BaaS:** Firebase (Firestore Database y Firebase Authentication).

---

## 🔒 Arquitectura de Seguridad y Acceso

El ERP cuenta con un sistema de rutas protegidas:
1. **Autenticación:** Requiere usuario y contraseña para acceder al sistema.
2. **Aislamiento de Datos:** Cada usuario/administrador tiene su propia rama de datos en la colección principal (`users/{uid}/...`).
3. **Control de Roles:** Detección de nivel de permisos (ej. `ADMIN`) para habilitar capacidades de control total sobre la base de datos.

---

## 💻 Instalación y Ejecución Local

Si deseas clonar y correr este proyecto en tu entorno local:

1. Cloná el repositorio:
   ```bash
   git clone [https://github.com/Augustonc/sancho-plancha-erp.git](https://github.com/Augustonc/sancho-plancha-erp.git)
   ```
Navegá al directorio del proyecto:
  ```bash
  cd sancho-plancha-erp
  ```
Instalá las dependencias:

```bash
npm install
```
Configurá tus variables de entorno:

Crea un archivo .env en la raíz del proyecto.

Agregá tus credenciales de Firebase (API Key, Auth Domain, Project ID, etc.).

Iniciá el servidor de desarrollo:

```ash
npm run dev
```
👨‍💻 Autor
Augusto - Técnico Universitario en Programación | Desarrollador y Dueño de Sancho Plancha.


  
  
