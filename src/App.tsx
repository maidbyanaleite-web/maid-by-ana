import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  FileText, 
  Calculator, 
  Plus, 
  Search, 
  LayoutDashboard, 
  LogOut, 
  UserCircle,
  Home,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Image as ImageIcon,
  ChevronRight,
  Download,
  Star,
  Bell,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
  X,
  Settings as SettingsIcon,
  Upload,
  Camera,
  MessageSquare,
  ClipboardCheck,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Client, Service, Quotation, UserRole, Notification, Language, Settings } from './types';
import { cn, formatCurrency } from './lib/utils';
import { generateReceiptPDF } from './lib/pdf';
import { translations } from './translations';
import { firebaseService } from './lib/firebaseService';

// Importação de sub-views (assumindo que existam ou serão implementadas)
// Para este arquivo não quebrar, adicionei placeholders básicos no final.

export default function App() {
  const [role, setRole] = useState<UserRole>('admin');
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const t = translations[lang];
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<Settings>({
    company_name: 'Maid By Ana',
    company_subtitle: 'Cleaning Management',
    company_address: ''
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeInspection, setActiveInspection] = useState<{ serviceId: string, clientId: string | number } | null>(null);

  const isFirebaseEnabled = true;

  useEffect(() => {
    fetchData();
    let unsubscribe: (() => void) | undefined;

    if (isFirebaseEnabled) {
      try {
        unsubscribe = firebaseService.subscribeNotifications(role, (notifs) => {
          setNotifications(notifs);
        });
      } catch (e) {
        console.error("Failed to subscribe to Firebase notifications:", e);
      }
    }
    
    const interval = setInterval(() => {
      if (!isFirebaseEnabled) {
        fetchNotifications();
      }
    }, 30000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, [role, isFirebaseEnabled]);

  const fetchData = async () => {
    setIsLoading(true);
    let success = false;

    if (isFirebaseEnabled) {
      try {
        const [c, s, q, st] = await Promise.all([
          firebaseService.getClients(),
          firebaseService.getServices(),
          firebaseService.getQuotations(),
          firebaseService.getSettings()
        ]);
        setClients(c);
        setServices(s);
        setQuotations(q);
        setSettings(st);
        success = true;
      } catch (error) {
        console.error("Firebase fetch error", error);
      }
    }

    if (!success) {
      try {
        const [clientsRes, servicesRes, quotationsRes, settingsRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/services'),
          fetch('/api/quotations'),
          fetch('/api/settings')
        ]);
        
        if (clientsRes.ok && servicesRes.ok && quotationsRes.ok && settingsRes.ok) {
          setClients(await clientsRes.json());
          setServices(await servicesRes.json());
          setQuotations(await quotationsRes.json());
          setSettings(await settingsRes.json());
          await fetchNotifications();
        }
      } catch (error) {
        console.error('Error fetching data from local API:', error);
      }
    }
    setIsLoading(false);
  };

  const fetchNotifications = async () => {
    if (isFirebaseEnabled) {
      const notifs = await firebaseService.getNotifications(role);
      setNotifications(notifs);
    } else {
      try {
        const res = await fetch(`/api/notifications?role=${role}`);
        if (res.ok) setNotifications(await res.json());
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    }
  };

  const markNotificationRead = async (id: string | number) => {
    if (isFirebaseEnabled) {
      await firebaseService.markNotificationRead(id.toString());
    } else {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchNotifications();
    }
  };

  const addClient = async (clientData: Partial<Client>) => {
    try {
      if (isFirebaseEnabled) {
        await firebaseService.addClient(clientData);
      } else {
        await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData)
        });
      }
      await fetchData();
    } catch (error) {
      alert('Error saving client.');
    }
  };

  const markAsPaid = async (id: string | number) => {
    if (isFirebaseEnabled) {
      await firebaseService.updateService(id.toString(), {
        payment_status: 'paid',
        payment_date: new Date().toISOString(),
        payment_method: 'Transfer'
      });
    } else {
      await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_status: 'paid',
          payment_date: new Date().toISOString(),
          payment_method: 'Transfer'
        })
      });
    }
    fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-teal-900 text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gold-500 rounded flex items-center justify-center overflow-hidden">
            {settings.company_logo ? (
              <img src={settings.company_logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Home className="text-teal-900" size={18} />
            )}
          </div>
          <h1 className="font-bold text-base">{settings.company_name}</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "w-64 bg-teal-900 text-white flex flex-col fixed lg:sticky h-screen top-0 z-50 transition-transform duration-300 lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden lg:flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 bg-gold-500 rounded-lg flex items-center justify-center overflow-hidden">
            {settings.company_logo ? (
              <img src={settings.company_logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Home className="text-teal-900" size={24} />
            )}
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">{settings.company_name}</h1>
            <p className="text-xs text-white/60">{settings.company_subtitle}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label={t.dashboard} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} />
          <NavItem icon={<Users size={20} />} label={t.clients} active={activeTab === 'clients'} onClick={() => { setActiveTab('clients'); setIsSidebarOpen(false); }} />
          <NavItem icon={<Calendar size={20} />} label={t.services} active={activeTab === 'services'} onClick={() => { setActiveTab('services'); setIsSidebarOpen(false); }} />
          <NavItem icon={<Calculator size={20} />} label={t.quotation} active={activeTab === 'quotation'} onClick={() => { setActiveTab('quotation'); setIsSidebarOpen(false); }} />
          {role === 'admin' && (
            <>
              <NavItem icon={<BarChart3 size={20} />} label={t.reports} active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} />
              <NavItem icon={<SettingsIcon size={20} />} label={t.settings} active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2 mb-4 p-1 bg-white/5 rounded-lg">
            <button onClick={() => setLang('en')} className={cn("flex-1 text-[10px] py-1 rounded font-bold", lang === 'en' ? "bg-gold-500 text-teal-900" : "text-white/40")}>EN</button>
            <button onClick={() => setLang('pt')} className={cn("flex-1 text-[10px] py-1 rounded font-bold", lang === 'pt' ? "bg-gold-500 text-teal-900" : "text-white/40")}>PT</button>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-4">
            <UserCircle size={32} className="text-gold-500" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{role === 'admin' ? `Ana (${t.admin})` : t.staff}</p>
              <button onClick={() => setRole(role === 'admin' ? 'staff' : 'admin')} className="text-[10px] text-gold-500 hover:underline">
                {t.switchRole} {role === 'admin' ? t.staff : t.admin}
              </button>
            </div>
          </div>
          <button className="flex items-center gap-2 text-white/60 hover:text-white text-sm w-full p-2">
            <LogOut size={18} /> {t.logout}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8">
        <header className="flex justify-end mb-6 relative">
          <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 bg-white border border-slate-200 rounded-xl relative">
            <Bell size={20} className="text-teal-900" />
            {notifications.some(n => !n.is_read) && <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 border-2 border-white rounded-full"></span>}
          </button>
          
          <AnimatePresence>
            {showNotifications && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h4 className="font-bold text-teal-900">{t.notifications}</h4>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? notifications.map(n => (
                    <div key={n.id} onClick={() => markNotificationRead(n.id)} className={cn("p-4 border-b border-slate-50 cursor-pointer", !n.is_read && "bg-teal-50/30")}>
                      <p className="text-sm font-bold text-teal-900">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                    </div>
                  )) : <div className="p-8 text-center text-slate-400 text-sm">{t.noNotifications}</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {activeTab === 'dashboard' && <Dashboard role={role} clients={clients} services={services} onMarkPaid={markAsPaid} t={t} settings={settings} onStartInspection={(serviceId, clientId) => setActiveInspection({ serviceId, clientId })} />}
            {activeTab === 'clients' && <ClientsView role={role} clients={clients} onAddClient={addClient} t={t} settings={settings} onUpdateClient={async (id, data) => {
                if (isFirebaseEnabled) await firebaseService.updateClient(id.toString(), data);
                fetchData();
            }} />}
            {/* Outras abas seguiriam o mesmo padrão */}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-3 w-full p-3 rounded-xl transition-all", active ? "bg-gold-500 text-teal-900 font-semibold shadow-lg shadow-gold-500/20" : "text-white/70 hover:bg-white/5 hover:text-white")}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Dashboard({ role, clients, services, onMarkPaid, t, settings, onStartInspection }: any) {
  const pendingServices = services.filter((s: any) => s.payment_status === 'pending');
  const todayServices = services.filter((s: any) => s.date === format(new Date(), 'yyyy-MM-dd'));
  const totalRevenue = services.reduce((sum: number, s: any) => sum + s.service_value, 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title={t.totalRevenue} value={formatCurrency(totalRevenue)} icon={<DollarSign className="text-emerald-600" />} color="emerald" />
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-teal-900 mb-4">{t.todaySchedule}</h3>
        {todayServices.map((s: any) => (
          <div key={s.id} className="p-4 bg-slate-50 rounded-xl mb-2 flex justify-between items-center">
            <span>{s.client_name} - {s.service_type}</span>
            <button onClick={() => onStartInspection(s.id, s.client_id)} className="p-2 bg-teal-900 text-white rounded-lg"><ClipboardCheck size={16}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", `bg-${color}-50`)}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-xl font-bold text-teal-900">{value}</p>
      </div>
    </div>
  );
}

function ClientsView({ role, clients, onAddClient, t, settings, onUpdateClient }: any) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-teal-900">{t.clients}</h2>
        <button onClick={() => setShowAdd(true)} className="bg-teal-900 text-white px-4 py-2 rounded-xl flex items-center gap-2"><Plus size={20}/> {t.addClient}</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {clients.map((c: any) => (
          <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-200">
            <h4 className="font-bold text-teal-900">{c.name}</h4>
            <p className="text-sm text-slate-500">{c.address}</p>
          </div>
        ))}
      </div>
      {showAdd && <ClientModal onClose={() => setShowAdd(false)} onSave={onAddClient} t={t} />}
    </div>
  );
}

function ClientModal({ onClose, onSave, t, initialData }: any) {
  const [formData, setFormData] = useState(initialData || { name: '', address: '', type: 'regular', phone: '', frequency: 'weekly' });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold mb-4">{initialData ? t.editClient : t.addClient}</h3>
        <input className="w-full p-2 border rounded-lg mb-3" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <input className="w-full p-2 border rounded-lg mb-3" placeholder="Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
        <div className="flex gap-2">
            <button onClick={() => onSave(formData)} className="flex-1 bg-teal-900 text-white py-2 rounded-lg">Save</button>
            <button onClick={onClose} className="flex-1 bg-slate-100 py-2 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// Placeholders para evitar erros de compilação caso as outras Views não estejam no arquivo
function ServicesView({}: any) { return null; }
function QuotationView({}: any) { return null; }
function ReportsView({}: any) { return null; }
function SettingsView({}: any) { return null; }
function InspectionView({}: any) { return null; }