import React, { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';

export default function Login() {
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redireciona se já estiver logado
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        const res = await auth.createUserWithEmailAndPassword(email, password);
        if (res.user) {
          // Check if there are any users in the database
          const usersSnapshot = await db.collection('users').limit(1).get();
          const role = usersSnapshot.empty ? 'admin' : 'staff';
          
          await db.collection('users').doc(res.user.uid).set({
            name: name,
            email: email,
            role: role
          });
        }
      } else {
        await auth.signInWithEmailAndPassword(email, password);
      }
      // O useEffect acima cuidará do redirecionamento assim que o estado do user mudar
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-petrol p-4">
      <div className="absolute top-8 right-8 flex gap-2">
        <button 
          onClick={() => setLanguage('en')}
          className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${language === 'en' ? 'bg-gold text-petrol' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          English
        </button>
        <button 
          onClick={() => setLanguage('pt')}
          className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${language === 'pt' ? 'bg-gold text-petrol' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          Português
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-petrol mb-2">{t('appName')}</h1>
          <p className="text-slate-500">{isRegistering ? t('createAccount') : t('loginTitle')}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('fullName')}</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('email')}</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('password')}</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3"
          >
            {loading ? t('processing') : (
              <>
                <LogIn size={20} />
                {isRegistering ? t('register') : t('signIn')}
              </>
            )}
          </button>

          <button 
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full text-sm text-petrol hover:underline"
          >
            {isRegistering ? t('alreadyHaveAccount') : t('needAccount')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
