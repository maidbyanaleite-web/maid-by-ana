import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { Client } from '../types';
import { 
  Users, 
  Search, 
  ChevronRight,
  MapPin,
  Phone,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';

export default function Clients() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = db.collection('clients').onSnapshot((snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">{t('processing')}</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-petrol">{t('clients')}</h1>
          <p className="text-slate-500">{t('allClients')}</p>
        </div>
        <Link to="/clients/new" className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          {t('registerClient')}
        </Link>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder={t('searchClients')}
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-petrol outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map(client => (
          <motion.div 
            key={client.id}
            whileHover={{ y: -5 }}
            className="card cursor-pointer group"
            onClick={() => navigate(`/clients/${client.id}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${client.type === 'airbnb' ? 'bg-gold/10 text-gold' : 'bg-petrol/10 text-petrol'}`}>
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg group-hover:text-petrol transition-colors">{client.name}</h3>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${client.type === 'airbnb' ? 'bg-gold/10 text-gold' : 'bg-petrol/10 text-petrol'}`}>
                    {t(client.type)}
                  </span>
                </div>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-petrol transition-colors" />
            </div>

            <div className="space-y-2 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0" />
                <span className="truncate">{client.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="shrink-0" />
                <span>{client.phone}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">{t('frequency')}</p>
                <p className="text-sm font-bold text-petrol capitalize">{t(client.frequency as any)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-bold">{t('teamPay')}</p>
                <p className="text-sm font-bold text-gold">${client.teamPaymentValue}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No clients found matching your search.
        </div>
      )}
    </div>
  );
}
