import { io } from 'socket.io-client';

// El servidor corre en el puerto 3001 en desarrollo local
const URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

export const socket = io(URL, {
  autoConnect: false
});

/**
 * Conecta el socket con el servidor, adjuntando opcionalmente el token JWT.
 * @param {string|null} token - El token JWT del administrador.
 */
export const connectSocket = (token = null) => {
  if (token) {
    socket.auth = { token };
  } else {
    socket.auth = {};
  }
  
  if (!socket.connected) {
    socket.connect();
  }
};

/**
 * Desconecta el socket si está conectado.
 */
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
