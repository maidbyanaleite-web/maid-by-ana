import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Lock, Mail, AlertCircle } from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'Staff' | 'Client'>('Admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let user;
      if (isRegistering) {
        user = await firebaseService.register(email, password, role);
      } else {
        user = await firebaseService.login(email, password);
      }
      onLogin(user);
      navigate('/');
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-petroleum flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gold rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-gold/20 rotate-3">
            <Briefcase className="text-petroleum w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Maid By Ana</h1>
          <p className="text-gold/80 font-medium uppercase tracking-widest text-xs">Cleaning Services Management</p>
        </div>

        <div className="bg-white rounded-[2rem] p-8 shadow-2xl border border-white/10">
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
            <button 
              onClick={() => setIsRegistering(false)}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                !isRegistering ? "bg-white text-petroleum shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Login
            </button>
            <button 
              onClick={() => setIsRegistering(true)}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                isRegistering ? "bg-white text-petroleum shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Register
            </button>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {isRegistering && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Account Type</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-petroleum/20 focus:border-petroleum transition-all outline-none text-slate-900 font-medium appearance-none"
                >
                  <option value="Admin">Administrator</option>
                  <option value="Staff">Staff Member</option>
                  <option value="Client">Client</option>
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-petroleum/20 focus:border-petroleum transition-all outline-none text-slate-900 font-medium"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-petroleum/20 focus:border-petroleum transition-all outline-none text-slate-900 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-4 bg-petroleum text-white rounded-2xl font-bold text-lg shadow-xl shadow-petroleum/20 hover:bg-petroleum/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-4",
                loading && "animate-pulse"
              )}
            >
              {loading ? (isRegistering ? 'Creating Account...' : 'Signing in...') : (isRegistering ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-400 text-sm">
              Don't have an account? <span className="text-petroleum font-bold hover:underline cursor-pointer">Contact Administration</span>
            </p>
          </div>
        </div>
        
        <p className="text-center text-white/30 text-[10px] mt-8 uppercase tracking-widest font-bold">
          © 2024 Maid By Ana • All Rights Reserved
        </p>
      </div>
    </div>
  );
}
