import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth, db } from '../services/firebase';
import { LayoutDashboard, Users, Calculator, LogOut, Menu, X, Languages, FileText, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import NotificationCenter from './NotificationCenter';
import { useLanguage } from '../contexts/LanguageContext';
import { BrandSettings } from '../types';

export default function Layout({ children }: { children: ReactNode }) {
  const { isAdmin, user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [brandSettings, setBrandSettings] = useState<BrandSettings | null>(null);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  useEffect(() => {
    const unsub = db.collection('settings').doc('brand').onSnapshot((doc) => {
      if (doc.exists) {
        setBrandSettings(doc.data() as BrandSettings);
      }
    });
    return () => unsub();
  }, []);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard') },
  ];

  if (isAdmin) {
    navItems.push({ to: '/clients', icon: Users, label: t('clients') });
    navItems.push({ to: '/budget', icon: Calculator, label: t('budget') });
    navItems.push({ to: '/receipts', icon: FileText, label: t('receipts') });
    navItems.push({ to: '/staff', icon: Users, label: t('manageStaff') });
    navItems.push({ to: '/brand-settings', icon: Settings, label: t('brandSettings') });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-petrol text-white flex-col p-6 sticky top-0 h-screen">
        <div className="mb-10">
          {brandSettings?.logoUrl ? (
            <img src={brandSettings.logoUrl} alt={brandSettings.appName} className="h-12 mb-2" />
          ) : (
            <h1 className="text-2xl font-bold text-gold">{brandSettings?.appName || 'Maid By Ana'}</h1>
          )}
          <p className="text-white/50 text-xs uppercase tracking-widest mt-1">Management System</p>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive ? 'bg-gold text-petrol font-bold shadow-lg' : 'hover:bg-white/10 text-white/70'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-red-500/20 hover:text-red-400 transition-all mt-auto"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden bg-petrol p-4 flex justify-between items-center text-white">
        {brandSettings?.logoUrl ? (
          <img src={brandSettings.logoUrl} alt={brandSettings.appName} className="h-8" />
        ) : (
          <h1 className="text-xl font-bold text-gold">{brandSettings?.appName || 'Maid By Ana'}</h1>
        )}
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-petrol text-white p-6 flex flex-col pt-20">
          <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4">
            <X size={32} />
          </button>
          <nav className="space-y-4">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-4 text-xl py-4 border-b border-white/10"
              >
                <item.icon size={24} />
                {item.label}
              </NavLink>
            ))}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-4 text-xl py-4 text-red-400"
            >
              <LogOut size={24} />
              Sign Out
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-8 shrink-0">
          <div className="md:hidden" /> {/* Spacer for mobile */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
              <button 
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-[10px] font-bold rounded ${language === 'en' ? 'bg-petrol text-white' : 'text-slate-400'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('pt')}
                className={`px-2 py-1 text-[10px] font-bold rounded ${language === 'pt' ? 'bg-petrol text-white' : 'text-slate-400'}`}
              >
                PT
              </button>
            </div>
            <NotificationCenter />
            <div className="w-8 h-8 rounded-full bg-petrol flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0)}
            </div>
          </div>
        </header>
        
        <div className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
