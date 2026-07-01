import { useState, useEffect } from 'react';
import { socket, connectSocket, disconnectSocket } from '../socket';
import { Coffee, CheckCircle2, Flame, AlertCircle } from 'lucide-react';

const ITEMS_MENU = [
  { id: 1, name: "Espresso", price: 2.50 },
  { id: 2, name: "Latte Macchiato", price: 3.50 },
  { id: 3, name: "Cappuccino", price: 3.00 },
  { id: 4, name: "Té de Menta", price: 2.80 }
];

export default function KioskView() {
  // Estado del Quiosco
  const [selectedItems, setSelectedItems] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [submittedCustomer, setSubmittedCustomer] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Estado del Tablero de Turnos
  const [publicOrders, setPublicOrders] = useState([]);

  useEffect(() => {
    // Conectar el socket sin token
    connectSocket();

    // Carga inicial y actualizaciones del tablero público
    socket.on('load_public_orders', (data) => {
      setPublicOrders(data);
    });

    socket.on('public_orders_update', (data) => {
      setPublicOrders(data);
    });

    const handleConfirm = (newOrder) => {
      showFeedback(`✅ ¡Pedido #${newOrder.id} de ${newOrder.customer} recibido!`);
      setSelectedItems({});
      setCustomerName('');
    };

    socket.on('order_created_confirm', handleConfirm);

    return () => {
      socket.off('load_public_orders');
      socket.off('public_orders_update');
      socket.off('order_created_confirm', handleConfirm);
      disconnectSocket();
    };
  }, []);

  const toggleItem = (id) => {
    setSelectedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const sendOrder = () => {
    const trimmedName = customerName.trim();
    if (!trimmedName) return alert("Por favor ingresa tu nombre");
    
    const finalItems = Object.keys(selectedItems)
      .filter(key => selectedItems[key]) 
      .map(id => ITEMS_MENU.find(i => i.id === parseInt(id)));

    setSubmittedCustomer(trimmedName);
    socket.emit('create_order', { customer: trimmedName, items: finalItems });
  };

  // Filtrar órdenes públicas
  const preparingOrders = publicOrders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING');
  const readyOrders = publicOrders.filter(o => o.status === 'READY');

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8 flex items-center justify-center font-sans text-white">
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* --- COLUMNA IZQUIERDA: FORMULARIO DEL QUIOSCO (7 COLS) --- */}
        <div className="lg:col-span-7 bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 p-6 md:p-8 flex flex-col min-h-[550px] transition-all duration-300">
          <h1 className="text-3xl font-black mb-2 text-yellow-500 flex items-center gap-3">
            <Coffee className="animate-bounce text-yellow-500" /> Coffee Shop Kiosco
          </h1>
          <p className="text-zinc-400 text-sm mb-6">Realiza tu orden y sigue el estado de tu café a la derecha</p>

          {!submittedCustomer ? (
            <>
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 mb-6 flex-grow overflow-y-auto max-h-[320px] space-y-3 custom-scrollbar">
                {ITEMS_MENU.map(item => (
                  <label key={item.id} 
                    onClick={() => toggleItem(item.id)} 
                    className={`flex justify-between items-center p-4 rounded-xl cursor-pointer transition-all border select-none ${
                      selectedItems[item.id] 
                        ? 'bg-yellow-600/10 border-yellow-500 text-yellow-400 font-semibold' 
                        : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800/80 text-zinc-300'
                    }`}>
                    <span>{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold opacity-70">${item.price.toFixed(2)}</span>
                      {selectedItems[item.id] ? (
                        <CheckCircle2 size={20} className="text-yellow-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-zinc-700"></div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* Input Nombre */}
              <input 
                type="text" 
                placeholder="Ingresa tu nombre..." 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-4 bg-zinc-950 border border-zinc-850 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 text-white mb-6 shadow-inner text-center font-bold text-lg"
              />

              <button 
                onClick={sendOrder} 
                disabled={!customerName.trim() || !Object.values(selectedItems).some(Boolean)} 
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-zinc-800 text-black font-extrabold py-4 rounded-xl transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2 text-lg shrink-0"
              >
                Confirmar Pedido 🚀
              </button>
            </>
          ) : (
            <div className="text-center my-auto flex flex-col items-center justify-center p-8 bg-zinc-950/50 rounded-xl border border-dashed border-zinc-800">
              <CheckCircle2 size={72} className="text-green-500 mb-4 animate-pulse" />
              <p className="font-extrabold text-2xl text-yellow-500 mb-2">¡Pedido Enviado!</p>
              <p className="text-zinc-300 text-base max-w-sm mb-8">
                Gracias <span className="font-bold text-white">{submittedCustomer}</span>. 
                Revisa el **Tablero de Turnos** al costado para ver cuándo está listo.
              </p>
              <button 
                onClick={() => setSubmittedCustomer('')} 
                className="bg-yellow-500 hover:bg-yellow-400 text-black py-3 px-8 rounded-xl font-bold transition-all shadow-md text-sm"
              >
                Hacer otro Pedido ☕
              </button>
            </div>
          )}
        </div>

        {/* --- COLUMNA DERECHA: TABLERO DE TURNOS SIMPLIFICADO (5 COLS) --- */}
        <div className="lg:col-span-5 bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col min-h-[550px] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-4 mb-4 shrink-0">
            <Flame className="text-orange-500 w-5 h-5 animate-pulse" />
            <h2 className="text-xl font-black uppercase tracking-wider text-zinc-100">Tablero de Turnos</h2>
          </div>

          <div className="flex-grow grid grid-rows-2 gap-4 overflow-hidden h-[450px]">
            {/* Fila: Preparando */}
            <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-4 flex flex-col overflow-hidden">
              <span className="text-xs font-extrabold uppercase tracking-wider text-orange-400 flex justify-between mb-2 shrink-0">
                <span>Preparando 🍳</span>
                <span className="bg-orange-950 px-2 py-0.5 rounded text-orange-300 border border-orange-900">{preparingOrders.length}</span>
              </span>

              <div className="flex-grow overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {preparingOrders.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center my-auto italic">Sin pedidos preparando</p>
                ) : (
                  preparingOrders.map(o => (
                    <div key={o.id} className="bg-zinc-900/60 border border-zinc-850/80 rounded-lg p-2.5 flex justify-between items-center text-sm">
                      <span className="font-extrabold text-white">#{o.id}</span>
                      <span className="text-zinc-300 font-bold max-w-[100px] truncate">{o.customer}</span>
                      <span className="text-[10px] bg-orange-900/10 text-orange-400 border border-orange-850 px-1.5 py-0.5 rounded uppercase font-bold animate-pulse">Cocinando</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Fila: Listo para retirar */}
            <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-4 flex flex-col overflow-hidden">
              <span className="text-xs font-extrabold uppercase tracking-wider text-green-400 flex justify-between mb-2 shrink-0">
                <span>Listos ☕</span>
                <span className="bg-green-950 px-2 py-0.5 rounded text-green-300 border border-green-900">{readyOrders.length}</span>
              </span>

              <div className="flex-grow overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {readyOrders.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center my-auto italic">Ninguno por ahora...</p>
                ) : (
                  readyOrders.map(o => (
                    <div key={o.id} className="bg-green-500/10 border border-green-500/40 rounded-lg p-2.5 flex justify-between items-center text-sm animate-pulse">
                      <span className="font-extrabold text-white">#{o.id}</span>
                      <span className="text-green-300 font-extrabold max-w-[100px] truncate">{o.customer}</span>
                      <span className="text-[10px] bg-green-950 text-green-400 border border-green-700 px-1.5 py-0.5 rounded uppercase font-black">¡RETIRAR!</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="fixed bottom-6 right-6 bg-zinc-900 border border-yellow-500/30 text-white px-6 py-3 rounded-lg shadow-2xl animate-bounce border-l-4 border-l-yellow-500 font-semibold z-50 text-sm">
          {feedbackMsg}
        </div>
      )}
    </div>
  );
}
