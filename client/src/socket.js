import { io } from 'socket.io-client';

// Si estás probando fuera del host, ajusta a tu IP (ej: http://192.168.x.x:3001)
// En desarrollo, conectamos al mismo host/IP que sirve la web pero en el puerto del backend (3001).
// En producción (cuando el servidor sirve el build estático), se usa la misma URL de origen (undefined).
const SOCKET_URL = import.meta.env.DEV 
  ? `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_PORT_SOCKET || 3001}` 
  : undefined;

export const socket = io(SOCKET_URL, { autoConnect: true });
