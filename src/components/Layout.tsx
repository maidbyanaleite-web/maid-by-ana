import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../services/firebase';
import { 
  LayoutDashboard, 
  Users, 
  Calculator, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/budget', icon: Calculator, label: 'Budget' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-petrol text-white flex-col p-6 sticky top-0 h-screen">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gold">Maid By Ana</h1>
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
        <h1 className="text-xl font-bold text-gold">Maid By Ana</h1>
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
      <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
