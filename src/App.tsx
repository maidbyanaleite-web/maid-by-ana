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
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
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
import { Client, Service, Quotation, UserRole, Notification, Language, Settings, InspectionReport, InspectionPhoto } from './types';
import { cn, formatCurrency } from './lib/utils';
import { generateReceiptPDF } from './lib/pdf';
import { translations } from './translations';

import { firebaseService } from './lib/firebaseService';

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

  const isFirebaseEnabled = !!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY.length > 20;

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
        // Silent fallback
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
        
        if (!clientsRes.ok || !servicesRes.ok || !quotationsRes.ok || !settingsRes.ok) {
          throw new Error('Local API fetch failed');
        }

        setClients(await clientsRes.json());
        setServices(await servicesRes.json());
        setQuotations(await quotationsRes.json());
        setSettings(await settingsRes.json());
        await fetchNotifications();
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
        setNotifications(await res.json());
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
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData)
        });
        if (!response.ok) throw new Error('Failed to save client to server');
      }
      await fetchData();
    } catch (error) {
      console.error('Error adding client:', error);
      alert('Error saving client. Please check your connection and try again.');
    }
  };

  const addService = async (serviceData: Partial<Service>) => {
    try {
      if (isFirebaseEnabled) {
        await firebaseService.addService(serviceData);
      } else {
        const response = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serviceData)
        });
        if (!response.ok) throw new Error('Failed to save service to server');
      }
      await fetchData();
    } catch (error) {
      console.error('Error adding service:', error);
      alert('Error saving service. Please check your connection and try again.');
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
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "w-64 bg-teal-900 text-white flex flex-col fixed lg:sticky h-full top-0 z-50 transition-transform duration-300 lg:translate-x-0",
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
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label={t.dashboard} 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
          />
          <NavItem 
            icon={<Users size={20} />} 
            label={t.clients} 
            active={activeTab === 'clients'} 
            onClick={() => { setActiveTab('clients'); setIsSidebarOpen(false); }} 
          />
          <NavItem 
            icon={<Calendar size={20} />} 
            label={t.services} 
            active={activeTab === 'services'} 
            onClick={() => { setActiveTab('services'); setIsSidebarOpen(false); }} 
          />
          <NavItem 
            icon={<Calculator size={20} />} 
            label={t.quotation} 
            active={activeTab === 'quotation'} 
            onClick={() => { setActiveTab('quotation'); setIsSidebarOpen(false); }} 
          />
          {role === 'admin' && (
            <>
              <NavItem 
                icon={<BarChart3 size={20} />} 
                label={t.reports} 
                active={activeTab === 'reports'} 
                onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} 
              />
              <NavItem 
                icon={<SettingsIcon size={20} />} 
                label={t.settings} 
                active={activeTab === 'settings'} 
                onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} 
              />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2 mb-4 p-1 bg-white/5 rounded-lg">
            <button 
              onClick={() => setLang('en')}
              className={cn("flex-1 text-[10px] py-1 rounded font-bold transition-all", lang === 'en' ? "bg-gold-500 text-teal-900" : "text-white/40 hover:text-white")}
            >
              EN
            </button>
            <button 
              onClick={() => setLang('pt')}
              className={cn("flex-1 text-[10px] py-1 rounded font-bold transition-all", lang === 'pt' ? "bg-gold-500 text-teal-900" : "text-white/40 hover:text-white")}
            >
              PT
            </button>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-4">
            <UserCircle size={32} className="text-gold-500" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{role === 'admin' ? `Ana (${t.admin})` : t.staff}</p>
              <button 
                onClick={() => setRole(role === 'admin' ? 'staff' : 'admin')}
                className="text-[10px] text-gold-500 hover:underline"
              >
                {t.switchRole} {role === 'admin' ? t.staff : t.admin}
              </button>
            </div>
          </div>
          <button className="flex items-center gap-2 text-white/60 hover:text-white text-sm w-full p-2">
            <LogOut size={18} />
            {t.logout}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8">
        <header className="flex justify-end mb-6 lg:mb-8 relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 relative"
          >
            <Bell size={20} className="text-teal-900" />
            {notifications.some(n => !n.is_read) && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 border-2 border-white rounded-full"></span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h4 className="font-bold text-teal-900">{t.notifications}</h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{t.recent}</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => markNotificationRead(n.id)}
                      className={cn(
                        "p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors",
                        !n.is_read && "bg-teal-50/30"
                      )}
                    >
                      <p className="text-sm font-bold text-teal-900">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{format(new Date(n.created_at), 'MMM dd, HH:mm')}</p>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      {t.noNotifications}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                role={role} 
                clients={clients} 
                services={services} 
                onMarkPaid={markAsPaid}
                t={t}
                settings={settings}
                onStartInspection={(serviceId, clientId) => setActiveInspection({ serviceId, clientId })}
              />
            )}
            {activeTab === 'clients' && (
              <ClientsView 
                role={role} 
                clients={clients} 
                onAddClient={addClient} 
                t={t}
                settings={settings}
                onUpdateClient={async (id, data) => {
                  try {
                    if (isFirebaseEnabled) {
                      await firebaseService.updateClient(id as string, data);
                    } else {
                      const response = await fetch(`/api/clients/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                      });
                      if (!response.ok) throw new Error('Failed to update client');
                    }
                    await fetchData();
                  } catch (error) {
                    console.error('Error updating client:', error);
                    alert('Error updating client. Please try again.');
                  }
                }}
              />
            )}
            {activeTab === 'services' && (
              <ServicesView 
                role={role} 
                services={services} 
                clients={clients}
                onAddService={addService}
                onMarkPaid={markAsPaid}
                t={t}
                settings={settings}
                onStartInspection={(serviceId, clientId) => setActiveInspection({ serviceId, clientId })}
              />
            )}
            {activeTab === 'quotation' && (
              <QuotationView 
                onSave={async (q) => {
                  if (isFirebaseEnabled) {
                    await firebaseService.addQuotation(q);
                  } else {
                    await fetch('/api/quotations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(q)
                    });
                  }
                  fetchData();
                }}
                t={t}
                settings={settings}
              />
            )}
            {activeTab === 'reports' && role === 'admin' && (
              <ReportsView t={t} settings={settings} />
            )}
            {activeTab === 'settings' && role === 'admin' && (
              <SettingsView 
                settings={settings} 
                onSave={async (s) => {
                  if (isFirebaseEnabled) {
                    await firebaseService.updateSettings(s);
                  } else {
                    await fetch('/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(s)
                    });
                  }
                  fetchData();
                }}
                t={t} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {activeInspection && (
        <InspectionView 
          serviceId={activeInspection.serviceId} 
          clientId={activeInspection.clientId} 
          role={role} 
          onClose={() => setActiveInspection(null)} 
          t={t} 
        />
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200",
        active 
          ? "bg-gold-500 text-teal-900 font-semibold shadow-lg shadow-gold-500/20" 
          : "text-white/70 hover:bg-white/5 hover:text-white"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Dashboard({ role, clients, services, onMarkPaid, t, settings, onStartInspection }: { role: UserRole, clients: Client[], services: Service[], onMarkPaid: (id: number | string) => void, t: any, settings: Settings, onStartInspection: (serviceId: string, clientId: string | number) => void }) {
  const pendingServices = services.filter(s => s.payment_status === 'pending');
  const todayServices = services.filter(s => s.date === format(new Date(), 'yyyy-MM-dd'));
  
  const totalRevenue = services.reduce((sum, s) => sum + s.service_value, 0);
  const totalStaffPay = services.reduce((sum, s) => sum + s.staff_value, 0);
  const totalProfit = totalRevenue - totalStaffPay;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-teal-900">{t.welcome}, {role === 'admin' ? 'Ana' : t.staff}!</h2>
          <p className="text-slate-500">{settings.company_name}.</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wider">{format(new Date(), 'EEEE')}</p>
          <p className="text-base md:text-lg font-bold text-teal-900">{format(new Date(), 'MMMM do, yyyy')}</p>
        </div>
      </header>

      {role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title={t.totalRevenue} value={formatCurrency(totalRevenue)} icon={<DollarSign className="text-emerald-600" />} color="emerald" />
          <StatCard title={t.staffPayments} value={formatCurrency(totalStaffPay)} icon={<Users className="text-amber-600" />} color="amber" />
          <StatCard title={t.netProfit} value={formatCurrency(totalProfit)} icon={<CheckCircle2 className="text-teal-600" />} color="teal" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-teal-900 flex items-center gap-2">
              <Clock size={20} className="text-gold-500" />
              {t.todaySchedule}
            </h3>
            <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-full">
              {todayServices.length} {t.services}
            </span>
          </div>
          
          <div className="space-y-4">
            {todayServices.length > 0 ? todayServices.map(service => (
              <div key={service.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center",
                  service.client_type === 'airbnb' ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                )}>
                  {service.client_type === 'airbnb' ? <Building2 size={24} /> : <Home size={24} />}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-teal-900">{service.client_name}</p>
                  <p className="text-xs text-slate-500">{service.service_type}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-sm font-bold text-teal-900">{formatCurrency(role === 'admin' ? service.service_value : service.staff_value)}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{role === 'admin' ? t.revenue : t.staffPay}</p>
                  </div>
                  <button 
                    onClick={() => onStartInspection(service.id.toString(), service.client_id)}
                    className="p-2 bg-teal-900 text-white rounded-lg hover:bg-teal-800 transition-colors"
                    title={t.inspectionReport}
                  >
                    <ClipboardCheck size={18} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-slate-400">
                <p>No cleanings scheduled for today.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-teal-900 flex items-center gap-2">
              <DollarSign size={20} className="text-gold-500" />
              {t.pendingPayments}
            </h3>
            <button 
              onClick={() => generateReceiptPDF(pendingServices, 'monthly', settings)}
              className="text-xs text-teal-700 hover:underline flex items-center gap-1"
            >
              <Download size={14} /> {t.exportReport}
            </button>
          </div>

          <div className="space-y-4">
            {pendingServices.slice(0, 5).map(service => (
              <div key={service.id} className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-semibold text-teal-900">{service.client_name}</p>
                  <p className="text-xs text-slate-400">{format(new Date(service.date), 'MMM dd, yyyy')}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold text-teal-900">{formatCurrency(service.service_value)}</p>
                  {role === 'admin' && (
                    <button 
                      onClick={() => onMarkPaid(service.id)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <CheckCircle2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {pendingServices.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p>All payments are up to date!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", `bg-${color}-50`)}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-teal-900">{value}</p>
      </div>
    </div>
  );
}

function ClientsView({ role, clients, onAddClient, t, settings, onUpdateClient }: { role: UserRole, clients: Client[], onAddClient: (c: Partial<Client>) => void, t: any, settings: Settings, onUpdateClient: (id: string | number, data: Partial<Client>) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [filter, setFilter] = useState<'all' | 'regular' | 'airbnb'>('all');
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter(c => {
    const matchesFilter = filter === 'all' || c.type === filter;
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                         c.address.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-teal-900">{t.clients}</h2>
          <p className="text-slate-500">{settings.company_name}.</p>
        </div>
        {role === 'admin' && (
          <button 
            onClick={() => setShowAdd(true)}
            className="w-full md:w-auto bg-teal-900 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-teal-800 transition-colors shadow-lg shadow-teal-900/20"
          >
            <Plus size={20} /> {t.addClient}
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap gap-2">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>{t.all}</FilterButton>
          <FilterButton active={filter === 'regular'} onClick={() => setFilter('regular')}>{t.residential}</FilterButton>
          <FilterButton active={filter === 'airbnb'} onClick={() => setFilter('airbnb')}>{t.airbnb}</FilterButton>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={t.searchClients} 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-900/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClients.map(client => (
          <ClientCard key={client.id} client={client} role={role} t={t} onEdit={() => setEditingClient(client)} />
        ))}
      </div>

      {showAdd && (
        <ClientModal onClose={() => setShowAdd(false)} onSave={onAddClient} t={t} />
      )}

      {editingClient && (
        <ClientModal 
          onClose={() => setEditingClient(null)} 
          onSave={(data) => {
            onUpdateClient(editingClient.id, data);
            setEditingClient(null);
          }} 
          t={t} 
          initialData={editingClient}
        />
      )}
    </div>
  );
}

function FilterButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
        active ? "bg-teal-900 text-white" : "text-slate-500 hover:bg-slate-100"
      )}
    >
      {children}
    </button>
  );
}

function ClientCard({ client, role, t, onEdit }: { client: Client, role: UserRole, t: any, onEdit: () => void, key?: React.Key }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          client.type === 'airbnb' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
        )}>
          {client.type === 'airbnb' ? <Building2 size={24} /> : <Home size={24} />}
        </div>
        <span className={cn(
          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
          client.type === 'airbnb' ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
        )}>
          {client.type === 'airbnb' ? t.airbnb : t.residential}
        </span>
      </div>

      <h4 className="text-lg font-bold text-teal-900 mb-1">{client.name}</h4>
      {client.type === 'airbnb' && (
        <p className="text-sm text-slate-500 mb-2 italic">"{client.property_name}"</p>
      )}
      <p className="text-sm text-slate-400 flex items-center gap-2 mb-4">
        <Search size={14} /> {client.address}
      </p>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold">{t.frequency}</p>
          <p className="text-sm font-semibold text-teal-900 capitalize">{t[client.frequency as keyof typeof t] || client.frequency}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold">{t.contact}</p>
          <p className="text-sm font-semibold text-teal-900">{client.phone}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={onEdit}
          className="flex-1 bg-slate-900 text-white text-xs font-bold py-2 rounded-lg hover:bg-black"
        >
          {role === 'admin' ? t.edit : t.viewDetails}
        </button>
        {client.type === 'airbnb' && client.property_link && (
          <a href={client.property_link} target="_blank" rel="noreferrer" className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100">
            <Building2 size={16} />
          </a>
        )}
      </div>
    </div>
  );
}

function QuotationView({ onSave, t, settings }: { onSave: (q: any) => void, t: any, settings: Settings }) {
  const [type, setType] = useState<'hourly' | 'detailed'>('hourly');
  const [clientName, setClientName] = useState('');
  
  // Hourly State
  const [hours, setHours] = useState(2);
  const [hourlyRate, setHourlyRate] = useState(45);
  const [hasPets, setHasPets] = useState(false);
  
  // Detailed State
  const [rooms, setRooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [stairs, setStairs] = useState(0);
  const [windows, setWindows] = useState(0);
  const [blinds, setBlinds] = useState(0);
  const [fridge, setFridge] = useState(false);
  const [oven, setOven] = useState(false);

  const calculateTotal = () => {
    if (type === 'hourly') {
      const standardRate = 45;
      const premiumRate = 55;
      const hasExtras = hasPets || fridge || oven;
      const currentRate = hasExtras ? premiumRate : standardRate;
      return hours * currentRate;
    } else {
      let total = 50; // Base fee
      total += rooms * 25;
      total += bathrooms * 30;
      total += stairs * 15;
      total += windows * 10;
      total += blinds * 12;
      if (fridge) total += 25;
      if (oven) total += 25;
      return total;
    }
  };

  const total = calculateTotal();

  const handleSave = () => {
    const details = type === 'hourly' 
      ? { hours, hasPets, fridge, oven } 
      : { rooms, bathrooms, stairs, windows, blinds, fridge, oven };
    
    onSave({
      client_name: clientName || 'New Inquiry',
      type,
      details,
      total
    });
    alert('Quotation saved successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-teal-900">{t.quotation}</h2>
        <p className="text-slate-500">{settings.company_name}.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 space-y-6">
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl">
              <button 
                onClick={() => setType('hourly')}
                className={cn("flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-bold transition-all", type === 'hourly' ? "bg-white text-teal-900 shadow-sm" : "text-slate-500")}
              >
                {t.simple}
              </button>
              <button 
                onClick={() => setType('detailed')}
                className={cn("flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-bold transition-all", type === 'detailed' ? "bg-white text-teal-900 shadow-sm" : "text-slate-500")}
              >
                {t.detailed}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.clientName}</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. John Doe - 123 Main St"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-900/10"
                />
              </div>

              {type === 'hourly' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.hours} (House Size)</label>
                    <input 
                      type="number" 
                      value={hours}
                      onChange={(e) => setHours(Number(e.target.value))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-900/10"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                      hasPets ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
                    )} onClick={() => setHasPets(!hasPets)}>
                      <input 
                        type="checkbox" 
                        checked={hasPets}
                        onChange={() => {}} 
                        className="w-5 h-5 accent-amber-600"
                      />
                      <span className={cn("text-sm font-bold", hasPets ? "text-amber-900" : "text-slate-500")}>{t.pets}</span>
                    </div>

                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                      fridge ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"
                    )} onClick={() => setFridge(!fridge)}>
                      <input 
                        type="checkbox" 
                        checked={fridge}
                        onChange={() => {}} 
                        className="w-5 h-5 accent-blue-600"
                      />
                      <span className={cn("text-sm font-bold", fridge ? "text-blue-900" : "text-slate-500")}>{t.fridge}</span>
                    </div>

                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                      oven ? "bg-orange-50 border-orange-200" : "bg-slate-50 border-slate-200"
                    )} onClick={() => setOven(!oven)}>
                      <input 
                        type="checkbox" 
                        checked={oven}
                        onChange={() => {}} 
                        className="w-5 h-5 accent-orange-600"
                      />
                      <span className={cn("text-sm font-bold", oven ? "text-orange-900" : "text-slate-500")}>{t.oven}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                    <p className="text-xs font-bold text-teal-900 uppercase mb-1">Current Rate</p>
                    <p className="text-lg font-bold text-teal-900">
                      ${(hasPets || fridge || oven) ? '55.00' : '45.00'} / hour
                    </p>
                    <p className="text-[10px] text-teal-600 mt-1">
                      {(hasPets || fridge || oven) 
                        ? "Premium rate applied due to extras (Pets/Fridge/Oven)." 
                        : "Standard rate applied for basic Deep Clean."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Counter label={t.bedrooms} value={rooms} onChange={setRooms} />
                  <Counter label={t.bathrooms} value={bathrooms} onChange={setBathrooms} />
                  <Counter label={t.stairs} value={stairs} onChange={setStairs} />
                  <Counter label={t.windows} value={windows} onChange={setWindows} />
                  <Counter label={t.blinds} value={blinds} onChange={setBlinds} />
                  <div className="col-span-2 grid grid-cols-2 gap-4 pt-4">
                    <ToggleButton label={t.fridge} active={fridge} onClick={() => setFridge(!fridge)} />
                    <ToggleButton label={t.oven} active={oven} onClick={() => setOven(!oven)} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-teal-900 text-white p-6 md:p-8 rounded-3xl shadow-xl shadow-teal-900/20 md:sticky md:top-8">
            <h3 className="text-gold-500 font-bold uppercase tracking-widest text-xs mb-6">{t.estimatedTotal}</h3>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-xl md:text-2xl font-medium">$</span>
              <span className="text-4xl md:text-6xl font-bold">{total.toFixed(2)}</span>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm text-white/60">
                <span>{t.type}</span>
                <span className="text-white font-medium capitalize">{type === 'hourly' ? t.simple : t.detailed}</span>
              </div>
              <div className="flex justify-between text-sm text-white/60">
                <span>Base Price</span>
                <span className="text-white font-medium">{type === 'hourly' ? `$${(hours * hourlyRate).toFixed(2)}` : '$50.00'}</span>
              </div>
              {type === 'detailed' && (
                <div className="flex justify-between text-sm text-white/60">
                  <span>Room Extras</span>
                  <span className="text-white font-medium">${(total - 50).toFixed(2)}</span>
                </div>
              )}
            </div>

            <button 
              onClick={handleSave}
              className="w-full bg-gold-500 text-teal-900 font-bold py-4 rounded-2xl hover:bg-gold-600 transition-all flex items-center justify-center gap-2"
            >
              <FileText size={20} /> {t.saveQuotation}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Counter({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
      <span className="text-sm font-bold text-teal-900">{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100">-</button>
        <span className="w-4 text-center font-bold">{value}</span>
        <button onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100">+</button>
      </div>
    </div>
  );
}

function ToggleButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-between",
        active ? "bg-teal-50 border-teal-200 text-teal-900" : "bg-slate-50 border-slate-200 text-slate-500"
      )}
    >
      {label}
      {active ? <CheckCircle2 size={18} className="text-teal-600" /> : <Plus size={18} />}
    </button>
  );
}

function ServicesView({ role, services, clients, onAddService, onMarkPaid, t, settings, onStartInspection }: { role: UserRole, services: Service[], clients: Client[], onAddService: (s: any) => void, onMarkPaid: (id: number | string) => void, t: any, settings: Settings, onStartInspection: (serviceId: string, clientId: string | number) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-teal-900">{t.services}</h2>
          <p className="text-slate-500">{settings.company_name}.</p>
        </div>
        {role === 'admin' && (
          <button 
            onClick={() => setShowAdd(true)}
            className="w-full md:w-auto bg-teal-900 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2"
          >
            <Plus size={20} /> {t.logService}
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">{t.date}</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">{t.client}</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">{t.type}</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">{t.status}</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">{t.value}</th>
              {role === 'admin' && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">{t.staffPay}</th>}
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {services.map(service => (
              <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-teal-900">{format(new Date(service.date), 'MMM dd, yyyy')}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-teal-900">{service.client_name}</span>
                    {service.client_type === 'airbnb' && <Building2 size={14} className="text-rose-500" />}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{service.service_type}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold uppercase",
                    service.payment_status === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {service.payment_status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-teal-900">{formatCurrency(service.service_value)}</td>
                {role === 'admin' && <td className="px-6 py-4 text-sm font-medium text-slate-500">{formatCurrency(service.staff_value)}</td>}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onStartInspection(service.id.toString(), service.client_id)}
                      className="p-2 text-slate-400 hover:text-teal-900 hover:bg-slate-100 rounded-lg"
                      title={t.inspectionReport}
                    >
                      <ClipboardCheck size={18} />
                    </button>
                    <button 
                      onClick={() => generateReceiptPDF([service], 'single', settings)}
                      className="p-2 text-slate-400 hover:text-teal-900 hover:bg-slate-100 rounded-lg"
                    >
                      <Download size={18} />
                    </button>
                    {role === 'admin' && service.payment_status === 'pending' && (
                      <button 
                        onClick={() => onMarkPaid(service.id)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showAdd && (
        <ServiceModal clients={clients} onClose={() => setShowAdd(false)} onSave={onAddService} t={t} />
      )}
    </div>
  );
}

function ClientModal({ onClose, onSave, t, initialData }: { onClose: () => void, onSave: (c: any) => void, t: any, initialData?: Client }) {
  const [formData, setFormData] = useState<Partial<Client>>(initialData || {
    type: 'regular',
    name: '',
    owner_name: '',
    property_name: '',
    address: '',
    email: '',
    phone: '',
    frequency: 'biweekly',
    property_link: '',
    mandatory_photos: []
  });

  const [newMandatoryPhoto, setNewMandatoryPhoto] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="bg-teal-900 p-6 text-white flex justify-between items-center">
          <h3 className="text-xl font-bold">{initialData ? t.edit : t.addClient}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="flex gap-4 p-1 bg-slate-100 rounded-xl mb-6">
            <button 
              type="button"
              onClick={() => setFormData({...formData, type: 'regular'})}
              className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", formData.type === 'regular' ? "bg-white text-teal-900 shadow-sm" : "text-slate-500")}
            >
              {t.residential}
            </button>
            <button 
              type="button"
              onClick={() => setFormData({...formData, type: 'airbnb'})}
              className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", formData.type === 'airbnb' ? "bg-white text-teal-900 shadow-sm" : "text-slate-500")}
            >
              {t.airbnb}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
            {formData.type === 'airbnb' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Owner Name</label>
                  <input type="text" value={formData.owner_name} onChange={e => setFormData({...formData, owner_name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Property Name</label>
                  <input type="text" value={formData.property_name} onChange={e => setFormData({...formData, property_name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Address</label>
              <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phone</label>
              <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.frequency}</label>
              <select value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <option value="weekly">{t.weekly}</option>
                <option value="biweekly">{t.biweekly}</option>
                <option value="monthly">{t.monthly}</option>
              </select>
            </div>
            {formData.type === 'airbnb' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Property Link</label>
                <input type="url" value={formData.property_link} onChange={e => setFormData({...formData, property_link: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.mandatoryPhotos}</label>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={newMandatoryPhoto} 
                  onChange={e => setNewMandatoryPhoto(e.target.value)}
                  placeholder="Ex: Baseboard, Air Vent..."
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
                <button 
                  type="button"
                  onClick={() => {
                    if (newMandatoryPhoto.trim()) {
                      setFormData({
                        ...formData,
                        mandatory_photos: [...(formData.mandatory_photos || []), newMandatoryPhoto.trim()]
                      });
                      setNewMandatoryPhoto('');
                    }
                  }}
                  className="px-4 bg-teal-900 text-white rounded-xl font-bold"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.mandatory_photos?.map((photo, idx) => (
                  <span key={idx} className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-full flex items-center gap-2">
                    {photo}
                    <button 
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        mandatory_photos: formData.mandatory_photos?.filter((_, i) => i !== idx)
                      })}
                      className="hover:text-rose-500"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="flex-1 py-3 bg-teal-900 text-white rounded-xl font-bold hover:bg-teal-800 shadow-lg shadow-teal-900/20">
              {initialData ? t.edit : t.addClient}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ServiceModal({ clients, onClose, onSave, t }: { clients: Client[], onClose: () => void, onSave: (s: any) => void, t: any }) {
  const [formData, setFormData] = useState({
    client_id: clients[0]?.id || 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    service_type: 'Regular Cleaning',
    service_value: 0,
    staff_value: 0,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="bg-teal-900 p-6 text-white flex justify-between items-center">
          <h3 className="text-xl font-bold">{t.logService}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.client}</label>
              <select required value={formData.client_id} onChange={e => setFormData({...formData, client_id: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl">
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.date}</label>
                <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.type}</label>
                <select value={formData.service_type} onChange={e => setFormData({...formData, service_type: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <option>Regular Cleaning</option>
                  <option>Deep Clean</option>
                  <option>Move-in</option>
                  <option>Move-out</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.value} ($)</label>
                <input required type="number" value={formData.service_value} onChange={e => setFormData({...formData, service_value: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.staffPay} ($)</label>
                <input required type="number" value={formData.staff_value} onChange={e => setFormData({...formData, staff_value: Number(e.target.value)})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Notes</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-24" />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="flex-1 py-3 bg-teal-900 text-white rounded-xl font-bold hover:bg-teal-800 shadow-lg shadow-teal-900/20">{t.logService}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ReportsView({ t, settings }: { t: any, settings: Settings }) {
  const [range, setRange] = useState<'week' | 'month' | 'custom'>('month');
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<{ stats: any, breakdown: any[] }>({ stats: {}, breakdown: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [range, customStart, customEnd]);

  const fetchStats = async () => {
    setIsLoading(true);
    let start = customStart;
    let end = customEnd;

    if (range === 'week') {
      start = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      end = format(endOfWeek(new Date()), 'yyyy-MM-dd');
    } else if (range === 'month') {
      start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    }

    try {
      const res = await fetch(`/api/financial-stats?start_date=${start}&end_date=${end}`);
      setData(await res.json());
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-teal-900">{t.financialReports}</h2>
          <p className="text-slate-500">{settings.company_name}.</p>
        </div>
        <div className="flex flex-wrap gap-2 p-1 bg-white border border-slate-200 rounded-xl">
          <button 
            onClick={() => setRange('week')}
            className={cn("flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all", range === 'week' ? "bg-teal-900 text-white" : "text-slate-500 hover:bg-slate-50")}
          >
            {t.thisWeek}
          </button>
          <button 
            onClick={() => setRange('month')}
            className={cn("flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all", range === 'month' ? "bg-teal-900 text-white" : "text-slate-500 hover:bg-slate-50")}
          >
            {t.thisMonth}
          </button>
          <button 
            onClick={() => setRange('custom')}
            className={cn("flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all", range === 'custom' ? "bg-teal-900 text-white" : "text-slate-500 hover:bg-slate-50")}
          >
            {t.custom}
          </button>
        </div>
      </header>

      {range === 'custom' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-4 p-4 bg-white rounded-2xl border border-slate-200"
        >
          <div className="w-full md:flex-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
          <div className="w-full md:flex-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Date</label>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportStatCard 
          title={t.revenue} 
          value={formatCurrency(data.stats?.total_revenue || 0)} 
          trend="+12%" 
          color="emerald" 
        />
        <ReportStatCard 
          title={t.expenses} 
          value={formatCurrency(data.stats?.total_staff_pay || 0)} 
          trend="+5%" 
          color="amber" 
        />
        <ReportStatCard 
          title={t.profit} 
          value={formatCurrency(data.stats?.total_profit || 0)} 
          trend="+18%" 
          color="teal" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-teal-900 mb-6">{t.revenueVsExpenses}</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.breakdown}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                <Area type="monotone" dataKey="staff_pay" stroke="#f59e0b" fillOpacity={0} strokeWidth={3} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-teal-900 mb-6">{t.dailyProfit}</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.breakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="profit" fill="#0d2d3a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportStatCard({ title, value, trend, color }: { title: string, value: string, trend: string, color: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <h4 className="text-3xl font-bold text-teal-900">{value}</h4>
        <div className={cn(
          "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg",
          trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {trend.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
    </div>
  );
}

function SettingsView({ settings, onSave, t }: { settings: Settings, onSave: (s: Settings) => void, t: any }) {
  const [formData, setFormData] = useState<Settings>(settings);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    alert('Settings saved successfully!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, company_logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-teal-900">{t.settings}</h2>
        <p className="text-slate-500">{formData.company_name}.</p>
      </header>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-32 h-32 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
              {formData.company_logo ? (
                <img src={formData.company_logo} alt="Logo Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="text-slate-300" size={48} />
              )}
              <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Upload className="text-white" size={24} />
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase">{t.companyLogo}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.companyName}</label>
              <input 
                type="text" 
                value={formData.company_name} 
                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-900/10 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.companySubtitle}</label>
              <input 
                type="text" 
                value={formData.company_subtitle} 
                onChange={e => setFormData({ ...formData, company_subtitle: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-900/10 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t.companyAddress}</label>
              <textarea 
                value={formData.company_address} 
                onChange={e => setFormData({ ...formData, company_address: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-900/10 outline-none h-24"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-teal-900 text-white rounded-2xl font-bold hover:bg-teal-800 transition-colors shadow-lg shadow-teal-900/20"
          >
            {t.saveSettings}
          </button>
        </form>
      </div>
    </div>
  );
}

function PhotoUpload({ onUpload, label, t }: { onUpload: (url: string) => void, label: string, t: any }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `inspections/${Date.now()}_${file.name}`;
        const url = await firebaseService.uploadImage(file, path);
        onUpload(url);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer relative">
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-teal-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400 uppercase">Uploading...</span>
        </div>
      ) : (
        <>
          <Camera className="text-slate-300 mb-2" size={24} />
          <span className="text-xs font-bold text-slate-400 uppercase">{label}</span>
        </>
      )}
      <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" disabled={uploading} />
    </label>
  );
}

function InspectionView({ serviceId, clientId, role, onClose, t }: { serviceId: string, clientId: string | number, role: UserRole, onClose: () => void, t: any }) {
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'check-in' | 'check-out' | 'audit' | 'checklist'>('check-in');
  const [newExtraPhoto, setNewExtraPhoto] = useState('');

  useEffect(() => {
    const fetchClient = async () => {
      const clients = await firebaseService.getClients();
      const found = clients.find(c => c.id === clientId);
      if (found) setClient(found);
    };
    fetchClient();

    const unsub = firebaseService.subscribeInspectionReport(serviceId, (data) => {
      if (data) {
        setReport(data);
      } else {
        // Create initial report
        const initialReport: Partial<InspectionReport> = {
          service_id: serviceId,
          client_id: clientId,
          check_in_photos: [],
          check_out_photos: [
            { category: t.rooms, photos: [] },
            { category: t.kitchen, photos: [] },
            { category: t.bathroom, photos: [] },
            { category: t.specialAreas, photos: [] }
          ],
          audit_photos: [],
          status: 'in_progress'
        };
        firebaseService.saveInspectionReport(initialReport);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [serviceId, clientId, t]);

  const handleAddPhoto = async (url: string, type: 'check-in' | 'check-out' | 'audit', categoryIndex?: number) => {
    if (!report) return;

    const newPhoto: InspectionPhoto = {
      url,
      timestamp: new Date().toISOString()
    };

    const updatedReport = { ...report };
    if (type === 'check-in') {
      updatedReport.check_in_photos = [...updatedReport.check_in_photos, newPhoto];
    } else if (type === 'check-out' && categoryIndex !== undefined) {
      updatedReport.check_out_photos[categoryIndex].photos = [
        ...updatedReport.check_out_photos[categoryIndex].photos,
        newPhoto
      ];
    } else if (type === 'audit') {
      updatedReport.audit_photos = [...updatedReport.audit_photos, newPhoto];
    }

    await firebaseService.saveInspectionReport(updatedReport);
  };

  const handleUpdatePhoto = async (type: 'check-in' | 'check-out' | 'audit', index: number, data: Partial<InspectionPhoto>, categoryIndex?: number) => {
    if (!report) return;
    const updatedReport = { ...report };
    
    if (type === 'check-in') {
      updatedReport.check_in_photos[index] = { ...updatedReport.check_in_photos[index], ...data };
    } else if (type === 'check-out' && categoryIndex !== undefined) {
      updatedReport.check_out_photos[categoryIndex].photos[index] = { 
        ...updatedReport.check_out_photos[categoryIndex].photos[index], 
        ...data 
      };
    } else if (type === 'audit') {
      updatedReport.audit_photos[index] = { ...updatedReport.audit_photos[index], ...data };
    }

    await firebaseService.saveInspectionReport(updatedReport);
  };

  if (loading) return (
    <div className="fixed inset-0 bg-white z-[60] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-teal-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col overflow-hidden">
      <header className="bg-teal-900 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
          <div>
            <h2 className="font-bold text-lg">{t.inspectionReport}</h2>
            <p className="text-xs text-white/60">Service ID: {serviceId}</p>
          </div>
        </div>
        {report?.status === 'in_progress' && role === 'staff' && (
          <button 
            onClick={async () => {
              if (report) {
                await firebaseService.saveInspectionReport({ ...report, status: 'completed' });
                onClose();
              }
            }}
            className="bg-gold-500 text-teal-900 px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-gold-500/20"
          >
            {t.finishInspection}
          </button>
        )}
      </header>

      <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('check-in')}
          className={cn(
            "flex-1 min-w-[100px] py-4 text-sm font-bold transition-all border-b-2",
            activeTab === 'check-in' ? "border-teal-900 text-teal-900 bg-white" : "border-transparent text-slate-400"
          )}
        >
          {t.checkIn}
        </button>
        <button 
          onClick={() => setActiveTab('checklist')}
          className={cn(
            "flex-1 min-w-[100px] py-4 text-sm font-bold transition-all border-b-2",
            activeTab === 'checklist' ? "border-teal-900 text-teal-900 bg-white" : "border-transparent text-slate-400"
          )}
        >
          {t.checklist}
        </button>
        <button 
          onClick={() => setActiveTab('check-out')}
          className={cn(
            "flex-1 min-w-[100px] py-4 text-sm font-bold transition-all border-b-2",
            activeTab === 'check-out' ? "border-teal-900 text-teal-900 bg-white" : "border-transparent text-slate-400"
          )}
        >
          {t.checkOut}
        </button>
        <button 
          onClick={() => setActiveTab('audit')}
          className={cn(
            "flex-1 min-w-[100px] py-4 text-sm font-bold transition-all border-b-2",
            activeTab === 'audit' ? "border-teal-900 text-teal-900 bg-white" : "border-transparent text-slate-400"
          )}
        >
          {t.audit}
        </button>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-8">
          {activeTab === 'checklist' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-teal-900 mb-4">{t.mandatoryPhotos}</h3>
                
                {role === 'admin' && report?.status === 'in_progress' && (
                  <div className="flex gap-2 mb-6">
                    <input 
                      type="text" 
                      value={newExtraPhoto} 
                      onChange={e => setNewExtraPhoto(e.target.value)}
                      placeholder="Add extra photo requirement for today..."
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                    <button 
                      onClick={async () => {
                        if (newExtraPhoto.trim() && report) {
                          const updatedReport = { ...report };
                          updatedReport.extra_mandatory_photos = [
                            ...(updatedReport.extra_mandatory_photos || []),
                            newExtraPhoto.trim()
                          ];
                          await firebaseService.saveInspectionReport(updatedReport);
                          setNewExtraPhoto('');
                        }
                      }}
                      className="px-4 bg-teal-900 text-white rounded-xl font-bold"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {[...(client?.mandatory_photos || []), ...(report?.extra_mandatory_photos || [])].map((item, idx) => {
                    const isDone = report?.check_out_photos.some(cat => 
                      cat.photos.some(p => p.label === item)
                    );
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                            isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                          )}>
                            {isDone && <Check size={14} />}
                          </div>
                          <span className={cn("font-bold", isDone ? "text-emerald-600" : "text-teal-900")}>{item}</span>
                        </div>
                        {role === 'staff' && report?.status === 'in_progress' && !isDone && (
                          <PhotoUpload 
                            onUpload={async (url) => {
                              // Find a category to put it in, or just add to special areas
                              const catIdx = report.check_out_photos.findIndex(c => c.category === t.specialAreas);
                              const newPhoto: InspectionPhoto = {
                                url,
                                timestamp: new Date().toISOString(),
                                label: item
                              };
                              const updatedReport = { ...report };
                              updatedReport.check_out_photos[catIdx].photos = [
                                ...updatedReport.check_out_photos[catIdx].photos,
                                newPhoto
                              ];
                              await firebaseService.saveInspectionReport(updatedReport);
                            }} 
                            label={t.takePhoto} 
                            t={t} 
                          />
                        )}
                      </div>
                    );
                  })}
                  {(!client?.mandatory_photos || client.mandatory_photos.length === 0) && (
                    <div className="text-center py-12 text-slate-400">
                      <p>No mandatory photos defined for this property.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'check-in' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-teal-900 mb-4">{t.problemsFound}</h3>
                {role === 'staff' && report?.status === 'in_progress' && (
                  <PhotoUpload onUpload={(url) => handleAddPhoto(url, 'check-in')} label={t.addPhoto} t={t} />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {report?.check_in_photos.map((photo, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 flex flex-col">
                      <img src={photo.url} alt="Check-in" className="w-full aspect-video object-cover" />
                      <div className="p-4 space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.comment}</label>
                          {role === 'staff' && report.status === 'in_progress' ? (
                            <textarea 
                              value={photo.comment || ''} 
                              onChange={(e) => handleUpdatePhoto('check-in', idx, { comment: e.target.value })}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-900/10"
                              placeholder="Describe the issue..."
                            />
                          ) : (
                            <p className="text-sm text-teal-900 bg-white p-2 rounded-lg border border-slate-100">{photo.comment || 'No comment'}</p>
                          )}
                        </div>
                        {(photo.admin_reply || role === 'admin') && (
                          <div className="pl-4 border-l-2 border-gold-500 bg-gold-50/30 p-2 rounded-r-lg">
                            <label className="block text-[10px] font-bold text-gold-600 uppercase mb-1">{t.adminReply}</label>
                            {role === 'admin' ? (
                              <textarea 
                                value={photo.admin_reply || ''} 
                                onChange={(e) => handleUpdatePhoto('check-in', idx, { admin_reply: e.target.value })}
                                className="w-full p-2 bg-white border border-gold-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gold-500/10"
                                placeholder="Reply to staff..."
                              />
                            ) : (
                              <p className="text-sm text-teal-900">{photo.admin_reply || 'Waiting for reply...'}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'check-out' && (
            <div className="space-y-8">
              {report?.check_out_photos.map((cat, catIdx) => (
                <div key={catIdx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-teal-900 mb-4">{cat.category}</h3>
                  {role === 'staff' && report.status === 'in_progress' && (
                    <PhotoUpload onUpload={(url) => handleAddPhoto(url, 'check-out', catIdx)} label={`${t.addPhoto} - ${cat.category}`} t={t} />
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                    {cat.photos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                        <img src={photo.url} alt="Check-out" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold">{format(new Date(photo.timestamp), 'HH:mm')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-teal-900 mb-4">{t.auditPhotos}</h3>
                {role === 'staff' && report?.status === 'in_progress' && (
                  <PhotoUpload onUpload={(url) => handleAddPhoto(url, 'audit')} label={t.addPhoto} t={t} />
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                  {report?.audit_photos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={photo.url} alt="Audit" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold">{format(new Date(photo.timestamp), 'HH:mm')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
