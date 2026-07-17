import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Lock, User, UserPlus, AlertCircle } from 'lucide-react';

export default function LoginView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

  // Verificar si hay algún administrador registrado al cargar
  useEffect(() => {
    fetch(`${API_URL}/api/admin/setup-status`)
      .then(res => res.json())
      .then(data => {
        setIsSetupRequired(data.isSetupRequired);
      })
      .catch(err => {
        console.error("Error al obtener estado de setup:", err);
      });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Credenciales incorrectas');
      }

      // Guardar el token e ir a la cocina
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', data.username);
      navigate('/kitchen');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      return setError('Las contraseñas no coinciden');
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al configurar el administrador');
      }

      setSuccessMessage('¡Administrador creado con éxito! Iniciando sesión...');
      
      // Auto-iniciar sesión
      const loginResponse = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const loginData = await loginResponse.json();

      localStorage.setItem('adminToken', loginData.token);
      localStorage.setItem('adminUser', loginData.username);
      
      setTimeout(() => {
        navigate('/kitchen');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl p-8 w-full max-w-md">
        
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-zinc-950 border border-zinc-800 rounded-full mb-4">
            <Coffee className="text-yellow-500 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            {isSetupRequired ? 'Crear Cuenta de Admin' : 'Panel de Control'}
          </h2>
          <p className="text-sm text-zinc-400 mt-2">
            {isSetupRequired 
              ? 'Configura las credenciales del primer administrador' 
              : 'Inicia sesión para gestionar los pedidos en tiempo real'
            }
          </p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-3.5 rounded-lg flex items-center gap-2 mb-6 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mensaje de Éxito */}
        {successMessage && (
          <div className="bg-green-900/20 border border-green-500/30 text-green-400 p-3.5 rounded-lg flex items-center gap-2 mb-6 text-sm animate-pulse">
            <Coffee size={18} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={isSetupRequired ? handleSetup : handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Usuario</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <User size={18} />
              </span>
              <input
                type="text"
                required
                placeholder="Nombre de usuario..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-lg text-white placeholder-zinc-600 outline-none transition-all font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Contraseña</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-lg text-white placeholder-zinc-600 outline-none transition-all font-semibold"
              />
            </div>
          </div>

          {isSetupRequired && (
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Confirmar Contraseña</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-lg text-white placeholder-zinc-600 outline-none transition-all font-semibold"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold py-3.5 rounded-lg transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span className="border-2 border-zinc-900 border-t-transparent rounded-full w-5 h-5 animate-spin"></span>
            ) : isSetupRequired ? (
              <>
                <UserPlus size={18} /> Configurar y Entrar
              </>
            ) : (
              <>
                <Lock size={18} /> Iniciar Sesión
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
