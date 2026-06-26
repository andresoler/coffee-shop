// coffee-shop-app/server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
require('dotenv').config();

const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter, log: ['query', 'error'] }); // Logs útiles para depuración local

const app = express();
const server = http.createServer(app);

// Configuración CORS permisiva (esencial si cliente/servidor van en puertos diferentes o redes LAN)
const io = new Server(server, {
  cors: { origin: "*" }, 
});

app.use(cors());
app.use(express.json());

// Middleware para servir frontend estático compilado (cuando lo descomplies)
// app.use(express.static('../client/dist')); 

// --- API Health Check simple ---
app.get('/api/health', async (req, res) => {
  await prisma.$connect(); // Verifica conexión DB
  res.json({ status: "OK", serverId: process.env.NODE_ID || 'local' });
});

// --- LÓGICA SOCKET.IO TIEMPO REAL ---
io.on('connection', socket => {
    console.log(`🟢 Cliente conectado: ${socket.id}`);

    // Al conectar, cargar órdenes activas (no cerradas/ready definitivamente) para sincronizar UI inmediatamente
    prisma.order.findMany({ where: {} }).then(orders => {
        io.emit('load_pending_orders', orders); 
    });

    socket.on('create_order', async (data) => {
        try {
            const newOrder = await prisma.order.create({
                data: {
                    customer: data.customer,
                    items: JSON.stringify(data.items), // Guardado como string de array JSON en SQLite Primsa lo manejará nativamente con la nueva API si es 4.0+, 
                                                      // pero para seguridad usaremos raw object en JS y luego parseamos DB o confiamos en @prisma/client v5+
                    status: 'PENDING'
                }
            });
            
            console.log(`📝 Orden #${newOrder.id} creada`);
            
            io.emit('order_added', newOrder); 
        } catch (err) {
            socket.emit('error', err.message || "Error creando orden");
            console.error(err);
        }
    });

    socket.on('update_order_status', async ({ orderId, status }) => {
        try {
            const updated = await prisma.order.update({ where: { id: orderId }, data: { status }});
            
            io.emit('order_updated', updated);
            console.log(`⚡ Orden #${orderId} -> ${status}`);

        } catch (err) {
            socket.emit('error', err.message);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔴 Desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3001; // Cambiado a 3001 para diferenciar de Vite default (5173)

server.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Coffee Shop Backend iniciado en puerto ${PORT}`);
});
