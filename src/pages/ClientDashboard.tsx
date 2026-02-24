import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { Client, Cleaning } from '../types';
import { 
  Calendar, 
  DollarSign, 
  MapPin,
  Clock,
  MessageSquare,
  Image as ImageIcon,
  X,
  Camera,
  Info,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function ClientDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [cleanings, setCleanings] = useState<Cleaning[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCleaning, setSelectedCleaning] = useState<Cleaning | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!user?.clientId) {
      setLoading(false);
      return;
    }

    const unsubClient = db.collection('clients').doc(user.clientId).onSnapshot((doc) => {
      if (doc.exists) {
        setClientData({ id: doc.id, ...doc.data() } as Client);
      }
    });

    const unsubCleanings = db.collection('cleanings')
      .where('clientId', '==', user.clientId)
      .orderBy('date', 'desc')
      .onSnapshot((snapshot) => {
        setCleanings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cleaning)));
        setLoading(false);
      });

    return () => {
      unsubClient();
      unsubCleanings();
    };
  }, [user?.clientId]);

  const handleAddFeedback = async (cleaningId: string) => {
    if (!feedback.trim()) return;
    await db.collection('cleanings').doc(cleaningId).update({
      clientFeedback: feedback
    });
    setFeedback('');
    setSelectedCleaning(prev => prev ? { ...prev, clientFeedback: feedback } : null);
  };

  if (loading) return <div className="p-8 text-center">{t('processing')}</div>;
  if (!clientData) return <div className="p-8 text-center">No client data linked to this account.</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-petrol">{t('welcome')}, {user?.name}</h1>
        <p className="text-slate-500">{t('clientDashboard')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Client Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card bg-petrol text-white">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Info size={20} className="text-gold" />
              {t('myServices')}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-gold" />
                <span className="text-sm">{clientData.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-gold" />
                <span className="text-sm capitalize">{t(clientData.frequency)} - {t(clientData.serviceType as any)}</span>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-white/50 uppercase font-bold mb-1">{t('serviceValueAgreed')}</p>
                <p className="text-3xl font-bold text-gold">${clientData.serviceValue}</p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-white/50 uppercase font-bold mb-1">{t('paymentMethod')}</p>
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-gold" />
                  <span className="text-sm uppercase font-bold">{clientData.paymentMethod}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cleaning History */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
            <Calendar size={20} />
            {t('upcomingCleanings')}
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {cleanings.map(cleaning => (
              <motion.div 
                key={cleaning.id}
                whileHover={{ y: -2 }}
                className="card hover:border-petrol transition-colors cursor-pointer"
                onClick={() => setSelectedCleaning(cleaning)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cleaning.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-gold/10 text-gold'}`}>
                      {cleaning.status === 'completed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{cleaning.date}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cleaning.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-gold/10 text-gold'}`}>
                        {t(cleaning.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {cleaning.clientFeedback && <MessageSquare size={18} className="text-blue-500" />}
                    {(cleaning.photosBefore?.length || 0) + (cleaning.photosAfter?.length || 0) > 0 && (
                      <ImageIcon size={18} className="text-emerald-500" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {cleanings.length === 0 && (
              <div className="card text-center py-12 text-slate-400">
                {t('noCleanings')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cleaning Details Modal */}
      <AnimatePresence>
        {selectedCleaning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl p-8 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setSelectedCleaning(null)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-petrol">{selectedCleaning.date}</h2>
                <p className="text-slate-500">{t('serviceValueAgreed')}: <span className="font-bold text-petrol">${selectedCleaning.serviceValue}</span></p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Photos Section */}
                <div className="space-y-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Camera size={18} className="text-petrol" />
                    {t('gallery')}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t('photosBefore')}</h4>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedCleaning.photosBefore?.map((url, i) => (
                          <img 
                            key={i} src={url} alt="Before" 
                            className="w-24 h-24 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" 
                            onClick={() => setSelectedPhoto(url)}
                          />
                        ))}
                        {(!selectedCleaning.photosBefore || selectedCleaning.photosBefore.length === 0) && (
                          <div className="w-24 h-24 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[10px]">No photos</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t('photosAfter')}</h4>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedCleaning.photosAfter?.map((url, i) => (
                          <img 
                            key={i} src={url} alt="After" 
                            className="w-24 h-24 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" 
                            onClick={() => setSelectedPhoto(url)}
                          />
                        ))}
                        {(!selectedCleaning.photosAfter || selectedCleaning.photosAfter.length === 0) && (
                          <div className="w-24 h-24 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[10px]">No photos</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feedback Section */}
                <div className="space-y-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare size={18} className="text-petrol" />
                    {t('clientFeedback')}
                  </h3>

                  <div className="space-y-4">
                    {selectedCleaning.clientFeedback ? (
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <p className="text-sm text-blue-900 leading-relaxed">{selectedCleaning.clientFeedback}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea 
                          className="w-full p-4 rounded-2xl border border-slate-200 focus:border-petrol outline-none transition-all text-sm min-h-[100px]"
                          placeholder={t('addFeedback')}
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                        />
                        <button 
                          onClick={() => handleAddFeedback(selectedCleaning.id!)}
                          className="w-full btn-primary py-3"
                        >
                          {t('save')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Photo Preview Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-5xl w-full h-full flex items-center justify-center"
            >
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
              >
                <X size={24} />
              </button>
              <img 
                src={selectedPhoto} 
                alt="Preview" 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
