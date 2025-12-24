import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  Zap, 
  Target, 
  ShieldCheck, 
  Menu, 
  X, 
  ChevronRight, 
  DollarSign, 
  BarChart2, 
  Activity,
  Flame,
  Clock,
  Crown,
  Plus,
  Trash2,
  Lock,
  LogOut,
  Save,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Pencil,
  Link as LinkIcon
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc,
  onSnapshot, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

// =================================================================
// ⚠️ ZONA DE CONFIGURACIÓN ⚠️
// =================================================================
// Pega aquí tus claves de Firebase (las mismas que usaste para la base de datos).
// NOTA: Ya NO necesitamos 'storageBucket' porque usaremos enlaces directos.

const firebaseConfig = {
  apiKey: "AIzaSyC5-qh9m9P1sVy6bMnNGPY9e6SmvOfAsF0",
  authDomain: "midas-usa-66b2c.firebaseapp.com",
  projectId: "midas-usa-66b2c",
  storageBucket: "midas-usa-66b2c.firebasestorage.app",
  messagingSenderId: "112896246382",
  appId: "1:112896246382:web:b90932ecd679c9288d5c7f"
};
// =================================================================

// Inicialización de Servicios (Sin Storage)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'midas-production';

const App = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Estados de Datos
  const [predictions, setPredictions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estados Admin
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Estados Edición
  const [editingId, setEditingId] = useState(null); 
  
  const [newBet, setNewBet] = useState({
    sport: 'Futbol',
    league: '',
    match: '',
    prediction: '',
    odds: '',
    confidence: 80,
    status: 'normal',
    time: '',
    img: ''
  });

  // Configuración Inicial
  useEffect(() => {
    document.title = "PronosticosMIDAS";
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'icon';
    link.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👑</text></svg>";
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  // Autenticación
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Error Auth:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // URL Admin Secreta
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('access') === 'jvadminaadd') {
      setShowLoginModal(true);
    }
  }, []);

  // Carga de Datos
  useEffect(() => {
    if (!user) return;

    const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'midas_predictions')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let preds = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      preds.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
      });

      setPredictions(preds);
      setLoading(false);
    }, (error) => {
      console.error("Error Firestore:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Scroll Navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- HANDLERS ---

  const handleLogin = (e) => {
    e.preventDefault();
    if (adminPass === 'MIDAS') { 
      setIsAdmin(true);
      setShowLoginModal(false);
      setAdminPass('');
      setLoginError('');
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.pushState({path:newUrl},'',newUrl);
    } else {
      setLoginError('Acceso Denegado.');
    }
  };

  const handleEditBet = (bet) => {
    setNewBet({
      sport: bet.sport,
      league: bet.league,
      match: bet.match,
      prediction: bet.prediction,
      odds: bet.odds,
      confidence: bet.confidence,
      status: bet.status,
      time: bet.time,
      img: bet.img || ''
    });
    setEditingId(bet.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setNewBet({
      sport: 'Futbol',
      league: '',
      match: '',
      prediction: '',
      odds: '',
      confidence: 80,
      status: 'normal',
      time: '',
      img: ''
    });
    setEditingId(null);
  };

  const handleAddBet = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Usamos la URL que pegó el usuario o una por defecto
      let finalImageUrl = newBet.img;
      
      if (!finalImageUrl) {
          finalImageUrl = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800';
      }

      const betData = {
        ...newBet,
        img: finalImageUrl,
        odds: parseFloat(newBet.odds),
        confidence: parseInt(newBet.confidence),
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'midas_predictions', editingId), betData);
        alert('¡Pronóstico Actualizado!');
      } else {
        betData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'midas_predictions'), betData);
        alert('¡Pronóstico Publicado!');
      }

      handleCancelEdit();

    } catch (error) {
      console.error("Error guardar:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteBet = async (id) => {
    if (confirm('¿Eliminar pronóstico?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'midas_predictions', id));
        if (editingId === id) handleCancelEdit();
      } catch (error) {
        console.error("Error eliminar:", error);
      }
    }
  };

  const filteredPredictions = activeTab === 'all' 
    ? predictions 
    : predictions.filter(p => p.sport.toLowerCase() === activeTab.toLowerCase());

  // --- Componente Tarjeta ---
  const BetCard = ({ data, isAdminMode }) => (
    <div className="group relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-amber-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col h-full">
      {isAdminMode && (
        <div className="absolute top-2 right-2 z-50 flex gap-2">
          <button onClick={() => handleEditBet(data)} className="bg-blue-500/80 hover:bg-blue-600 text-white p-2 rounded-full backdrop-blur-md">
            <Pencil size={16} />
          </button>
          <button onClick={() => handleDeleteBet(data.id)} className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-md">
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Ajuste de altura de imagen a h-40 (160px) para que no se vea tan grande */}
      <div className="absolute inset-0 h-40 w-full"> 
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900 z-10" />
        <img 
          src={data.img || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800"} 
          alt={data.match}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-700" 
          onError={(e) => {
            e.target.onerror = null; 
            e.target.src = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800'
          }}
        />
      </div>

      {/* Ajuste de margen superior a mt-24 para compensar la nueva altura de imagen */}
      <div className="relative z-20 p-5 mt-24 flex-grow flex flex-col"> 
        <div className="flex justify-between items-center mb-4">
          <span className="bg-slate-900/90 backdrop-blur-md text-amber-400 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/20 uppercase tracking-wider flex items-center gap-1">
            {data.sport}
          </span>
          {data.status === 'hot' && (
            <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-slate-900/90 border border-red-500/20 px-2 py-1 rounded-full animate-pulse">
              <Flame size={12} /> HOT PICK
            </span>
          )}
        </div>

        <div className="mb-4 flex-grow">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1 flex items-center gap-1">
            <Clock size={12} /> {data.time} • {data.league}
          </p>
          <h3 className="text-white text-xl font-bold leading-tight group-hover:text-amber-400 transition-colors">
            {data.match}
          </h3>
        </div>

        <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-slate-700/50 mb-4 group-hover:border-amber-500/30 transition-colors">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-slate-400 text-xs uppercase font-bold">Tu Apuesta</p>
              <p className="text-lg font-bold text-emerald-400">{data.prediction}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs uppercase font-bold">Cuota</p>
              <p className="text-2xl font-black text-white">{Number(data.odds).toFixed(2)}</p>
            </div>
          </div>
          
          <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full" 
              style={{ width: `${data.confidence}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-amber-400 mt-1 font-bold">{data.confidence}% Probabilidad</p>
        </div>

        <button className="w-full bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 mt-auto">
          Ver Análisis <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500 selection:text-slate-900">
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/90 backdrop-blur-lg border-b border-slate-800' : 'bg-transparent'}`}>
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <Crown className="text-slate-900" size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xl md:text-2xl font-black text-white tracking-tighter italic">Pronosticos<span className="text-amber-400">MIDAS</span></span>
          </a>
          <div className="hidden md:flex items-center gap-8 font-medium text-sm">
            <a href="#" className="text-white hover:text-amber-400 transition-colors">Pronósticos</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">VIP</a>
            {isAdmin && (<div className="flex items-center gap-4"><span className="text-emerald-400 text-xs font-bold uppercase border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 rounded-full">Modo Admin Activo</span><button onClick={() => setIsAdmin(false)} className="text-slate-400 hover:text-red-400"><LogOut size={20} /></button></div>)}
          </div>
          <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? <X /> : <Menu />}</button>
        </div>
      </nav>

      {showLoginModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
            <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2"><ShieldCheck className="text-amber-500" /> Acceso Admin</h2>
            <p className="text-slate-400 text-sm mb-6">Introduce la clave maestra.</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" placeholder="Contraseña..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} />
              {loginError && <p className="text-red-400 text-sm font-bold flex items-center gap-1"><AlertCircle size={14}/> {loginError}</p>}
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-xl">Entrar al Panel</button>
            </form>
          </div>
        </div>
      )}

      {isAdmin && (
        <section className="pt-32 pb-10 container mx-auto px-6">
          <div className={`border rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(245,158,11,0.1)] transition-colors ${editingId ? 'bg-slate-900/90 border-blue-500/50' : 'bg-slate-900 border-amber-500/30'}`}>
            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
              {editingId ? <Pencil className="text-blue-400" /> : <Zap className="text-amber-400" />} {editingId ? 'Editar Pronóstico' : 'Crear Pronóstico'}
            </h2>
            
            <form onSubmit={handleAddBet} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Deporte</label><select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" value={newBet.sport} onChange={e => setNewBet({...newBet, sport: e.target.value})}><option>Futbol</option><option>NBA</option><option>Tenis</option><option>UFC</option><option>MLB</option></select></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Liga</label><input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" value={newBet.league} onChange={e => setNewBet({...newBet, league: e.target.value})} required /></div>
              <div className="space-y-1 lg:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Partido</label><input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" value={newBet.match} onChange={e => setNewBet({...newBet, match: e.target.value})} required /></div>
              <div className="space-y-1 lg:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Predicción</label><input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-emerald-400" value={newBet.prediction} onChange={e => setNewBet({...newBet, prediction: e.target.value})} required /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Cuota</label><input type="number" step="0.01" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" value={newBet.odds} onChange={e => setNewBet({...newBet, odds: e.target.value})} required /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Confianza %</label><input type="number" max="100" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" value={newBet.confidence} onChange={e => setNewBet({...newBet, confidence: e.target.value})} required /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Hora</label><input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" value={newBet.time} onChange={e => setNewBet({...newBet, time: e.target.value})} required /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Estado</label><select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" value={newBet.status} onChange={e => setNewBet({...newBet, status: e.target.value})}><option value="normal">Normal</option><option value="hot">HOT PICK 🔥</option></select></div>
              
              {/* CAMPO DE URL DE IMAGEN (SIN STORAGE) */}
              <div className="space-y-1 lg:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><LinkIcon size={14} /> URL de Imagen (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej: https://i.imgur.com/foto.jpg" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  value={newBet.img}
                  onChange={e => setNewBet({...newBet, img: e.target.value})}
                />
                <p className="text-[10px] text-slate-500 text-amber-500/80 mt-1">⚠️ IMPORTANTE: Debe ser un enlace de internet (https://...), no un archivo de tu PC. Puedes subir tu imagen a <a href="https://imgur.com/upload" target="_blank" className="underline hover:text-white">Imgur.com</a> y pegar el enlace directo aquí.</p>
              </div>

              <div className="lg:col-span-4 mt-4 flex gap-4">{editingId && <button type="button" onClick={handleCancelEdit} className="w-1/3 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl">CANCELAR</button>}<button type="submit" className={`flex-grow bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg`}>{editingId ? <><Save size={20} /> ACTUALIZAR</> : <><Save size={20} /> PUBLICAR</>}</button></div>
            </form>
          </div>
        </section>
      )}

      {!isAdmin && (
        <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/20 rounded-full blur-[120px] -z-10" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] -z-10" />
          <div className="container mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-amber-400 text-sm font-bold mb-8 animate-bounce"><Zap size={16} fill="currentColor" /> ¡El Toque de Midas: 8 aciertos seguidos!</div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight tracking-tight">DOMINA EL MUNDO DE <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] bg-[length:200%_auto] animate-[gradient_3s_linear_infinite] drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]">LAS APUESTAS DEPORTIVAS</span></h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">Convierte tus picks en oro con nuestra inteligencia artificial y análisis de élite. Deja de apostar, empieza a invertir.</p>
             <div className="flex flex-col md:flex-row gap-4 justify-center"><button className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg rounded-full shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] transition-all duration-300 flex items-center justify-center gap-2"><Target size={20} /> Ver Pronósticos</button></div>
          </div>
        </header>
      )}

      <section className="py-20 bg-slate-900 relative">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div><h2 className="text-3xl md:text-4xl font-black text-white mb-2 flex items-center gap-3"><BarChart2 className="text-amber-400" /> Picks Destacados</h2><p className="text-slate-400">{loading && 'Cargando...'}</p></div>
            <div className="flex flex-wrap gap-2">{['All', 'Futbol', 'NBA', 'Tenis', 'UFC'].map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab.toLowerCase() === tab.toLowerCase() ? 'bg-white text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>{tab}</button>))}</div>
          </div>
          {loading ? (<div className="text-center py-20"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-4"></div><p className="text-slate-500">Conectando...</p></div>) : predictions.length === 0 ? (<div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700"><Trophy size={48} className="mx-auto text-slate-600 mb-4" /><p className="text-slate-400 font-bold">No hay pronósticos activos.</p></div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{filteredPredictions.map((pred) => (<BetCard key={pred.id} data={pred} isAdminMode={isAdmin} />))}</div>)}
        </div>
      </section>

      <footer className="bg-slate-950 border-t border-slate-900 pt-16 pb-8">
        <div className="container mx-auto px-6">
          <div className="text-center md:text-left text-slate-600 text-sm flex flex-col md:flex-row justify-between">
            <p>© 2024 Pronosticos Midas Inc.</p>
            <div className="flex gap-6 mt-4 md:mt-0 justify-center"><a href="#" className="hover:text-slate-400">Términos</a><a href="#" className="hover:text-slate-400">Privacidad</a></div>
          </div>
        </div>
      </footer>
      <style>{`@keyframes gradient { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }`}</style>
    </div>
  );
};

export default App;