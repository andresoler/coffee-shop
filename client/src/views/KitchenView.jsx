import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket, connectSocket, disconnectSocket } from '../socket';
import { UtensilsCrossed, CheckCircle2, LogOut, Coffee, Clock } from 'lucide-react';

export default function KitchenView() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');
  const adminUser = localStorage.getItem('adminUser') || 'Administrador';

  useEffect(() => {
    // Si no hay token, redirigir inmediatamente al login
    if (!token) {
      navigate('/kitchen/login');
      return;
    }

    // Conectar socket de admin pasando el token
    connectSocket(token);

    socket.on('load_pending_orders', (data) => {
      console.log("Órdenes recibidas en cocina:", data);
      setOrders(data);
    });

    socket.on('order_added', (newOrder) => {
      setOrders(prev => {
        // Evitar duplicados
        if (prev.some(o => o.id === newOrder.id)) return prev;
        return [...prev, newOrder];
      });
    });

    socket.on('order_updated', (updated) => {
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    });

    socket.on('error', (err) => {
      console.error("Error de socket recibido:", err);
      if (err === 'Authentication error' || err.includes('unauthorized')) {
        handleLogout();
      }
    });

    return () => {
      socket.off('load_pending_orders');
      socket.off('order_added');
      socket.off('order_updated');
      socket.off('error');
      disconnectSocket();
    };
  }, [token]);

  const updateStatus = (id, newStatus) => {
    socket.emit('update_order_status', { orderId: id, status: newStatus });
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    disconnectSocket();
    navigate('/kitchen/login');
  };

  // Filtrar órdenes activas (no completadas listas)
  const activeOrders = orders.filter(o => o.status !== 'READY');

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col">
      {/* Navbar Superior */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <Coffee className="text-yellow-500 w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Panel de Cocina <span className="bg-red-950 text-red-400 border border-red-800 text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>
            </h1>
            <p className="text-xs text-zinc-400">Usuario activo: <span className="text-zinc-200 font-semibold">{adminUser}</span></p>
          </div>
        </div>

        <button 
          onClick={handleLogout} 
          className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 hover:bg-red-950/20 hover:border-red-900/50 hover:text-red-400 text-zinc-400 text-sm font-semibold px-4 py-2 rounded-lg transition-all"
        >
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </header>

      {/* Área Principal de Contenido */}
      <main className="flex-grow p-6 overflow-hidden flex flex-col">
        {activeOrders.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-850 rounded-2xl bg-zinc-900/10 p-12">
            <CheckCircle2 size={56} className="text-green-500/30 mb-4" />
            <h3 className="text-lg font-bold text-zinc-400">No hay órdenes activas</h3>
            <p className="text-sm text-zinc-600 mt-1">Los nuevos pedidos de los clientes aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto max-h-[calc(100vh-140px)] pb-8 pr-2 custom-scrollbar">
            {activeOrders.map(order => {
              let parsedItems = [];
              try {
                if (typeof order.items === 'object') {
                  parsedItems = order.items;
                } else if (typeof order.items === 'string') {
                  parsedItems = JSON.parse(order.items);
                }
              } catch (e) {
                console.error("Error al parsear items de la orden", e);
              }

              const status = order.status;

              return (
                <div 
                  key={order.id} 
                  className={`bg-zinc-900 border ${
                    status === 'PENDING' ? 'border-yellow-500/20 hover:border-yellow-500/40' : 'border-orange-500/20 hover:border-orange-500/40'
                  } rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-300 hover:translate-y-[-2px]`}
                >
                  {/* Encabezado Tarjeta */}
                  <div className={`p-4 flex justify-between items-center ${
                    status === 'PENDING' ? 'bg-yellow-500/5' : 'bg-orange-500/5'
                  } border-b border-zinc-800`}>
                    <div>
                      <h3 className="font-extrabold text-lg text-white">#{order.id}</h3>
                      <span className="text-zinc-400 font-bold text-sm">{order.customer}</span>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full uppercase tracking-wider ${
                      status === 'PENDING' 
                        ? 'bg-yellow-900/20 border border-yellow-700 text-yellow-400 animate-pulse' 
                        : 'bg-orange-950 border border-orange-800 text-orange-400'
                    }`}>
                      {status === 'PENDING' ? 'Pendiente' : 'Preparando'}
                    </span>
                  </div>

                  {/* Detalle de Bebidas */}
                  <div className="p-4 flex-grow">
                    <ul className="space-y-2">
                      {parsedItems.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center text-sm border-b border-dashed border-zinc-800 pb-1.5 last:border-b-0">
                          <span className="text-zinc-200 font-medium">{item.name || item}</span>
                          {item.price && <span className="text-zinc-500 text-xs">${item.price.toFixed(2)}</span>}
                        </li>
                      ))}
                    </ul>
                    
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs mt-4">
                      <Clock size={12} />
                      <span>Recibido a las {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Acciones de la Cocina */}
                  <div className="p-4 bg-zinc-950 border-t border-zinc-800 mt-auto">
                    {status === 'PENDING' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'PREPARING')}
                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-md"
                      >
                        <UtensilsCrossed size={16} /> Preparar bebida
                      </button>
                    )}

                    {status === 'PREPARING' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'READY')}
                        className="w-full bg-green-600 hover:bg-green-500 text-black font-extrabold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-md"
                      >
                        <CheckCircle2 size={16} /> Marcar como Listo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
