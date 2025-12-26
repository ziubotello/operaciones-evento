import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, 
  deleteDoc, doc, onSnapshot, query, serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Calendar, Users, ClipboardList, TrendingUp, Plus, 
  Save, Trash2, Edit, Clock, Layout, Shield, 
  HardHat, HeartPulse, Ticket, Package, X, AlertCircle, Car, MapPin, AlertTriangle, Settings
} from 'lucide-react';

// --- PEGA AQUÍ TUS CREDENCIALES DE FIREBASE ---
// ⚠️ IMPORTANTE: Debes reemplazar estos textos con los datos de tu consola de Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_BUCKET.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// --- VALIDACIÓN DE CONFIGURACIÓN ---
// Esto evita que la app truene si no has puesto las claves
const isConfigured = firebaseConfig.apiKey !== "TU_API_KEY_AQUI";

let app, auth, db;
if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Error inicializando Firebase:", error);
  }
}

// --- NOMBRE DE LA COLECCIÓN COMPARTIDA ---
const COLLECTION_NAME = 'operaciones_compartidas';

// --- CONFIGURACIONES ---
const DEPARTMENT_CONFIG = {
  security: {
    label: 'Seguridad',
    icon: <Shield size={18} />,
    color: 'bg-blue-50 text-blue-700',
    hasRoles: true,
    shiftType: 'standard', 
    allowedRoles: [
      { id: 'elemento', label: 'Elemento' },
      { id: 'supervisor', label: 'Supervisor' },
      { id: 'coordinador', label: 'Coordinador' },
    ]
  },
  ushers: {
    label: 'Acomodo / Boleteros',
    icon: <Ticket size={18} />,
    color: 'bg-purple-50 text-purple-700',
    hasRoles: true,
    shiftType: 'standard',
    allowedRoles: [
      { id: 'boletero', label: 'Boletero' },
      { id: 'acomodo', label: 'Acomodo' },
      { id: 'supervisor', label: 'Supervisor' },
    ]
  },
  cleaning: {
    label: 'Limpieza',
    icon: <Layout size={18} />,
    color: 'bg-teal-50 text-teal-700',
    hasRoles: true,
    shiftType: 'standard',
    allowedRoles: [
      { id: 'elemento', label: 'Elemento' },
      { id: 'supervisor', label: 'Supervisor' },
    ]
  },
  medics: {
    label: 'Servicios Médicos',
    icon: <HeartPulse size={18} />,
    color: 'bg-red-50 text-red-700',
    hasRoles: true,
    shiftType: 'fixed_12h',
    allowedRoles: [
      { id: 'amb_prod', label: 'Ambulancia Producción' },
      { id: 'amb_event', label: 'Ambulancia Evento' },
      { id: 'paramedic', label: 'Paramédico' },
    ]
  },
  stages_b: {
    label: 'Stages B (Externo)',
    icon: <HardHat size={18} />,
    color: 'bg-orange-50 text-orange-700',
    hasRoles: false,
    shiftType: 'stages',
    allowedRoles: []
  },
  stages_ocesa: {
    label: 'Stage Hands (Ocesa)',
    icon: <HardHat size={18} />,
    color: 'bg-yellow-50 text-yellow-700',
    hasRoles: false,
    shiftType: 'stages',
    allowedRoles: []
  }
};

const SHIFTS_STANDARD = [
  { id: '8h', label: '1 Turno (8 hrs)' },
  { id: '12h', label: '1.5 Turnos (12 hrs)' },
  { id: '16h', label: '2 Turnos (16 hrs)' },
];

const SHIFTS_STAGES = [
  { id: '12h', label: '1 Turno (12 hrs)' },
  { id: '18h', label: '1.5 Turnos (18 hrs)' },
  { id: '24h', label: '2 Turnos (24 hrs)' },
];

const SUPPLY_ITEMS = [
  { id: 'toilet_paper', label: 'Rollo Higiénico (Pzas)', category: 'Baños' },
  { id: 'hand_paper', label: 'Rollo Manos (Pzas)', category: 'Baños' },
  { id: 'soap', label: 'Jabón (Litros/Cargas)', category: 'Baños' },
  { id: 'urinal_cakes', label: 'Pastillas Urinario', category: 'Baños' },
  { id: 'interfolded', label: 'Toallas Interdobladas (Cajas)', category: 'Baños' },
  { id: 'trash_jumbo', label: 'Bolsa Jumbo', category: 'Limpieza' },
  { id: 'trash_large', label: 'Bolsa Grande', category: 'Limpieza' },
  { id: 'trash_medium', label: 'Bolsa Mediana', category: 'Limpieza' },
  { id: 'trash_small', label: 'Bolsa Chica', category: 'Limpieza' },
];

const PARKING_ZONES = [
  { id: 'islas', label: 'Islas' },
  { id: 'sesamo', label: 'Sésamo' },
  { id: 'hielo', label: 'Pista de Hielo' },
  { id: 'parque', label: 'Parque' },
  { id: 'vip', label: 'VIP' },
];

const DEFAULT_SECURITY_DEPLOYMENT = [
  { id: 'camerinos', name: 'Camerinos', elements: 0, supervisors: 0 },
  { id: 'barricada', name: 'Barricada', elements: 0, supervisors: 0 },
  { id: 'beyond', name: 'Beyond', elements: 0, supervisors: 0 },
  { id: 'platinum', name: 'Platinum', elements: 0, supervisors: 0 },
  { id: 'perfiles', name: 'Perfiles', elements: 0, supervisors: 0 },
  { id: 'l1', name: 'L1', elements: 0, supervisors: 0 },
  { id: 'central', name: 'Central', elements: 0, supervisors: 0 },
  { id: 'l2', name: 'L2', elements: 0, supervisors: 0 },
  { id: 'rampas', name: 'Rampas', elements: 0, supervisors: 0 },
  { id: 'reaccion', name: 'Elementos de Reacción', elements: 0, supervisors: 0 },
  { id: 'caseta', name: 'Apoyo a Caseta', elements: 0, supervisors: 0 },
  { id: 'estacionamiento', name: 'Estacionamiento', elements: 0, supervisors: 0 },
];

const DEFAULT_USHERS_DEPLOYMENT = [
  { id: 'beyond', name: 'Beyond', ushers: 0, ticketTakers: 0 },
  { id: 'platinum', name: 'Platinum', ushers: 0, ticketTakers: 0 },
  { id: 'perfiles', name: 'Perfiles', ushers: 0, ticketTakers: 0 },
  { id: 'l1', name: 'L1', ushers: 0, ticketTakers: 0 },
  { id: 'centrales', name: 'Centrales', ushers: 0, ticketTakers: 0 },
];

// --- APP PRINCIPAL ---
export default function App() {
  // Si no está configurado, mostramos pantalla de ayuda
  if (!isConfigured) {
    return <SetupScreen />;
  }

  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [view, setView] = useState('dashboard');
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Autenticación
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        signInAnonymously(auth).catch((error) => console.error("Error auth", error));
      }
    });
    return () => unsubscribe();
  }, []);

  // Carga de Datos (MODO EQUIPO)
  useEffect(() => {
    if (!user || !db) return;
    
    // Conectamos a la colección compartida
    const q = query(collection(db, COLLECTION_NAME));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      eventsData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error("Error leyendo datos:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Navegación
  const goHome = () => { setView('dashboard'); setEditingEvent(null); };
  const goList = () => { setView('list'); setEditingEvent(null); };
  const goAnalytics = () => { setView('analytics'); setEditingEvent(null); };
  const goCreate = () => { setEditingEvent(null); setView('form'); };
  const goEdit = (event) => { setEditingEvent(event); setView('form'); };

  // Helpers
  const calculateStaffTotals = (staffingData) => {
    let req = 0, act = 0;
    if (!staffingData) return { req, act };
    if (Array.isArray(staffingData)) {
      staffingData.forEach(row => {
        req += (parseInt(row.req) || 0) + (parseInt(row.setupReq) || 0);
        act += (parseInt(row.act) || 0) + (parseInt(row.setupAct) || 0);
      });
    }
    return { req, act };
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">Cargando EventOps...</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="text-emerald-400" />
            EventOps <span className="text-xs bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded">Team</span>
          </h1>
          <p className="text-xs text-slate-400 mt-2">Auditorio Banamex / MTY</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<Layout />} label="Dashboard" active={view === 'dashboard'} onClick={goHome} />
          <NavItem icon={<Calendar />} label="Eventos" active={view === 'list'} onClick={goList} />
          <NavItem icon={<TrendingUp />} label="Reportes" active={view === 'analytics'} onClick={goAnalytics} />
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-50 p-4 flex justify-between items-center shadow-md">
        <span className="font-bold flex gap-2"><ClipboardList className="text-emerald-400"/> EventOps</span>
        <div className="flex gap-4">
          <button onClick={goHome}><Layout size={20}/></button>
          <button onClick={goList}><Calendar size={20}/></button>
          <button onClick={goAnalytics}><TrendingUp size={20}/></button>
        </div>
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden pt-14 md:pt-0">
        <div className="flex-1 overflow-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
          {view === 'dashboard' && <DashboardView events={events} onAdd={goCreate} calculateStaffTotals={calculateStaffTotals} />}
          {view === 'list' && <EventsList events={events} onEdit={goEdit} onDelete={deleteDoc} db={db} />}
          {view === 'form' && <EventForm event={editingEvent} onCancel={goList} db={db} />}
          {view === 'analytics' && <AnalyticsView events={events} calculateStaffTotals={calculateStaffTotals} />}
        </div>
      </main>
    </div>
  );
}

// --- PANTALLA DE AYUDA (CONFIGURACIÓN) ---
function SetupScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 text-center">
        <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings className="text-yellow-400" size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">¡Casi listo!</h2>
        <p className="text-slate-400 mb-6">
          Para que la App funcione, necesitas conectarla a tu base de datos de Firebase.
        </p>
        
        <div className="bg-slate-900 p-4 rounded-lg text-left text-sm mb-6 border border-slate-700">
          <h3 className="font-bold text-white mb-2 flex items-center gap-2">
            <AlertTriangle size={14} className="text-yellow-500"/> Pasos para arreglarlo:
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-slate-300">
            <li>Ve a la <strong>Consola de Firebase</strong>.</li>
            <li>Entra a <strong>Configuración del Proyecto</strong> (⚙️).</li>
            <li>Baja hasta "Tus apps" y copia el código <code>const firebaseConfig</code>.</li>
            <li>Regresa a este archivo (<code>src/App.jsx</code>).</li>
            <li>Busca la línea 20 y <strong>pega tus datos reales</strong>.</li>
          </ol>
        </div>

        <div className="text-xs text-slate-500">
          Una vez que pegues las claves y guardes, esta pantalla desaparecerá automáticamente.
        </div>
      </div>
    </div>
  );
}

// --- VISTAS ---

function DashboardView({ events, onAdd, calculateStaffTotals }) {
  const totalEvents = events.length;
  const stats = useMemo(() => {
    let totalReq = 0, totalReal = 0;
    events.forEach(e => {
      Object.keys(e.staffing || {}).forEach(deptKey => {
        const { req, act } = calculateStaffTotals(e.staffing[deptKey]);
        totalReq += req;
        totalReal += act;
      });
    });
    const percentage = totalReq > 0 ? ((totalReal / totalReq) * 100).toFixed(1) : 100;
    return { totalReq, totalReal, percentage };
  }, [events, calculateStaffTotals]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-slate-800">Panel Principal</h2></div>
        <button onClick={onAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow font-medium"><Plus size={20} /> Nuevo Evento</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Eventos Registrados" value={totalEvents} icon={<Calendar className="text-blue-500" />} />
        <KPICard title="Cumplimiento Global" value={`${stats.percentage}%`} subtext={`Faltante total: ${stats.totalReq - stats.totalReal}`} icon={<Users className="text-emerald-500" />} />
        <KPICard title="Último Evento" value={events[0]?.eventName || "--"} subtext={events[0] ? new Date(events[0].date).toLocaleDateString() : ""} icon={<Clock className="text-purple-500" />} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100"><h3 className="font-bold text-slate-700">Actividad Reciente</h3></div>
        {events.length === 0 ? <div className="p-8 text-center text-slate-400">No hay datos aún.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr><th className="px-6 py-3">Evento</th><th className="px-6 py-3">Fecha</th><th className="px-6 py-3 text-center">Pedido</th><th className="px-6 py-3 text-center">Real</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.slice(0, 5).map(evt => {
                  let r = 0, a = 0;
                  Object.values(evt.staffing || {}).forEach(d => { const t = calculateStaffTotals(d); r+=t.req; a+=t.act; });
                  return (
                    <tr key={evt.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-800">{evt.eventName}</td>
                      <td className="px-6 py-3 text-slate-500">{new Date(evt.date + 'T12:00:00').toLocaleDateString()}</td>
                      <td className="px-6 py-3 text-center">{r}</td>
                      <td className="px-6 py-3 text-center">{a}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EventForm({ event, onCancel, db }) {
  const [formData, setFormData] = useState({
    eventName: '',
    date: new Date().toISOString().split('T')[0],
    showTime: '21:00',
    doorsTime: '18:30',
    hasSetupDay: false,
    notes: '',
    staffing: {}, 
    supplies: {},
    parking: {},
    securityDeployment: DEFAULT_SECURITY_DEPLOYMENT,
    ushersDeployment: DEFAULT_USHERS_DEPLOYMENT
  });

  useEffect(() => {
    if (event) {
      setFormData({
        ...event,
        securityDeployment: event.securityDeployment || DEFAULT_SECURITY_DEPLOYMENT,
        ushersDeployment: event.ushersDeployment || DEFAULT_USHERS_DEPLOYMENT
      });
    } else {
      const initialStaffing = {};
      Object.keys(DEPARTMENT_CONFIG).forEach(key => initialStaffing[key] = []);
      const initialSupplies = {};
      SUPPLY_ITEMS.forEach(item => initialSupplies[item.id] = 0);
      const initialParking = {};
      PARKING_ZONES.forEach(zone => initialParking[zone.id] = { cars: 0, motos: 0 });

      setFormData(prev => ({ 
        ...prev, staffing: initialStaffing, supplies: initialSupplies, parking: initialParking,
        securityDeployment: DEFAULT_SECURITY_DEPLOYMENT, ushersDeployment: DEFAULT_USHERS_DEPLOYMENT
      }));
    }
  }, [event]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, updatedAt: serverTimestamp() };
      if (!event?.id) payload.createdAt = serverTimestamp();
      
      // GUARDAR EN COLECCIÓN COMPARTIDA
      const colRef = collection(db, COLLECTION_NAME);
      
      if (event?.id) await updateDoc(doc(colRef, event.id), payload);
      else await addDoc(colRef, payload);
      onCancel();
    } catch (err) { console.error(err); alert("Error al guardar: " + err.message); }
  };

  // Staffing Helpers
  const addDynamicRow = (dept) => {
    const config = DEPARTMENT_CONFIG[dept];
    const defaultRole = config.hasRoles ? config.allowedRoles[0].id : 'default';
    const defaultShift = config.shiftType === 'stages' ? '12h' : '8h';
    const newRow = { id: Date.now(), role: defaultRole, callTime: '15:00', shift: defaultShift, req: 0, act: 0, setupReq: 0, setupAct: 0 };
    setFormData(prev => ({ ...prev, staffing: { ...prev.staffing, [dept]: [...(prev.staffing[dept] || []), newRow] } }));
  };
  const removeDynamicRow = (dept, rowId) => setFormData(prev => ({ ...prev, staffing: { ...prev.staffing, [dept]: prev.staffing[dept].filter(row => row.id !== rowId) } }));
  const updateDynamicRow = (dept, rowId, field, val) => {
    setFormData(prev => ({ ...prev, staffing: { ...prev.staffing, [dept]: prev.staffing[dept].map(row => {
      if (row.id === rowId) { const isNumeric = ['req', 'act', 'setupReq', 'setupAct'].includes(field); return { ...row, [field]: isNumeric ? (parseInt(val) || 0) : val }; }
      return row;
    }) } }));
  };

  // Deployment Helpers
  const addZone = (type) => {
    const key = type === 'security' ? 'securityDeployment' : 'ushersDeployment';
    const newZone = type === 'security' ? { id: Date.now(), name: 'Nueva Zona', elements: 0, supervisors: 0 } : { id: Date.now(), name: 'Nueva Zona', ushers: 0, ticketTakers: 0 };
    setFormData(prev => ({ ...prev, [key]: [...(prev[key] || []), newZone] }));
  };
  const removeZone = (type, id) => {
    const key = type === 'security' ? 'securityDeployment' : 'ushersDeployment';
    setFormData(prev => ({ ...prev, [key]: prev[key].filter(z => z.id !== id) }));
  };
  const updateZone = (type, id, field, val) => {
    const key = type === 'security' ? 'securityDeployment' : 'ushersDeployment';
    setFormData(prev => ({ ...prev, [key]: prev[key].map(z => z.id === id ? { ...z, [field]: field === 'name' ? val : (parseInt(val) || 0) } : z) }));
  };

  // Supply & Parking Helpers
  const updateSupply = (id, val) => setFormData(prev => ({ ...prev, supplies: { ...prev.supplies, [id]: parseInt(val) || 0 } }));
  const updateParking = (zoneId, field, val) => setFormData(prev => ({ ...prev, parking: { ...prev.parking, [zoneId]: { ...(prev.parking?.[zoneId] || { cars: 0, motos: 0 }), [field]: parseInt(val) || 0 } } }));
  const parkingTotal = useMemo(() => { let total = 0; Object.values(formData.parking || {}).forEach(z => total += (z.cars || 0) + (z.motos || 0)); return total; }, [formData.parking]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between sticky top-0 bg-slate-50 py-4 z-10 border-b items-center">
         <div><h2 className="text-2xl font-bold text-slate-800">{event ? 'Editar' : 'Nuevo'}</h2><p className="text-sm text-slate-500">Operativa de Evento</p></div>
         <div className="flex gap-2">
           <button onClick={onCancel} className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300">Cancelar</button>
           <button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"><Save size={18}/> Guardar</button>
         </div>
      </div>

      <form className="space-y-8">
        <Section title="Información General" icon={<ClipboardList className="text-blue-500"/>}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1"><label className="label">Evento</label><input type="text" className="input" placeholder="Ej. Flor Bertotti" value={formData.eventName} onChange={e=>setFormData({...formData, eventName: e.target.value})} /></div>
            <div><label className="label">Fecha</label><input type="date" className="input" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} /></div>
            <div className="flex items-center gap-2 pt-6"><input type="checkbox" checked={formData.hasSetupDay} onChange={e=>setFormData({...formData, hasSetupDay: e.target.checked})} /><label>Incluye Día de Montaje</label></div>
            <div><label className="label">Puertas</label><input type="time" className="input" value={formData.doorsTime} onChange={e=>setFormData({...formData, doorsTime: e.target.value})} /></div>
            <div><label className="label">Show</label><input type="time" className="input" value={formData.showTime} onChange={e=>setFormData({...formData, showTime: e.target.value})} /></div>
          </div>
        </Section>

        {/* LOGISTICA */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> Logística de Personal</h3>
          {Object.entries(DEPARTMENT_CONFIG).map(([deptKey, config]) => (
            <div key={deptKey} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className={`px-6 py-3 flex justify-between font-bold ${config.color}`}>
                <div className="flex items-center gap-2">{config.icon} {config.label}</div>
                <button type="button" onClick={() => addDynamicRow(deptKey)} className="bg-white/90 hover:bg-white text-blue-700 text-xs px-3 py-1 rounded shadow-sm flex items-center gap-1"><Plus size={14}/> Agregar Fila</button>
              </div>
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase text-center">
                      {config.hasRoles && <th className="text-left pb-2 pl-2">Rol</th>}<th className="pb-2 w-24">Citado</th><th className="pb-2 w-40">Turno</th>
                      {formData.hasSetupDay && <><th className="pb-2 text-purple-600">Montaje (P)</th><th className="pb-2 text-purple-600">Montaje (R)</th></>}
                      <th className="pb-2 text-blue-600">Evento (P)</th><th className="pb-2 text-blue-600">Evento (R)</th><th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(formData.staffing[deptKey] || []).map((row) => (
                      <tr key={row.id}>
                        {config.hasRoles && <td className="py-2 pr-2"><select className="w-full border p-1 rounded" value={row.role} onChange={e=>updateDynamicRow(deptKey, row.id, 'role', e.target.value)}>{config.allowedRoles.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}</select></td>}
                        <td className="px-1"><input type="time" className="w-full border p-1 rounded text-center" value={row.callTime} onChange={e=>updateDynamicRow(deptKey, row.id, 'callTime', e.target.value)}/></td>
                        <td className="px-1">{config.shiftType === 'fixed_12h' ? <div className="text-xs text-center text-slate-500 bg-slate-100 p-1">12 hrs</div> : <select className="w-full border p-1 rounded text-xs" value={row.shift} onChange={e=>updateDynamicRow(deptKey, row.id, 'shift', e.target.value)}>{(config.shiftType==='stages'?SHIFTS_STAGES:SHIFTS_STANDARD).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>}</td>
                        {formData.hasSetupDay && <><td className="px-1"><input type="number" className="input-cell bg-purple-50" value={row.setupReq} onChange={e=>updateDynamicRow(deptKey, row.id, 'setupReq', e.target.value)}/></td><td className="px-1"><input type="number" className="input-cell" value={row.setupAct} onChange={e=>updateDynamicRow(deptKey, row.id, 'setupAct', e.target.value)}/></td></>}
                        <td className="px-1"><input type="number" className="input-cell bg-blue-50" value={row.req} onChange={e=>updateDynamicRow(deptKey, row.id, 'req', e.target.value)}/></td><td className="px-1"><input type="number" className="input-cell" value={row.act} onChange={e=>updateDynamicRow(deptKey, row.id, 'act', e.target.value)}/></td>
                        <td className="text-center"><button type="button" onClick={()=>removeDynamicRow(deptKey, row.id)} className="text-red-400"><X size={16}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* DISPOSITIVOS ESPECIALES */}
              {deptKey === 'security' && (
                <div className="border-t bg-slate-50/50 p-4">
                  <div className="flex justify-between mb-3"><h4 className="text-sm font-bold text-slate-700 flex gap-2"><MapPin size={16}/> Dispositivo Seguridad</h4><button type="button" onClick={()=>addZone('security')} className="text-xs text-blue-600 flex gap-1"><Plus size={12}/> Zona</button></div>
                  <div className="overflow-x-auto bg-white border rounded"><table className="w-full text-sm"><thead className="bg-slate-100 text-xs uppercase"><tr><th className="px-3 py-2 text-left">Zona</th><th className="w-24 text-center">Elem.</th><th className="w-24 text-center">Super.</th><th className="w-10"></th></tr></thead>
                  <tbody className="divide-y">{formData.securityDeployment.map(z=>(<tr key={z.id}><td className="px-2"><input type="text" className="w-full border-none" value={z.name} onChange={e=>updateZone('security', z.id, 'name', e.target.value)}/></td><td className="px-2"><input type="number" className="w-full text-center border rounded" value={z.elements} onChange={e=>updateZone('security', z.id, 'elements', e.target.value)}/></td><td className="px-2"><input type="number" className="w-full text-center border rounded" value={z.supervisors} onChange={e=>updateZone('security', z.id, 'supervisors', e.target.value)}/></td><td className="text-center"><button type="button" onClick={()=>removeZone('security', z.id)}><Trash2 size={14}/></button></td></tr>))}</tbody></table></div>
                </div>
              )}
              {deptKey === 'ushers' && (
                <div className="border-t bg-purple-50/30 p-4">
                  <div className="flex justify-between mb-3"><h4 className="text-sm font-bold text-slate-700 flex gap-2"><MapPin size={16}/> Dispositivo Acomodo</h4><button type="button" onClick={()=>addZone('ushers')} className="text-xs text-purple-600 flex gap-1"><Plus size={12}/> Zona</button></div>
                  <div className="overflow-x-auto bg-white border rounded"><table className="w-full text-sm"><thead className="bg-purple-50 text-xs uppercase"><tr><th className="px-3 py-2 text-left">Zona</th><th className="w-24 text-center">Acom.</th><th className="w-24 text-center">Bol.</th><th className="w-10"></th></tr></thead>
                  <tbody className="divide-y">{formData.ushersDeployment.map(z=>(<tr key={z.id}><td className="px-2"><input type="text" className="w-full border-none" value={z.name} onChange={e=>updateZone('ushers', z.id, 'name', e.target.value)}/></td><td className="px-2"><input type="number" className="w-full text-center border rounded" value={z.ushers} onChange={e=>updateZone('ushers', z.id, 'ushers', e.target.value)}/></td><td className="px-2"><input type="number" className="w-full text-center border rounded" value={z.ticketTakers} onChange={e=>updateZone('ushers', z.id, 'ticketTakers', e.target.value)}/></td><td className="text-center"><button type="button" onClick={()=>removeZone('ushers', z.id)}><Trash2 size={14}/></button></td></tr>))}</tbody></table></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* INSUMOS */}
        <Section title="Insumos" icon={<Package className="text-orange-500"/>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUPPLY_ITEMS.map(i => (<div key={i.id} className="flex justify-between border-b pb-1"><span>{i.label}</span><input type="number" className="w-20 text-center border rounded" value={formData.supplies?.[i.id]||''} onChange={e=>updateSupply(i.id, e.target.value)}/></div>))}
          </div>
        </Section>

        {/* ESTACIONAMIENTO */}
        <Section title="Estacionamiento (Caseta)" icon={<Car className="text-indigo-500"/>}>
           <table className="w-full text-sm">
             <thead className="bg-slate-50 font-medium"><tr><th className="text-left p-2">Zona</th><th className="text-center">Autos</th><th className="text-center">Motos</th><th className="text-center">Total</th></tr></thead>
             <tbody className="divide-y">{PARKING_ZONES.map(z=>{ const d=formData.parking?.[z.id]||{cars:0,motos:0}; return (<tr key={z.id}><td className="p-2">{z.label}</td><td className="p-1"><input type="number" className="w-full text-center border rounded" value={d.cars} onChange={e=>updateParking(z.id, 'cars', e.target.value)}/></td><td className="p-1"><input type="number" className="w-full text-center border rounded" value={d.motos} onChange={e=>updateParking(z.id, 'motos', e.target.value)}/></td><td className="text-center font-bold">{ (d.cars||0)+(d.motos||0) }</td></tr>)})}</tbody>
             <tfoot className="bg-slate-100 font-bold"><tr><td colSpan="3" className="text-right p-2">GRAN TOTAL:</td><td className="text-center text-indigo-700">{parkingTotal}</td></tr></tfoot>
           </table>
        </Section>

        <Section title="Bitácora" icon={<Edit className="text-slate-500"/>}><textarea className="w-full border rounded p-2 h-24" placeholder="Notas..." value={formData.notes} onChange={e=>setFormData({...formData, notes:e.target.value})}/></Section>
      </form>
    </div>
  );
}

function EventsList({ events, onEdit, onDelete, db }) {
  const handleDelete = async (id) => { if (window.confirm('¿Borrar?')) await deleteDoc(doc(db, COLLECTION_NAME, id)); };
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Historial</h2>
      {events.map(ev => (
        <div key={ev.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
          <div><h3 className="font-bold text-lg">{ev.eventName}</h3><div className="flex gap-4 text-sm text-gray-500"><span>{ev.date}</span><span>{ev.showTime} hrs</span></div></div>
          <div className="flex gap-2"><button onClick={()=>onEdit(ev)} className="p-2 text-blue-600 bg-blue-50 rounded"><Edit size={18}/></button><button onClick={()=>handleDelete(ev.id)} className="p-2 text-red-600 bg-red-50 rounded"><Trash2 size={18}/></button></div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsView({ events, calculateStaffTotals }) {
  if (!events.length) return <div className="p-10 text-center text-gray-400">Sin datos.</div>;
  
  // Procesar datos para gráficas
  const deptData = Object.keys(DEPARTMENT_CONFIG).map(k => {
    let req=0, act=0; 
    events.forEach(ev => { const t = calculateStaffTotals(ev.staffing?.[k]); req+=t.req; act+=t.act; });
    return { name: DEPARTMENT_CONFIG[k].label.split(' ')[0], Pedido: req, Real: act };
  });

  const suppliesData = SUPPLY_ITEMS.map(i => {
    let t=0; events.forEach(e => t+=(parseInt(e.supplies?.[i.id])||0));
    return { name: i.label, Total: t };
  }).filter(x=>x.Total>0);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Reportes</h2>
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white p-4 rounded shadow h-80">
          <h3 className="font-bold mb-4">Personal (Acumulado)</h3>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={deptData} layout="vertical"><XAxis type="number"/><YAxis dataKey="name" type="category" width={80}/><Tooltip/><Legend/><Bar dataKey="Pedido" fill="#94a3b8"/><Bar dataKey="Real" fill="#10b981"/></BarChart></ResponsiveContainer>
        </div>
        <div className="bg-white p-4 rounded shadow h-80">
          <h3 className="font-bold mb-4">Insumos Top</h3>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={suppliesData.slice(0,5)}><XAxis dataKey="name" fontSize={10}/><YAxis/><Tooltip/><Bar dataKey="Total" fill="#f97316"/></BarChart></ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// UI Components
function Section({ title, icon, children }) { return <div className="bg-white rounded shadow overflow-hidden"><div className="p-4 border-b flex gap-2 font-bold text-gray-700">{icon}{title}</div><div className="p-4">{children}</div></div>; }
function NavItem({ icon, label, active, onClick }) { return <button onClick={onClick} className={`w-full flex gap-3 px-4 py-3 rounded ${active?'bg-emerald-600 text-white':'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{icon} {label}</button>; }
function KPICard({ title, value, icon, subtext }) { return <div className="bg-white p-6 rounded shadow flex justify-between"><div><p className="text-gray-500 text-sm">{title}</p><h3 className="text-3xl font-bold">{value}</h3><p className="text-xs text-gray-400">{subtext}</p></div><div className="p-2 bg-gray-50 rounded h-fit">{icon}</div></div>; }
