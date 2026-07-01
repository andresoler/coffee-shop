import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import KioskView from './views/KioskView';
import LoginView from './views/LoginView';
import KitchenView from './views/KitchenView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Quiosco del Cliente */}
        <Route path="/" element={<KioskView />} />
        
        {/* Login del Administrador */}
        <Route path="/kitchen/login" element={<LoginView />} />
        
        {/* Panel de Cocina/Administración */}
        <Route path="/kitchen" element={<KitchenView />} />
        
        {/* Redirección para cualquier otra ruta no definida */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
