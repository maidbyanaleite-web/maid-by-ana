import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink,
  Star,
  Home,
  Building2,
  X
} from 'lucide-react';
import { Client, ClientType } from '../types';
import { cn } from '../lib/utils';
import { firebaseService } from '../services/firebaseService';
import { useLanguage } from '../contexts/LanguageContext';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ClientType | 'All'>('All');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const data = await firebaseService.getClients();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesFilter = filter === 'All' || c.type === filter;
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                         (c.property_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('client_database')}</h2>
          <p className="text-slate-500">{t('manage_clients')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          {t('add_new_client')}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder={t('search_clients')} 
            className="input-field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['All', 'Regular', 'Airbnb'] as const).map((tKey) => (
            <button
              key={tKey}
              onClick={() => setFilter(tKey)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                filter === tKey 
                  ? "bg-petroleum text-white shadow-md shadow-petroleum/10" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              {t(tKey.toLowerCase())}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-500">{t('loading')}</div>
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
            {t('no_data')}
          </div>
        )}
      </div>

      {isModalOpen && (
        <ClientModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            fetchClients();
          }} 
        />
      )}
    </div>
  );
}

const ClientCard: React.FC<{ client: Client }> = ({ client }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          client.type === 'Airbnb' ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-500"
        )}>
          {client.type === 'Airbnb' ? <Building2 className="w-6 h-6" /> : <Home className="w-6 h-6" />}
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h4 className="text-lg font-bold text-slate-900">{client.name}</h4>
          <span className={cn(
            "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full",
            client.type === 'Airbnb' ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
          )}>
            {t(client.type.toLowerCase())}
          </span>
        </div>
        {client.type === 'Airbnb' && (
          <p className="text-sm text-slate-500 font-medium">{client.property_name}</p>
        )}
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">{client.address || t('no_data')}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Phone className="w-4 h-4 text-slate-400 shrink-0" />
          <span>{client.phone || t('no_data')}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">{client.email || t('no_data')}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          {t('since') || 'Client since'}: <span className="font-medium text-slate-600">{client.since || 'N/A'}</span>
        </div>
        {client.property_link && (
          <a 
            href={client.property_link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-rose-500 hover:text-rose-600 flex items-center gap-1 text-xs font-bold"
          >
            Listing <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function ClientModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [type, setType] = useState<ClientType>('Regular');
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    owner_name: '',
    property_name: '',
    since: '',
    address: '',
    email: '',
    phone: '',
    frequency: 'Bi-weekly',
    property_link: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await firebaseService.addClient({ ...formData, type });
      onSuccess();
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">{t('add_new_client')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            {(['Regular', 'Airbnb'] as const).map((tKey) => (
              <button
                key={tKey}
                type="button"
                onClick={() => setType(tKey)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                  type === tKey ? "bg-white text-petroleum shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t(tKey.toLowerCase())} {t('clients')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('name')}</label>
              <input 
                required
                className="input-field" 
                placeholder={t('name')}
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            {type === 'Airbnb' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Property Name</label>
                <input 
                  className="input-field" 
                  placeholder="e.g. Sunny Loft Downtown"
                  value={formData.property_name}
                  onChange={(e) => setFormData({...formData, property_name: e.target.value})}
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('email')}</label>
              <input 
                type="email"
                className="input-field" 
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('phone')}</label>
              <input 
                className="input-field" 
                placeholder="(000) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div className="col-span-full space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('address')}</label>
              <input 
                className="input-field" 
                placeholder={t('address')}
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('since') || 'Client Since'}</label>
              <input 
                type="date"
                className="input-field"
                value={formData.since}
                onChange={(e) => setFormData({...formData, since: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frequency</label>
              <select 
                className="input-field"
                value={formData.frequency}
                onChange={(e) => setFormData({...formData, frequency: e.target.value})}
              >
                <option value="Weekly">{t('week')}</option>
                <option value="Bi-weekly">Bi-weekly</option>
                <option value="Monthly">{t('month')}</option>
              </select>
            </div>
            {type === 'Airbnb' && (
              <div className="col-span-full space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Airbnb Listing Link</label>
                <input 
                  className="input-field" 
                  placeholder="https://airbnb.com/rooms/..."
                  value={formData.property_link}
                  onChange={(e) => setFormData({...formData, property_link: e.target.value})}
                />
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
            >
              {t('cancel')}
            </button>
            <button 
              type="submit"
              className="flex-1 btn-primary justify-center"
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

