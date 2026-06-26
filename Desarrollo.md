Plan de Desarrollo: Aplicación Web "Coffee Shop" (Tiempo Real)
Este documento detalla el plan para construir una aplicación web de pedidos en tiempo real para una cafetería. El enfoque prioriza la simplicidad, el rendimiento y la configuración totalmente local sin dependencias externas complejas.

1. Arquitectura y Stack Tecnológico Recomendado
Para lograr comunicación bidireccional (tiempo real) con todo funcionando localmente, esta es la arquitectura recomendada:

Frontend (Cliente)
Framework: React.
Estilos: Tailwind CSS (para un prototipo rápido y responsive que funcione bien en móviles, tablets y escritorio).
Comunicación Real-Time: La librería oficial del backend (Socket.io client) es la mejor opción para evitar errores de compatibilidad.
Backend (Servidor)
Lenguaje/Runtime: Node.js. Es el estándar para aplicaciones en tiempo real debido a su modelo de I/O no bloqueante y al ecosistema gigante.
Framework Web: Express.js. Simple, robusto y fácil de configurar con Node.
Protocolo Tiempo Real: Socket.io.
Por qué: Gestiona automáticamente el "handshake" entre WebSocket y HTTP (fallback), maneja la reconexión automática si se cae internet momentáneamente y facilita las emisiones (emit) y escucha (on).
Base de Datos Local
Opción A (Recomendada para simplicidad): SQLite.
Es un archivo único, no requiere instalación de servidor de base de datos. Ideal para despliegues locales rápidos sin configuraciones adicionales.
ORM/Modelado: Prisma o Kysely. Permiten definir el esquema SQL y consultar con TypeScript/JavaScript moderno.
2. Estructura del Proyecto Sugerida

Apply
coffee-shop-app/
├── server/                # Código Backend
│   ├── prisma/            # Schema de base de datos (SQLite)
│   │   └── schema.prisma
│   ├── src/
│   │   ├── index.js       # Entry point (Express + Socket.io)
│   │   ├── routes/        # Rutas HTTP (si las hubiera, ej: admin login)
│   │   └── sockets/       # Lógica de eventos en tiempo real
├── client/                # Código Frontend
│   ├── src/
│   │   ├── components/    # Componentes Vue/React (PedidoForm, QueueList)
│   │   ├── views/         # Pantallas: MenuPantallaUsuario, AdminDashboard
│   │   └── socket.js      # Configura la conexión con el servidor
├── .env                   # Variables de entorno locales
└── docker-compose.yml     # Opcional: Para levantar todo en un clic (opcional)
3. Flujo del Sistema
Inicialización: Al abrir la aplicación, el cliente se conecta al servidor vía Socket.io (socket.emit('connect')).
Registro de Pedido:
El usuario selecciona items en el frontend y envía un evento emit('create_order', { data }).
Procesamiento Backend:
Recibe el pedido, lo guarda en SQLite (estado: 'pending'), asigna una cola/ID único.
Difusión Real-Time:
El servidor emite un evento io.emit('order_added', newOrder).
Actualización UI:
Todos los clientes conectados (pantallas de cocina, pantalla de espera en la tienda) reciben el evento y actualizan su lista inmediatamente sin recargar la página.
4. Detalle del Plan de Desarrollo por Fases
Fase 1: Configuración Inicial (Setup)
[ ] Inicializar proyecto Node.js: npm init -y, instalar dependencias (express, socket.io, prisma).
[ ] Configurar Base de Datos Local: Configurar SQLite con Prisma. Crear modelo Order y Product.
Modelo Order: id, clienteNombre, items (JSON), estado ('pending', 'preparing', 'ready'), timestamp, cola_id.
[ ] Estructura del Frontend: Inicializar Vue/React con Vite + Tailwind CSS. Configurar un componente básico de conexión a Socket.io.
Fase 2: Desarrollo Backend (Lógica Core)
[ ] Servidor Express Básico: Crear servidor que sirva estáticos (el frontend compilado).
[ ] Integración Socket.io: Implementar lógica para manejar conexiones y desconexiones (io.on('connection')).
[ ] Eventos de Negocio:
create_order: Validar datos -> Guardar en DB -> Emitir order_created.
update_status: Cambiar estado (ej: 'preparing' -> 'ready').
[ ] Persistencia Inicial: Cargar productos y órdenes pendientes al inicio para evitar "pérdida" de datos si el servidor reinicia.
Fase 3: Desarrollo Frontend (Interfaz)
[ ] Pantalla de Usuario (Quiosco): Formulario simple para seleccionar bebida/tamaño e ingresar nombre. Botón "Enviar Pedido".
Lógica al enviar: Escuchar respuesta y mostrar un mensaje de confirmación con ID de pedido.
[ ] Panel de Administración/Cocina: Lista en tiempo real de pedidos ordenada por timestamp o prioridad.
Acciones: Botones para cambiar estado (ej: "Cocinando", "Listo"). Al hacer clic, se emite evento al servidor y la UI se actualiza para todos los clientes conectados a esa vista.
Fase 4: Refinamiento y UX en Tiempo Real
[ ] Gestión de Colas: Implementar lógica visual (ej: animación cuando entra un pedido nuevo).
[ ] Reconexión Robusta: Probar desconectar internet momentáneamente para asegurar que Socket.io reconecte el frontend al servidor local.
[ ] Feedback Visual: Notificaciones toast o cambios de color en la lista cuando cambia el estado de una orden.
Fase 5: Despliegue Local y Pruebas
[ ] Script start: Un script que levante backend y reconstruya frontend (usando tools como concurrently).
[ ] Red Local: Configurar para que sea accesible desde cualquier dispositivo en la misma red Wi-Fi/LAN. Esto implica exponer el servidor a través de IP local (0.0.0.0), no solo localhost.
5. Consideraciones Técnicas Clave (Local)
¿Cómo hacer funcionar "cualquier dispositivo"?
Para que un celular o tablet en casa/accesión conectada al mismo Wi-Fi pueda ver la app:

El servidor debe escucharte en todas las interfaces de red (app.listen(port, '0.0.0.0')).
Debes conocer la IP local del dispositivo donde corre el servidor (ej: 192.168.1.50).
Los usuarios ingresan a http://192.168.1.50:PORT.
Manejo de Datos en Local
Dado que es SQLite local, los datos vivirán en el disco del ordenador donde se corra el servidor.
Si apagas esa computadora, los pedidos pendientes no estarán disponibles en otro equipo a menos que muevas la carpeta node_modules/.prisma (o donde esté el archivo .db).
6. Ejemplo de Código Básico del Backend (Conceptual)
Aquí un esbozo de cómo se vería el núcleo lógico usando Node, Express y Socket.io:


Apply
// server/index.js (resumido conceptualmente)
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { PrismaClient } = require('@prisma/client'); // Base de datos local SQLite

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }}); // Permitir conexiones locales

// Servir frontend estático (ruta configurada en cliente)
app.use(express.static('./client/dist')); 

io.on('connection', socket => {
    console.log('Cliente conectado:', socket.id);

    // Evento: Nuevo pedido creado por un usuario
    socket.on('create_order', async (data) => {
        const newOrder = await prisma.order.create({
            data: {
                customerName: data.customer,
                items: JSON.stringify(data.items),
                status: 'PENDING' // pendiente -> preparando -> listo
            }
        });

        // Emite el nuevo pedido a TODOS los clientes conectados (tiempo real)
        io.emit('order_added', newOrder); 
    });

    // Evento: Cambiar estado del pedido (desde la pantalla de cocina/admin)
    socket.on('update_order_status', async ({ orderId, status }) => {
        const updated = await prisma.order.update({
            where: { id: orderId },
            data: { status }
        });

        // Notifica a todos que el estado cambió
        io.emit('order_updated', updated);
    });

    socket.on('disconnect', () => console.log('Cliente desconectado'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => { // Escuchar en todas las interfaces LAN
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Acceso local (LAN): Dispositivos pueden conectarse via tu IP`);
});
Siguientes Pasos
Para proceder con la implementación:



Paso 1: Inicializar el Proyecto y Dependencias
Vamos a crear dos carpetas principales: client (React) y server (Node/Express). Abre tu terminal en una carpeta vacía llamada coffee-shop.

Ejecuta estos comandos secuencialmente:

Run
# 1. Crear estructura base
mkdir coffee-shop && cd coffee-shop

# 2. Inicializar Backend (Servidor + Base de Datos)
npm init -y
npm install express socket.io cors body-parser @prisma/client sqlite3
npx prisma init --datasource-provider sqlite
Nota: @prisma/client y sqlite3 configuran la base de datos local automáticamente.

Paso 2: Configurar Base de Datos (Modelo)
Edita el archivo que acabas de crear en la carpeta .env si no lo ha hecho, o simplemente editamos directamente el esquema. Abre/crea prisma/schema.prisma:


Apply
// prisma/schema.prisma - Definición del modelo de datos local

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Order {
  id        Int     @id @default(autoincrement())
  customer  String
  items     Json    // Array de productos en formato JSON
  status    String  @default("PENDING") // PENDING, PREPARING, READY
  createdAt DateTime @default(now())
}

// Opcional: Modelo para un menú fijo (opcional por ahora)
model Product {
  id        Int      @id @default(autoincrement())
  name      String
  price     Decimal
  category  String   // Café, Postres, Bebidas Frías
}
Ahora genera el cliente de Prisma y sincroniza la DB:

Run
npx prisma migrate dev --name init
Paso 3: Configurar Backend (Servidor Express + Socket.io)
Crea un archivo server.js en la raíz del proyecto. Este será el corazón de tu aplicación local.

Archivo: coffee-shop/server.js


Apply
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const prisma = new (require('@prisma/client')).PrismaClient();

const app = express();
const server = http.createServer(app);

// Configuración de Socket.io para permitir conexiones locales desde cualquier dispositivo en la red Wi-Fi
const io = new Server(server, {
  cors: {
    origin: "*", // En producción local restringe esto a tu IP específica si lo deseas
    methods: ["GET", "POST"]
  }
});

// Middleware básico para JSON y CORS (por seguridad futura)
app.use(cors());
app.use(express.json());

// Ruta inicial simple para verificar que el backend está corriendo
app.get('/api/health', (req, res) => {
  res.send('Coffee Shop Server: OK');
});

// --- LÓGICA DE TIEMPO REAL ---

io.on('connection', socket => {
    console.log(`🟢 Nuevo cliente conectado: ${socket.id}`);

    // Cargar órdenes pendientes existentes al conectar (para que no se pierdan datos)
    prisma.order.findMany({ where: { status: "PENDING" } }).then(orders => {
        socket.emit('load_pending_orders', orders);
    });

    // 1. Evento: Crear nueva orden desde el kiosco/cliente
    socket.on('create_order', async (data) => {
        try {
            const newOrder = await prisma.order.create({
                data: {
                    customer: data.customer,
                    items: JSON.stringify(data.items), // Guardamos lista como JSON simple
                    status: 'PENDING'
                }
            });
            
            console.log(`📝 Nueva orden creada por ${data.customer}`);
            
            // Notificar a TODOS los clientes conectados (incluyendo cocina y pantalla de espera)
            io.emit('order_added', newOrder); 
            
        } catch (error) {
            socket.emit('error', { message: 'Error al crear la orden' });
            console.error(error);
        }
    });

    // 2. Evento: Actualizar estado desde cocina/administración
    socket.on('update_order_status', async ({ orderId, newStatus }) => {
        try {
            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: { status: newStatus }
            });
            
            console.log(`⚡ Orden #${orderId} actualizada a: ${newStatus}`);
            
            // Notificar cambio de estado en tiempo real a todos
            io.emit('order_updated', updatedOrder);

        } catch (error) {
            socket.emit('error', { message: 'Error al actualizar orden' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔴 Cliente desconectado: ${socket.id}`);
    });
});

// Puerto y dirección de red
const PORT = process.env.PORT || 3001; // Usamos 3001 para diferenciar del frontend si usas Vite en 5173
server.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`💡 Para acceder desde otros dispositivos (celular/tablet), usa tu IP local: <TU_IP>:${PORT}`);
});
Paso 4: Configurar Frontend (React + Vite)
Desde la raíz del proyecto, genera el frontend con React y Tailwind CSS.

Crear app de React:

Run
npm create vite@latest client -- --template react
cd client
npm install socket.io-client lucide-react clsx tailwind-merge
npx tailwindcss init -p
Configurar Tailwind (edita client/tailwind.config.js): Asegúrate de que el contenido incluya los archivos:


Apply
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
}
Agregar CSS de Tailwind (edita client/src/index.css): Borra todo y pon esto:


Apply
@tailwind base;
@tailwind components;
@tailwind utilities;

body { background-color: #1a1a1a; color: white; } /* Fondo café oscuro */
Paso 5: Lógica del Frontend (Componentes Clave)
Vamos a crear dos vistas simples en un solo archivo para facilitar el prototipo, o separarlas si prefieres. Usaremos Socket.io Client directamente aquí.

A. Archivo de Configuración Socket (client/src/socket.js)
Para conectar al servidor correctamente (importante: usa la IP real si no es localhost):


Apply
// client/src/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = window.location.hostname === 'localhost' 
  ? `http://localhost:3001` 
  : `http://${window.location.host.split(':')[0]}:3001`; // Ajusta para red local si se despliega fuera de localhost

export const socket = io(SOCKET_URL, {
    autoConnect: true,
});
B. Pantalla Principal (Kiosco + Cocina) (client/src/App.jsx)
Este archivo contiene la lógica para enviar pedidos y recibir actualizaciones en tiempo real. He creado una interfaz dividida: Izquierda (Cliente), Derecha (Cocina/Admin).


Apply
// client/src/App.jsx
import { useState, useEffect } from 'react';
import { socket } from './socket';
import { Coffee, UtensilsCrossed, CheckCircle2, AlertTriangle } from 'lucide-react';

const ITEMS_MENU = [
  { id: 1, name: "Espresso", price: 2.50 },
  { id: 2, name: "Latte Macchiato", price: 3.50 },
  { id: 3, name: "Cappuccino", price: 3.00 },
  { id: 4, name: "Té de Menta", price: 2.80 }
];

function App() {
  // Estados globales
  const [orders, setOrders] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Escuchar cuando se carga una orden pendiente (al entrar)
    socket.on('load_pending_orders', (data) => setOrders(data));

    // Escuchar nueva orden en tiempo real
    socket.on('order_added', (newOrder) => {
      setOrders((prev) => [...prev, newOrder]);
      alert(`✅ Pedido de ${newOrder.customer} enviado con éxito!`);
      setSelectedItems({}); // Resetear selección
      setCustomerName('');   // Limpiar nombre
    });

    // Escuchar cambios de estado (ej: cocina marcando "Listo")
    socket.on('order_updated', (updated) => {
      setOrders((prev) => prev.map(o => o.id === updated.id ? updated : o));
    });

    return () => { 
        socket.off('load_pending_orders');
        socket.off('order_added');
        socket.off('order_updated'); 
    };
  }, []);

  const toggleItem = (id) => {
    setSelectedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sendOrder = () => {
    if (!customerName.trim()) return alert("Por favor ingresa tu nombre");
    
    const finalItems = Object.keys(selectedItems)
      .filter(key => selectedItems[key]) // Solo los seleccionados
      .map(id => ITEMS_MENU.find(i => i.id === parseInt(id)));

    socket.emit('create_order', { 
        customer: customerName, 
        items: finalItems 
    });
  };

  const updateStatus = (id, newStatus) => {
    socket.emit('update_order_status', { orderId: id, newStatus });
  };

  return (
    <div className="min-h-screen p-6 grid md:grid-cols-2 gap-8 font-sans">
      
      {/* --- IZQUIERDA: PANTALLA DE CLIENTE / QUIOSCO --- */}
      <div className="bg-zinc-900 rounded-xl shadow-lg border border-gray-700 p-6">
        <h1 className="text-3xl font-bold mb-2 text-yellow-500 flex items-center gap-2">
          ☕ Coffee Shop Kiosco
        </h1>
        <p className="mb-4 text-gray-400 text-sm">Realiza tu pedido desde cualquier dispositivo</p>

        {/* Formulario Cliente */}
        {!customerName && (
            <>
                <div className="bg-zinc-800 p-4 rounded-lg mb-6 border-l-4 border-yellow-500">
                    <h2 className="font-semibold text-white mb-1">📝 Tu Orden</h2>
                    
                    {/* Lista de items */}
                    <div className="space-y-2 mt-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {ITEMS_MENU.map(item => (
                            <label key={item.id} 
                                onClick={() => toggleItem(item.id)} 
                                className={`flex justify-between items-center p-2 rounded cursor-pointer transition ${selectedItems[item.id] ? 'bg-yellow-600 text-black' : 'bg-zinc-700 hover:bg-gray-600'} `}>
                                    <span>{item.name}</span>
                                    <input type="checkbox" checked={!!selectedItems[item.id]} className='accent-white'/>
                            </label>
                        ))}
                    </div>

                    {/* Input Nombre */}
                    <div className="mt-4">
                        <input 
                            type="text" placeholder="Tu nombre..." value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full p-3 bg-zinc-950 border border-gray-700 rounded-lg focus:outline-none focus:border-yellow-500 text-white placeholder-gray-600"
                        />
                    </div>

                    {/* Botón Enviar */}
                    <button onClick={sendOrder} disabled={!customerName || !Object.values(selectedItems).some(Boolean)} className="w-full mt-4 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition transform active:scale-95">
                        Confirmar Pedido 🚀
                    </button>
                </div>

                {/* Lista Visual de Pedidos (Solo referencia rápida) */}
                <h2 className="text-xl font-semibold mb-2 text-gray-300">Estado actual:</h2>
                {orders.length === 0 && <p className="text-sm italic text-gray-500">No hay pedidos pendientes...</p>}
                
                {/* Pedidos Pendientes */}
                {orders.filter(o => o.status !== 'READY').map(order => (
                    <div key={order.id} className={`flex justify-between items-center p-3 mb-2 rounded-lg border-l-4 ${order.status === 'PENDING' ? 'bg-blue-900/50 border-yellow-600' : 'bg-orange-900/50 border-orange-500'} shadow-sm`}>
                        <div>
                            <span className="font-bold text-white">#{order.id} - {order.customer}</span><br/>
                            <small className="text-xs opacity-80">{JSON.parse(order.items).map(i => i.name).join(', ')}</small>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${order.status === 'PENDING' ? 'bg-yellow-600 text-black' : 'bg-orange-500 text-white animate-pulse'}`}>
                            {order.status}
                        </span>
                    </div>
                ))}

                {/* Pedidos Listos (Histórico reciente) */}
                <h3 className="text-sm font-semibold mt-6 mb-2 text-gray-500 uppercase tracking-wider">Listados</h3>
                 {orders.filter(o => o.status === 'READY').map(order => (
                    <div key={order.id} className="flex justify-between items-center p-2 bg-green-900/20 border-l-4 border-green-500 rounded text-sm opacity-75">
                         <span>#{order.id}: {JSON.parse(order.items).map(i => i.name).join(', ')}</span>
                    </div>
                ))}

            </>
        )} else {
             {/* Vista de Cocina / Admin (Solo visible si quieres separar, aquí simplificado todo en uno) */}
             <div className="text-center text-gray-400">
                 <p>Para ver la vista del personal, abre otra pestaña o dispositivo.</p>
                 <button onClick={() => setCustomerName('')} className="mt-2 underline text-blue-400">Volver al kiosco</button>
             </div>
        }

      </div>

      {/* --- DERECHA: PANTALLA DE COCINA (Simulada) --- */}
      <div className="bg-zinc-950 rounded-xl shadow-lg border border-gray-700 p-6 flex flex-col">
        <h2 className="text-3xl font-bold mb-4 text-red-500 flex items-center gap-2">🔥 Cocina / Admin</h2>
        
        {/* Filtrar solo pendientes y en proceso */}
        {orders.filter(o => o.status !== 'READY').length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-gray-600 border-2 border-dashed rounded-xl">
                No hay órdenes activas. ¡Disfruta el café! ☕
            </div>
        ) : (
            orders.filter(o => o.status !== 'READY').map(order => {
                 const status = order.status; // PENDING, PREPARING
                
                 return (
                    <div key={order.id} className="bg-gray-800 p-4 rounded-lg mb-3 border-l-6 shadow-md transition-all hover:bg-gray-750" 
                         style={{borderLeftColor: status === 'PENDING' ? '#eab308' : '#f97316'}}>
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-xl">{order.customer}</h3>
                            <span className={`text-xs px-2 py-1 rounded font-mono ${status === 'PENDING' ? 'bg-yellow-900 text-yellow-200' : 'bg-orange-700 text-white animate-pulse'}`}>
                                {status.toUpperCase()}
                            </span>
                        </div>
                        
                    <ul className="mt-3 space-y-1 text-sm opacity-90">
                        {JSON.parse(order.items).map((item, idx) => (
                            <li key={idx} className="flex justify-between items-center border-b border-gray-700 pb-1 last:border-0 mb-2">
                                <span>{item.name}</span>
                                <span>${(idx === 0 ? item.price : 'N/A').toFixed(2)}</span> 
                            </li>
                        ))}
                    </ul>

                    {/* Botones de Acción (Solo visibles en la pantalla de cocina) */}
                    <div className="flex gap-3 mt-4 border-t pt-3 border-gray-700">
                        
                        {status === 'PENDING' && (
                            <button 
                                onClick={() => updateStatus(order.id, 'PREPARING')}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded shadow transition flex items-center justify-center gap-2"
                            >
                                <UtensilsCrossed size={18} /> Preparar
                            </button>