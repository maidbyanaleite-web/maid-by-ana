import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Calculator, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  UserCircle, 
  Briefcase,
  Bell,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Pages
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Jobs from './pages/Jobs';
import Quotations from './pages/Quotations';
import Reports from './pages/Reports';
import FinancialDashboard from './pages/FinancialDashboard';
import Staff from './pages/Staff';
import Login from './pages/Login';
import { AppUser } from './types';
import { firebaseService } from './services/firebaseService';

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await firebaseService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-petroleum flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <LanguageProvider>
        <Routes>
          <Route path="*" element={<Login onLogin={setUser} />} />
        </Routes>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <NotificationProvider role={user.role === 'Client' ? 'Staff' : user.role}>
        <AppContent user={user} onLogout={() => setUser(null)} />
      </NotificationProvider>
    </LanguageProvider>
  );
}

function AppContent({ user, onLogout }: { user: AppUser, onLogout: () => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  
  // Normalize role to handle potential case sensitivity issues from database
  const role = (user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()) as UserRole;

  const handleLogout = async () => {
    try {
      await firebaseService.logout();
      onLogout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { name: t('dashboard'), path: '/', icon: LayoutDashboard, roles: ['Admin', 'Staff', 'Client'] },
    { name: t('clients'), path: '/clients', icon: Users, roles: ['Admin'] },
    { name: t('jobs'), path: '/jobs', icon: Calendar, roles: ['Admin', 'Staff', 'Client'] },
    { name: t('team'), path: '/staff', icon: Users, roles: ['Admin'] },
    { name: t('quotations'), path: '/quotations', icon: Calculator, roles: ['Admin', 'Staff'] },
    { name: t('finances'), path: '/finances', icon: TrendingUp, roles: ['Admin'] },
    { name: t('receipts'), path: '/reports', icon: FileText, roles: ['Admin'] },
  ];

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
      {/* Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-petroleum text-white transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center">
              <Briefcase className="text-petroleum w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">Maid By Ana</h1>
              <p className="text-xs text-gold/80 font-medium">Cleaning Services</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.filter(item => item.roles.includes(role)).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                    isActive 
                      ? "bg-gold text-petroleum font-semibold shadow-lg shadow-gold/20" 
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-petroleum" : "text-white/70 group-hover:text-white")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
            {/* Language Switcher */}
            <div className="flex p-1 bg-white/10 rounded-lg">
              <button
                onClick={() => setLanguage('en')}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all",
                  language === 'en' ? "bg-gold text-petroleum" : "text-white/50 hover:text-white"
                )}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('pt')}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all",
                  language === 'pt' ? "bg-gold text-petroleum" : "text-white/50 hover:text-white"
                )}
              >
                PT
              </button>
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <UserCircle className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">
                  {user.email}
                </p>
                <p className="text-[10px] text-gold uppercase tracking-widest font-bold">
                  {role}
                </p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-white/50 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-40">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              {isSidebarOpen ? <X /> : <Menu />}
            </button>
            
            <div className="flex items-center gap-4 ml-auto">
              <NotificationBell />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">{user.email.split('@')[0]}</p>
                <p className="text-xs text-slate-500 capitalize">{role.toLowerCase()} Account</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                <UserCircle className="text-slate-400" />
              </div>
            </div>
          </header>

          <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Routes>
                  <Route path="/" element={<Dashboard user={user} />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/jobs" element={<Jobs user={user} />} />
                  <Route path="/staff" element={<Staff />} />
                  <Route path="/quotations" element={<Quotations />} />
                  <Route path="/finances" element={<FinancialDashboard />} />
                  <Route path="/reports" element={<Reports />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    );
}

function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) markAsRead();
        }}
        className="p-2 hover:bg-slate-100 rounded-lg relative transition-colors"
      >
        <Bell className="w-6 h-6 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h4 className="font-bold text-slate-900">Notifications</h4>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Recent</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="flex gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          n.type.includes('Job') ? "bg-blue-50 text-blue-500" : "bg-gold/10 text-gold"
                        )}>
                          {n.type.includes('Job') ? <Calendar className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm text-slate-800 leading-snug">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{format(new Date(n.sent_at), 'MMM dd, HH:mm')}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
