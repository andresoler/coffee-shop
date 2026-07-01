import { useState, useEffect } from 'react';
import { socket, connectSocket, disconnectSocket } from '../socket';
import { Coffee, CheckCircle2 } from 'lucide-react';

const ITEMS_MENU = [
  { id: 1, name: "Espresso", price: 2.50 },
  { id: 2, name: "Latte Macchiato", price: 3.50 },
  { id: 3, name: "Cappuccino", price: 3.00 },
  { id: 4, name: "Té de Menta", price: 2.80 }
];

export default function KioskView() {
  const [selectedItems, setSelectedItems] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [submittedCustomer, setSubmittedCustomer] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  useEffect(() => {
    // Conectar el socket sin token
    connectSocket();

    const handleConfirm = (newOrder) => {
      showFeedback(`✅ Pedido de ${newOrder.customer} enviado! ID: #${newOrder.id}`);
      setSelectedItems({});
      setCustomerName('');
    };

    socket.on('order_created_confirm', handleConfirm);

    return () => {
      socket.off('order_created_confirm', handleConfirm);
      disconnectSocket();
    };
  }, []);

  const toggleItem = (id) => {
    setSelectedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
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

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8 flex items-center justify-center font-sans">
      <div className="bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800 p-6 flex flex-col w-full max-w-xl min-h-[500px]">
        <h1 className="text-3xl font-extrabold mb-6 text-yellow-500 flex items-center justify-center gap-2">
          <Coffee className="animate-bounce text-yellow-500" /> Coffee Shop Kiosco
        </h1>

        {!submittedCustomer ? (
          <>
            <p className="text-zinc-400 text-sm mb-4 text-center">Selecciona tus bebidas preferidas y dinos tu nombre:</p>
            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 mb-6 flex-grow overflow-y-auto max-h-[300px] space-y-3">
              {ITEMS_MENU.map(item => (
                <label key={item.id} 
                  onClick={() => toggleItem(item.id)} 
                  className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all select-none border ${
                    selectedItems[item.id] 
                      ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400 font-semibold' 
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                  }`}>
                  <span>{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-80">${item.price.toFixed(2)}</span>
                    {selectedItems[item.id] && <CheckCircle2 size={18} className="text-yellow-500" />}
                  </div>
                </label>
              ))}
            </div>

            {/* Input Nombre */}
            <input 
              type="text" 
              placeholder="Tu nombre..." 
              value={customerName} 
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 text-white mb-4 shadow-inner text-center font-semibold"
            />

            <button 
              onClick={sendOrder} 
              disabled={!customerName.trim() || !Object.values(selectedItems).some(Boolean)} 
              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-zinc-800 text-black font-bold py-3.5 rounded-lg transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2">
              Confirmar Pedido 🚀
            </button>
          </>
        ) : (
          <div className="text-center my-auto flex flex-col items-center justify-center p-6 bg-zinc-950/50 rounded-lg border border-dashed border-zinc-800">
            <CheckCircle2 size={64} className="text-green-500 mb-4 animate-pulse" />
            <p className="font-semibold text-xl text-yellow-500 mb-2">¡Pedido Recibido!</p>
            <p className="text-zinc-300 mb-6">Gracias <span className="font-bold text-white">{submittedCustomer}</span>, tu pedido ya se está preparando en la cocina.</p>
            <button 
              onClick={() => setSubmittedCustomer('')} 
              className="bg-yellow-500 hover:bg-yellow-400 text-black py-2 px-6 rounded-lg font-bold transition-all shadow-md">
              Nuevo Pedido ☕
            </button>
          </div>
        )}
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="fixed bottom-10 right-10 bg-zinc-900 border border-yellow-500/30 text-white px-6 py-3 rounded-lg shadow-2xl animate-bounce border-l-4 border-l-yellow-500 font-semibold z-50">
          {feedbackMsg}
        </div>
      )}
    </div>
  );
}
