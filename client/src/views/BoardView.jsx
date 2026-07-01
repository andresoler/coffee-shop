import { useState, useEffect } from 'react';
import { socket, connectSocket, disconnectSocket } from '../socket';
import { Coffee, Flame, CheckCircle, Clock } from 'lucide-react';

export default function BoardView() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Conectar el socket sin token (público)
    connectSocket();

    socket.on('load_public_orders', (data) => {
      setOrders(data);
    });

    socket.on('public_orders_update', (data) => {
      setOrders(data);
    });

    return () => {
      socket.off('load_public_orders');
      socket.off('public_orders_update');
      disconnectSocket();
    };
  }, []);

  // Filtrar órdenes por estado
  const preparingOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING');
  const readyOrders = orders.filter(o => o.status === 'READY');

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col p-6 overflow-hidden">
      {/* Encabezado del Tablero */}
      <header className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-8 py-5 flex justify-between items-center mb-6 shadow-2xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl animate-pulse">
            <Coffee className="text-yellow-500 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Estado de Pedidos</h1>
            <p className="text-sm text-zinc-400">Sigue el estado de tu café en tiempo real</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-2 text-zinc-400 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 font-medium">
          <Clock size={16} />
          <span>Pantalla de Turnos</span>
        </div>
      </header>

      {/* Columnas de Estado */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden h-[calc(100vh-140px)]">
        
        {/* Columna: En Preparación */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-xl">
          <div className="p-6 bg-zinc-900 border-b border-zinc-850 flex items-center gap-3 shrink-0">
            <Flame className="text-orange-500 animate-pulse w-7 h-7" />
            <h2 className="text-2xl font-black uppercase tracking-wider text-orange-400">Preparando 🍳</h2>
            <span className="ml-auto bg-orange-950 text-orange-400 px-3 py-1 rounded-full text-sm font-bold border border-orange-800">
              {preparingOrders.length}
            </span>
          </div>

          <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">
            {preparingOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 font-semibold text-lg border border-dashed border-zinc-800/40 rounded-2xl">
                Sin pedidos en preparación
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {preparingOrders.map(order => (
                  <div 
                    key={order.id} 
                    className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-5 flex items-center justify-between shadow-md transition-all hover:border-orange-500/20"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Orden</span>
                      <span className="text-3xl font-extrabold text-white mt-1">#{order.id}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-zinc-300 block max-w-[120px] truncate">{order.customer}</span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-orange-400 font-bold uppercase tracking-wider mt-1">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></span>
                        Cocinando
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna: Listos para retirar */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-xl">
          <div className="p-6 bg-zinc-900 border-b border-zinc-850 flex items-center gap-3 shrink-0">
            <CheckCircle className="text-green-500 w-7 h-7" />
            <h2 className="text-2xl font-black uppercase tracking-wider text-green-400">Listos para Retirar ☕</h2>
            <span className="ml-auto bg-green-950 text-green-400 px-3 py-1 rounded-full text-sm font-bold border border-green-800">
              {readyOrders.length}
            </span>
          </div>

          <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">
            {readyOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 font-semibold text-lg border border-dashed border-zinc-800/40 rounded-2xl animate-pulse">
                Esperando pedidos listos...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {readyOrders.map(order => (
                  <div 
                    key={order.id} 
                    className="bg-green-600/10 border-2 border-green-500/50 rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-green-950/20 animate-pulse"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-green-400/80 font-bold uppercase tracking-wider">Orden</span>
                      <span className="text-4xl font-black text-white mt-0.5">#{order.id}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-green-300 block max-w-[120px] truncate">{order.customer}</span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-green-400 font-black uppercase tracking-wider mt-1 bg-green-950/60 border border-green-700/50 px-2 py-0.5 rounded-md">
                        ¡RECOGER!
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
