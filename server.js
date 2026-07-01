// coffee-shop-app/server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});
const prisma = new PrismaClient({ adapter, log: ['query', 'error'] }); // Logs útiles para depuración local

const app = express();
const server = http.createServer(app);

// Configuración CORS permisiva
const io = new Server(server, {
  cors: { origin: "*" }, 
});

app.use(cors());
app.use(express.json());

// --- API Health Check simple ---
app.get('/api/health', async (req, res) => {
  await prisma.$connect();
  res.json({ status: "OK", serverId: process.env.NODE_ID || 'local' });
});

// --- API DE AUTENTICACIÓN Y SETUP DE ADMIN ---

// Verificar si se requiere configuración inicial de administrador
app.get('/api/admin/setup-status', async (req, res) => {
  try {
    const adminCount = await prisma.admin.count();
    res.json({ isSetupRequired: adminCount === 0 });
  } catch (err) {
    res.status(500).json({ error: "Error al verificar estado de configuración" });
  }
});

// Registrar el primer administrador (solo si no existe ninguno)
app.post('/api/admin/setup', async (req, res) => {
  try {
    const adminCount = await prisma.admin.count();
    if (adminCount > 0) {
      return res.status(400).json({ error: "El administrador ya está configurado" });
    }
    
    const { username, password } = req.body;
    if (!username || !password || username.trim().length < 3 || password.trim().length < 6) {
      return res.status(400).json({ error: "Datos inválidos. El usuario debe tener al menos 3 caracteres y la contraseña al menos 6." });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.admin.create({
      data: {
        username: username.trim(),
        password: hashedPassword
      }
    });
    
    res.json({ status: "success", message: "Administrador creado correctamente", username: newAdmin.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Login del administrador
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }
    
    const admin = await prisma.admin.findUnique({
      where: { username: username.trim() }
    });
    
    if (!admin) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }
    
    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }
    
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ status: "success", token, username: admin.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Verificar token JWT del administrador
app.get('/api/admin/verify', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "No autorizado" });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, username: decoded.username });
  } catch (err) {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
});

// --- MIDDLEWARE SOCKET.IO PARA AUTENTICACIÓN ---
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log(`⚠️ Socket ${socket.id} falló autenticación JWT: ${err.message}`);
        socket.isAdmin = false;
        return next(); // Permitimos la conexión, pero no como administrador
      }
      socket.isAdmin = true;
      socket.adminUser = decoded.username;
      console.log(`🔑 Socket ${socket.id} autenticado como Admin: ${decoded.username}`);
      next();
    });
  } else {
    socket.isAdmin = false;
    next();
  }
});

// --- LÓGICA SOCKET.IO TIEMPO REAL ---
io.on('connection', socket => {
    console.log(`🟢 Cliente conectado: ${socket.id} (Admin: ${socket.isAdmin})`);

    // Si es administrador, unir al canal de administradores y cargar órdenes activas
    if (socket.isAdmin) {
        socket.join('admins');
        
        prisma.order.findMany({ where: {} }).then(orders => {
            socket.emit('load_pending_orders', orders); 
        }).catch(err => {
            console.error("Error al cargar órdenes para admin:", err);
        });
    }

    // Crear orden (puede hacerlo cualquier quiosco o administrador)
    socket.on('create_order', async (data) => {
        try {
            const newOrder = await prisma.order.create({
                data: {
                    customer: data.customer,
                    items: JSON.stringify(data.items), 
                    status: 'PENDING'
                }
            });
            
            console.log(`📝 Orden #${newOrder.id} creada por ${data.customer}`);
            
            // Confirmación al socket emisor (quiosco)
            socket.emit('order_created_confirm', newOrder);
            
            // Notificar a todos los administradores en el canal 'admins'
            io.to('admins').emit('order_added', newOrder); 
        } catch (err) {
            socket.emit('error', err.message || "Error creando orden");
            console.error(err);
        }
    });

    // Actualizar estado de orden (solo permitido para administradores)
    socket.on('update_order_status', async ({ orderId, status }) => {
        if (!socket.isAdmin) {
            console.log(`🛑 Intento de actualización de orden no autorizado por socket ${socket.id}`);
            return socket.emit('error', 'No autorizado para realizar esta acción');
        }

        try {
            const updated = await prisma.order.update({ 
                where: { id: orderId }, 
                data: { status }
            });
            
            // Notificar a todos los administradores
            io.to('admins').emit('order_updated', updated);
            console.log(`⚡ Orden #${orderId} -> ${status} por Admin: ${socket.adminUser}`);

        } catch (err) {
            socket.emit('error', err.message);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔴 Desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Coffee Shop Backend iniciado en puerto ${PORT}`);
});
