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
  Upload,
  Image as ImageIcon,
  Pencil // Nuevo icono para editar
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, // Necesario para editar
  onSnapshot, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

// --- ZONA DE CONFIGURACIÓN (¡VUELVE A PEGAR TUS CLAVES AQUÍ!) ---
const firebaseConfig = {
  apiKey: 'AIzaSyDZa4uoO24GWvcxLh0MVxfPt2l0hNBn4yI',
  authDomain: 'midasbets-app.firebaseapp.com',
  projectId: 'midasbets-app',
  storageBucket: 'midasbets-app.firebasestorage.app',
  messagingSenderId: '359773148824',
  appId: '1:359773148824:web:aca2e50d206d82779262ed',
};

// --- NO TOCAR NADA DEBAJO DE ESTA LÍNEA ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = 'midas-production';

// --- COMPONENTE PRINCIPAL ---
const App = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Estados para Datos y Auth
  const [predictions, setPredictions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para el Panel de Admin
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Estado para Edición
  const [editingId, setEditingId] = useState(null); // ID del pronóstico que se está editando

  // Estados para Formulario y Subida
  const [imageFile, setImageFile] = useState(null); 
  const [isUploading, setIsUploading] = useState(false); 
  
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

  // 0. CAMBIAR TÍTULO Y FAVICON DE LA PESTAÑA
  useEffect(() => {
    // Cambiar Título
    document.title = "PronosticosMIDAS";
    
    // Cambiar Favicon a una Corona
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'icon';
    // Usamos un SVG data URI de una corona
    link.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👑</text></svg>";
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  // 1. INICIALIZAR AUTENTICACIÓN
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Error de autenticación:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. DETECTOR DE URL SECRETA (ADMIN)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('access') === 'jvadminaadd') {
      setShowLoginModal(true);
    }
  }, []);

  // 3. ESCUCHAR DATOS DE FIREBASE
  useEffect(() => {
    if (!user) return;

    const simpleQ = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'midas_predictions')
    );

    const unsubscribe = onSnapshot(simpleQ, (snapshot) => {
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
      console.error("Error leyendo pronósticos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Efecto Scroll Navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- LÓGICA DEL ADMIN PANEL ---

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
      setLoginError('Acceso Denegado. Contraseña incorrecta.');
    }
  };

  const handleFileChange = (e) => {
      if (e.target.files[0]) {
          setImageFile(e.target.files[0]);
      }
  };

  // Función para preparar la edición
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
    setImageFile(null); // Reseteamos archivo nuevo, mantenemos URL anterior en newBet.img
    // Scroll suave hacia el formulario
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
    setImageFile(null);
  };

  const handleAddBet = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsUploading(true);

    try {
      let finalImageUrl = newBet.img;

      // Si se seleccionó una imagen NUEVA, la subimos
      if (imageFile) {
          try {
             if (firebaseConfig.storageBucket.includes("PEGA_TU") || !firebaseConfig.storageBucket) {
                 throw new Error("Falta configurar 'storageBucket' en las claves.");
             }

             const fileName = `pronosticos/${Date.now()}_${imageFile.name}`;
             const storageRef = ref(storage, fileName);
             
             const snapshot = await uploadBytes(storageRef, imageFile);
             finalImageUrl = await getDownloadURL(snapshot.ref);
          } catch (uploadError) {
             console.error("Fallo subida imagen:", uploadError);
             alert(`Aviso: La imagen no se pudo subir (${uploadError.message}). Se usará una imagen por defecto.`);
             // Si falló la subida y no estamos editando (o no tenía imagen previa), poner default
             if (!editingId && !finalImageUrl) finalImageUrl = ''; 
          }
      } 
      
      // Si no hay URL final y no estamos editando (o borraron la anterior), poner default
      if (!finalImageUrl) {
          finalImageUrl = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800';
      }

      const betData = {
        ...newBet,
        img: finalImageUrl,
        odds: parseFloat(newBet.odds),
        confidence: parseInt(newBet.confidence),
        // Si es nuevo, ponemos fecha de creación. Si es update, actualizamos fecha update.
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        // ACTUALIZAR
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'midas_predictions', editingId), betData);
        alert('¡Pronóstico Actualizado con Éxito!');
      } else {
        // CREAR
        betData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'midas_predictions'), betData);
        alert('¡Pronóstico Publicado con Éxito!');
      }

      // Limpieza
      handleCancelEdit(); // Resetea form y modo edición

    } catch (error) {
      console.error("Error al guardar:", error);
      alert(`Error crítico al guardar datos: ${error.message}`);
    } finally {
        setIsUploading(false);
    }
  };

  const handleDeleteBet = async (id) => {
    if (confirm('¿Estás seguro de eliminar este pronóstico?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'midas_predictions', id));
        // Si estamos editando el que borramos, cancelar edición
        if (editingId === id) handleCancelEdit();
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  const filteredPredictions = activeTab === 'all' 
    ? predictions 
    : predictions.filter(p => p.sport.toLowerCase() === activeTab.toLowerCase());


  // --- COMPONENTES UI ---

  const BetCard = ({ data, isAdminMode }) => (
    <div className="group relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-amber-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col h-full">
      {isAdminMode && (
        <div className="absolute top-2 right-2 z-50 flex gap-2">
          {/* Botón Editar */}
          <button 
            onClick={() => handleEditBet(data)}
            className="bg-blue-500/80 hover:bg-blue-600 text-white p-2 rounded-full backdrop-blur-md transition-colors"
            title="Editar Pronóstico"
          >
            <Pencil size={16} />
          </button>
          {/* Botón Eliminar */}
          <button 
            onClick={() => handleDeleteBet(data.id)}
            className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-md transition-colors"
            title="Eliminar Pronóstico"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      <div className="absolute inset-0 h-32 w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900 z-10" />
        <img 
          src={data.img || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800"} 
          alt={data.match} 
          className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" 
          onError={(e) => {e.target.src = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800'}}
        />
      </div>

      <div className="relative z-20 p-5 mt-16 flex-grow flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <span className="bg-slate-900/80 backdrop-blur-md text-amber-400 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/20 uppercase tracking-wider flex items-center gap-1">
            {data.sport}
          </span>
          {data.status === 'hot' && (
            <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-full animate-pulse">
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

  // --- RENDERIZADO PRINCIPAL ---

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500 selection:text-slate-900">
      
      {/* NAVBAR */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/90 backdrop-blur-lg border-b border-slate-800' : 'bg-transparent'}`}>
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* LOGO CON ENLACE AL HOME */}
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <Crown className="text-slate-900" size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xl md:text-2xl font-black text-white tracking-tighter italic">
              Pronosticos<span className="text-amber-400">MIDAS</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8 font-medium text-sm">
            <a href="#" className="text-white hover:text-amber-400 transition-colors">Pronósticos</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">VIP</a>
            
            {isAdmin && (
              <div className="flex items-center gap-4">
                 <span className="text-emerald-400 text-xs font-bold uppercase border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 rounded-full">Modo Admin Activo</span>
                 <button 
                  onClick={() => setIsAdmin(false)}
                  className="text-slate-400 hover:text-red-400"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}
          </div>

          <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
              <ShieldCheck className="text-amber-500" /> Acceso Admin
            </h2>
            <p className="text-slate-400 text-sm mb-6">Introduce la clave maestra.</p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input 
                  type="password" 
                  placeholder="Contraseña..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                />
              </div>
              {loginError && <p className="text-red-400 text-sm font-bold flex items-center gap-1"><AlertCircle size={14}/> {loginError}</p>}
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-xl transition-colors">
                Entrar al Panel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN DASHBOARD */}
      {isAdmin && (
        <section className="pt-32 pb-10 container mx-auto px-6">
          <div className={`border rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(245,158,11,0.1)] transition-colors ${editingId ? 'bg-slate-900/90 border-blue-500/50' : 'bg-slate-900 border-amber-500/30'}`}>
            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
              {editingId ? <Pencil className="text-blue-400" /> : <Zap className="text-amber-400" />} 
              {editingId ? 'Editar Pronóstico Existente' : 'Crear Nuevo Pronóstico'}
            </h2>
            
            <form onSubmit={handleAddBet} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Form fields... */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Deporte</label>
                <select 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  value={newBet.sport}
                  onChange={e => setNewBet({...newBet, sport: e.target.value})}
                >
                  <option>Futbol</option>
                  <option>NBA</option>
                  <option>Tenis</option>
                  <option>UFC</option>
                  <option>MLB</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Liga / Torneo</label>
                <input 
                  type="text" 
                  placeholder="Ej: Champions League" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  value={newBet.league}
                  onChange={e => setNewBet({...newBet, league: e.target.value})}
                  required 
                />
              </div>

              <div className="space-y-1 lg:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Partido (Vs)</label>
                <input 
                  type="text" 
                  placeholder="Ej: Real Madrid vs Bayern" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  value={newBet.match}
                  onChange={e => setNewBet({...newBet, match: e.target.value})}
                  required 
                />
              </div>

              <div className="space-y-1 lg:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Tu Predicción</label>
                <input 
                  type="text" 
                  placeholder="Ej: Ambos Marcan" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-emerald-400"
                  value={newBet.prediction}
                  onChange={e => setNewBet({...newBet, prediction: e.target.value})}
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Cuota (Decimal)</label>
                <input 
                  type="number" step="0.01" placeholder="1.90" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  value={newBet.odds}
                  onChange={e => setNewBet({...newBet, odds: e.target.value})}
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Confianza %</label>
                <input 
                  type="number" max="100" min="1" placeholder="85" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  value={newBet.confidence}
                  onChange={e => setNewBet({...newBet, confidence: e.target.value})}
                  required 
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Hora</label>
                <input 
                  type="text" placeholder="20:00 PM" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  value={newBet.time}
                  onChange={e => setNewBet({...newBet, time: e.target.value})}
                  required 
                />
              </div>
              
               <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Estado</label>
                <select 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  value={newBet.status}
                  onChange={e => setNewBet({...newBet, status: e.target.value})}
                >
                  <option value="normal">Normal</option>
                  <option value="hot">HOT PICK 🔥</option>
                </select>
              </div>

              {/* SECCIÓN DE IMAGEN */}
              <div className="space-y-1 lg:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <ImageIcon size={14} /> {editingId ? 'Cambiar Imagen (Opcional)' : 'Imagen del Partido'}
                </label>
                
                <div className="flex gap-2">
                  <div className="relative w-full">
                     <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`w-full bg-slate-800 border ${imageFile ? 'border-emerald-500 text-emerald-400' : 'border-slate-700 text-slate-400'} border-dashed rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors`}>
                      <Upload size={16} />
                      {imageFile ? `Archivo: ${imageFile.name}` : (editingId ? 'Subir Nueva Imagen' : 'Clic para Cargar Imagen')}
                    </div>
                  </div>
                </div>
                
                {/* Preview de imagen actual si estamos editando y no hay archivo nuevo */}
                {editingId && !imageFile && newBet.img && (
                    <p className="text-[10px] text-slate-500 mt-1 truncate">Actual: {newBet.img}</p>
                )}
                
                {!imageFile && (
                  <input 
                    type="text" 
                    placeholder="O pega una URL directa..." 
                    className="w-full mt-2 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-500 text-xs"
                    value={newBet.img}
                    onChange={e => setNewBet({...newBet, img: e.target.value})}
                  />
                )}
              </div>

              <div className="lg:col-span-4 mt-4 flex gap-4">
                {editingId && (
                  <button 
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-1/3 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    CANCELAR
                  </button>
                )}
                
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className={`flex-grow bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20 transition-all ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {isUploading ? (
                    <>Subiendo... <div className="animate-spin h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full"></div></>
                  ) : (
                    editingId ? <><Save size={20} /> ACTUALIZAR PRONÓSTICO</> : <><Save size={20} /> PUBLICAR PRONÓSTICO</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* HERO SECTION (Solo mostrar si no estamos en modo admin para no distraer, o dejar visible) */}
      {!isAdmin && (
        <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/20 rounded-full blur-[120px] -z-10" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] -z-10" />

          <div className="container mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-amber-400 text-sm font-bold mb-8 animate-bounce">
              <Zap size={16} fill="currentColor" /> ¡El Toque de Midas: 8 aciertos seguidos!
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight tracking-tight">
              DOMINA EL MUNDO DE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] bg-[length:200%_auto] animate-[gradient_3s_linear_infinite] drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]">
                LAS APUESTAS DEPORTIVAS
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Convierte tus picks en oro con nuestra inteligencia artificial y análisis de élite. Deja de apostar, empieza a invertir.
            </p>
             <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg rounded-full shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] transition-all duration-300 flex items-center justify-center gap-2">
                <Target size={20} /> Ver Pronósticos
              </button>
            </div>
          </div>
        </header>
      )}

      {/* LISTA DE PRONÓSTICOS (PÚBLICA) */}
      <section className="py-20 bg-slate-900 relative">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-2 flex items-center gap-3">
                <BarChart2 className="text-amber-400" /> Picks Destacados
              </h2>
              <p className="text-slate-400">
                {loading ? 'Cargando datos en vivo...' : 'Seleccionados por nuestro algoritmo "Midas AI"'}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {['All', 'Futbol', 'NBA', 'Tenis', 'UFC'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 ${
                    activeTab.toLowerCase() === tab.toLowerCase()
                      ? 'bg-white text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
             <div className="text-center py-20">
               <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-4"></div>
               <p className="text-slate-500">Conectando con el servidor...</p>
             </div>
          ) : predictions.length === 0 ? (
             <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
               <Trophy size={48} className="mx-auto text-slate-600 mb-4" />
               <p className="text-slate-400 font-bold">No hay pronósticos activos hoy.</p>
               {isAdmin && <p className="text-amber-500 text-sm mt-2">¡Usa el panel arriba para crear el primero!</p>}
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPredictions.map((pred) => (
                <BetCard key={pred.id} data={pred} isAdminMode={isAdmin} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900 pt-16 pb-8">
        <div className="container mx-auto px-6">
          <div className="text-center md:text-left text-slate-600 text-sm flex flex-col md:flex-row justify-between">
            <p>© 2024 Pronosticos Midas Inc. Todos los derechos reservados.</p>
            <div className="flex gap-6 mt-4 md:mt-0 justify-center">
              <a href="#" className="hover:text-slate-400">Términos</a>
              <a href="#" className="hover:text-slate-400">Privacidad</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Styles for animations */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .cursor-wait {
          cursor: wait;
        }
      `}</style>
    </div>
  );
};

export default App;