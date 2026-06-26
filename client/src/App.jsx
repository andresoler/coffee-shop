import { useState, useEffect } from 'react';
import { socket } from './socket'; // Asegúrate de importar este módulo
import { Coffee, UtensilsCrossed, CheckCircle2, AlertTriangle } from 'lucide-react';

const ITEMS_MENU = [
  { id: 1, name: "Espresso", price: 2.50 },
  { id: 2, name: "Latte Macchiato", price: 3.50 },
  { id: 3, name: "Cappuccino", price: 3.00 },
  { id: 4, name: "Té de Menta", price: 2.80 }
];

function App() {
  const [orders, setOrders] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [submittedCustomer, setSubmittedCustomer] = useState('');
  
  // Manejo de notificaciones simples en estado
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  useEffect(() => {
    socket.on('load_pending_orders', (data) => {
      console.log("Cargando órdenes pendientes:", data);
      setOrders(data); 
    });

    socket.on('order_added', (newOrder) => {
      setOrders(prev => [...prev, newOrder]);
      showFeedback(`✅ Pedido de ${newOrder.customer} enviado! ID: #${newOrder.id}`);
      setSelectedItems({}); 
      setCustomerName('');   
    });

    socket.on('order_updated', (updated) => {
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
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

  const showFeedback = (msg) => {
      setFeedbackMsg(msg);
      setTimeout(() => setFeedbackMsg(null), 3000);
  }

  const sendOrder = () => {
    const trimmedName = customerName.trim();
    if (!trimmedName) return alert("Por favor ingresa tu nombre");
    
    const finalItems = Object.keys(selectedItems)
      .filter(key => selectedItems[key]) 
      .map(id => ITEMS_MENU.find(i => i.id === parseInt(id)));

    setSubmittedCustomer(trimmedName);
    socket.emit('create_order', { customer: trimmedName, items: finalItems });
  };

  const updateStatus = (id, newStatus) => {
    socket.emit('update_order_status', { orderId: id, status: newStatus });
  };

  // Renderizar lista de pedidos compartida
  const OrdersList = () => {
      return orders.map(order => {
          // Nota: Prisma retorna objetos en v5+, stringifica en versiones anteriores. Ajuste seguro aquí:
          let parsedItems = [];
          try {
             if(typeof order.items === 'object') parsedItems = order.items;
             else if (typeof order.items === 'string') parsedItems = JSON.parse(order.items);
          } catch(e) {}

          return (
            <div key={order.id} className={`flex justify-between items-center p-3 mb-2 rounded-lg border-l-4 bg-zinc-800 ${order.status === 'PENDING' ? 'border-yellow-500' : order.status==='PREPARING'? 'border-orange-500':'border-green-500'} shadow-sm`}>
                <div>
                    <span className="font-bold text-white">#{order.id} - {order.customer}</span><br/>
                    <small className="text-xs opacity-80 flex gap-2">{parsedItems.map(i => i.name || i).join(', ')}</small>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  order.status === 'PENDING' ? 'bg-yellow-600 text-black animate-pulse' : 
                  order.status==='PREPARING' ? 'bg-orange-500 text-white' : 'bg-green-500 text-zinc-900'
                }`}>
                    {order.status}
                </span>
            </div>
          )
      });
  };

  return (
    <div className="min-h-screen p-4 md:p-6 grid lg:grid-cols-2 gap-8 font-sans">
      
      {/* --- IZQUIERDA: PANTALLA DE CLIENTE / QUIOSCO --- */}
      <div className="bg-zinc-900 rounded-xl shadow-lg border border-gray-700 p-6 flex flex-col h-full max-h-[85vh]">
        <h1 className="text-2xl font-bold mb-4 text-yellow-500 flex items-center gap-2 shrink-0">
          ☕ Coffee Shop Kiosco
        </h1>

        {!submittedCustomer ? (
            <>
                <div className="bg-zinc-800 p-4 rounded-lg border-l-4 border-yellow-500 mb-6 flex-grow overflow-y-auto custom-scrollbar space-y-3">
                    {ITEMS_MENU.map(item => (
                        <label key={item.id} 
                            onClick={() => toggleItem(item.id)} 
                            className={`flex justify-between items-center p-2 rounded cursor-pointer transition select-none ${selectedItems[item.id] ? 'bg-yellow-600 text-black' : 'bg-zinc-700 hover:bg-gray-600'} `}>
                                <span>{item.name}</span>
                                { selectedItems[item.id] && <CheckCircle2 size={16} className="ml-auto"/> }
                        </label>
                    ))}
                </div>

                {/* Input Nombre */}
                <input 
                    type="text" placeholder="Tu nombre..." value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-3 bg-zinc-950 border border-gray-700 rounded-lg focus:outline-none focus:border-yellow-500 text-white mb-4 shadow-inner"
                />

                <button onClick={sendOrder} disabled={!customerName || !Object.values(selectedItems).some(Boolean)} 
                    className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 rounded-lg transition transform active:scale-95 shrink-0">
                        Confirmar Pedido 🚀
                </button>
            </>
        ) : (
             <div className="text-center mt-auto pt-8 bg-zinc-950/50 p-4 rounded border-t border-dashed border-gray-700">
                 <p className="font-semibold text-yellow-500 mb-2">{submittedCustomer}, tu pedido está en marcha.</p>
                 <button onClick={() => setSubmittedCustomer('')} className="mt-2 text-xs bg-yellow-600 hover:bg-yellow-500 text-black py-1 px-3 rounded font-bold transition">
                     Nuevo Pedido ☕
                 </button>
             </div>
        )}

      </div>

      {/* --- DERECHA: PANTALLA DE COCINA / ADMIN --- */}
      <div className="bg-zinc-950 rounded-xl shadow-lg border border-gray-700 p-6 flex flex-col h-full">
        <h2 className="text-3xl font-bold mb-4 text-red-500 shrink-0">🔥 Cocina / Admin</h2>
        
        {orders.length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-gray-600 border-2 border-dashed rounded-xl bg-zinc-900/30">
                No hay órdenes activas. ¡Disfruta el café! ☕
            </div>
        ) : (
           <div className="space-y-4 overflow-y-auto max-h-[85vh] pb-6 pr-2 custom-scrollbar">
             {orders.filter(o => o.status !== 'READY').map(order => {
                 // Manejo seguro de parsing JSON items aquí para UI Admin
                 let parsedItems = [];
                try {
                   if(typeof order.items === 'object') parsedItems = order.items;
                   else if (typeof order.items === 'string') parsedItems = JSON.parse(order.items);
                } catch(e) {}

                 const status = order.status; 
                 
                 return (
                    <div key={order.id} className="bg-zinc-900 p-4 rounded-lg shadow-md border-l-8 transition-all hover:border-opacity-50" 
                         style={{borderLeftColor: status === 'PENDING' ? '#eab308' : '#f97316'}}>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-xl">{order.customer}</h3>
                            <span className={`text-xs px-2 py-1 rounded font-mono ${status === 'PENDING' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700' : 'bg-orange-700 text-white animate-pulse'}`}>
                                {status}
                            </span>
                        </div>

                         <ul className="mt-3 space-y-1 opacity-90">
                             {/* Renderizar items correctamente */}
                             {parsedItems.map((item, idx) => (
                                 // item puede ser objeto o string dependiendo de la version DB/Prisma
                                 typeof(item.name) !== 'undefined' 
                                 ? <li key={idx} className="text-sm flex justify-between"><span>{item.name}</span><span>${typeof(item.price)==='number'?item.price.toFixed(2):''}</span></li>
                                 : null // Fallback simple si es string directo
                             ))}

                         </ul>

                        {/* Botones de Acción */}
                        <div className="flex gap-3 mt-5 pt-4 border-t border-gray-700 shrink-0">
                            {status === 'PENDING' && (
                                <button 
                                    onClick={() => updateStatus(order.id, 'PREPARING')}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded shadow transition flex items-center justify-center gap-2 font-bold">
                                     <UtensilsCrossed size={18} /> Preparar 🍳
                                </button>
                            )}

                             {status === 'PREPARING' && (
                                <button onClick={() => updateStatus(order.id, 'READY')} className="flex-1 bg-green-600 hover:bg-green-500 text-black py-2 px-4 rounded shadow font-bold">Marcar Listo ✅</button>
                            )}

                             {status === 'PENDING' && ( // Fix for the button closing tag that was missing in source docs. 
                                <div className="w-full flex justify-center items-center gap-2 text-yellow-500 mb-1 mt-[-3rem]">⚠️ Acción requerida</div>
                            )}

                        </div>
                    </div>
                ); 
            })}
           </div>
        )}
        
         {/* Botón limpiar histórico para Admin (Extra UX) */}
          <button onClick={() => setOrders(prev=>prev.filter(o=> o.status==='READY'))} className="mt-auto text-sm underline text-gray-500 hover:text-red-400 self-start">Limpiar pedidos completados</button>
      </div>

        {/* Feedback Toast Overlay */}
        {feedbackMsg && <div className="fixed bottom-10 right-10 bg-black/80 text-white px-6 py-3 rounded-lg shadow-xl animate-bounce border-l-4 border-green-500">{feedbackMsg}</div>}
    </div>
  );
}

export default App;
