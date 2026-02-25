import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebase';
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
  CheckCircle2,
  Plus,
  Maximize2,
  Users
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
  const [generalNotes, setGeneralNotes] = useState('');
  const [isEditingGeneralNotes, setIsEditingGeneralNotes] = useState(false);

  useEffect(() => {
    if (clientData?.generalNotes) {
      setGeneralNotes(clientData.generalNotes);
    }
  }, [clientData]);

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
      .onSnapshot((snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cleaning));
        // Sort by date descending in memory to avoid index issues
        docs.sort((a, b) => b.date.localeCompare(a.date));
        setCleanings(docs);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching cleanings:", error);
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

  const handleUploadPhoto = async (cleaningId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const storageRef = storage.ref(`cleanings/${cleaningId}/client/${file.name}`);
    await storageRef.put(file);
    const url = await storageRef.getDownloadURL();
    
    const cleaning = cleanings.find(c => c.id === cleaningId);
    if (!cleaning) return;

    const nextPhotos = [...(cleaning.photosByClient || []), url];
    await db.collection('cleanings').doc(cleaningId).update({
      photosByClient: nextPhotos
    });
    
    if (selectedCleaning?.id === cleaningId) {
      setSelectedCleaning({ ...selectedCleaning, photosByClient: nextPhotos });
    }
  };

  const handleUpdateGeneralNotes = async () => {
    if (!user?.clientId) return;
    await db.collection('clients').doc(user.clientId).update({
      generalNotes: generalNotes
    });
    setIsEditingGeneralNotes(false);
  };

  const nextCleaning = cleanings.find(c => c.date === format(new Date(), 'yyyy-MM-dd'));

  if (loading) return <div className="p-8 text-center">{t('processing')}</div>;
  if (!clientData) return (
    <div className="p-8 text-center space-y-4">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
        <Info size={40} className="text-slate-300" />
      </div>
      <p className="text-slate-500">{t('noClientData')}</p>
      {user?.role === 'admin' && (
        <p className="text-xs text-gold font-bold">Admin: Link this user to a client in "Manage Staff".</p>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-petrol">{t('welcome')}, {user?.name}</h1>
          <p className="text-slate-500">{t('clientDashboard')}</p>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold leading-none mb-1">{t('numberOfStaff')}</p>
            <p className="text-sm font-bold text-petrol">{clientData.numberOfStaff || 1}</p>
          </div>
        </div>
      </header>

      {/* Real-time Status Card */}
      {nextCleaning && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card bg-white border-2 border-gold/20 overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-4">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-gold"></span>
            </span>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-petrol">{t('cleaningToday')}</h2>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                  nextCleaning.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
                  nextCleaning.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                  'bg-gold/10 text-gold'
                }`}>
                  {t(nextCleaning.status)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {nextCleaning.status === 'on_the_way' && nextCleaning.estimatedArrival && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{t('estimatedArrival')}</p>
                    <div className="flex items-center gap-2 text-gold font-bold">
                      <Clock size={16} />
                      <span className="text-lg">{nextCleaning.estimatedArrival}</span>
                    </div>
                  </div>
                )}
                {nextCleaning.startTime && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{t('startTime')}</p>
                    <div className="flex items-center gap-2 text-blue-600 font-bold">
                      <Clock size={16} />
                      <span className="text-lg">{nextCleaning.startTime}</span>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{t('scheduledTime')}</p>
                  <div className="flex items-center gap-2 text-petrol font-bold">
                    <Clock size={16} />
                    <span className="text-lg">{nextCleaning.scheduledTime || '09:00'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{t('staff')}</p>
                  <div className="flex items-center gap-2 text-petrol font-bold">
                    <Users size={16} />
                    <span className="text-lg">{clientData.numberOfStaff || 1}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedCleaning(nextCleaning)}
              className="btn-primary px-8 py-4 flex items-center gap-2"
            >
              <Maximize2 size={20} />
              {t('viewDetails')}
            </button>
          </div>
        </motion.div>
      )}

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
                <p className="text-xs text-white/50 uppercase font-bold mb-1">{t('numberOfStaff')}</p>
                <p className="text-xl font-bold text-gold">{clientData.numberOfStaff || 1}</p>
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

          {/* General Requests Card */}
          <div className="card bg-white border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
                <MessageSquare size={20} className="text-gold" />
                {t('generalNotes')}
              </h2>
              {!isEditingGeneralNotes && (
                <button 
                  onClick={() => setIsEditingGeneralNotes(true)}
                  className="text-xs font-bold text-petrol hover:text-gold transition-colors"
                >
                  {t('editClient')}
                </button>
              )}
            </div>
            
            {isEditingGeneralNotes ? (
              <div className="space-y-3">
                <textarea 
                  className="w-full p-4 rounded-2xl border border-slate-200 focus:border-petrol outline-none transition-all text-sm min-h-[120px]"
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder={t('generalNotes') + '...'}
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleUpdateGeneralNotes}
                    className="flex-1 btn-primary py-2 text-sm"
                  >
                    {t('save')}
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditingGeneralNotes(false);
                      setGeneralNotes(clientData?.generalNotes || '');
                    }}
                    className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-2 text-sm font-bold hover:bg-slate-200 transition-all"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[100px]">
                {clientData.generalNotes ? (
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{clientData.generalNotes}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">{t('addFeedback')}...</p>
                )}
              </div>
            )}
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
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      cleaning.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
                      cleaning.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                      cleaning.status === 'on_the_way' ? 'bg-gold/10 text-gold' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {cleaning.status === 'completed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{cleaning.date}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          cleaning.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
                          cleaning.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                          cleaning.status === 'on_the_way' ? 'bg-gold/10 text-gold' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {t(cleaning.status)}
                        </span>
                        {cleaning.scheduledTime && (
                          <span className="text-[10px] font-bold text-petrol flex items-center gap-1">
                            <Clock size={10} />
                            {t('scheduledTime')}: {cleaning.scheduledTime}
                          </span>
                        )}
                        {cleaning.status === 'on_the_way' && cleaning.estimatedArrival && (
                          <span className="text-[10px] font-bold text-gold flex items-center gap-1">
                            <Clock size={10} />
                            {t('estimatedArrival')}: {cleaning.estimatedArrival}
                          </span>
                        )}
                        {cleaning.status === 'in_progress' && cleaning.startTime && (
                          <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                            <Clock size={10} />
                            {t('startTime')}: {cleaning.startTime}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 flex flex-col items-end gap-1 ml-auto">
                          <div className="flex items-center gap-1">
                            <Users size={10} />
                            {cleaning.assignedStaffIds?.length || clientData.numberOfStaff || 1} {t('staff')}
                          </div>
                          {cleaning.assignedStaffNames && cleaning.assignedStaffNames.length > 0 && (
                            <div className="text-[8px] opacity-70">
                              {cleaning.assignedStaffNames.join(', ')}
                            </div>
                          )}
                        </span>
                      </div>
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

              <div className="mb-8 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-petrol">{selectedCleaning.date}</h2>
                  <p className="text-slate-500">{t('serviceValueAgreed')}: <span className="font-bold text-petrol">${selectedCleaning.serviceValue}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-bold">{t('numberOfStaff')}</p>
                  <p className="text-lg font-bold text-petrol">{selectedCleaning.assignedStaffIds?.length || clientData.numberOfStaff || 1}</p>
                  {selectedCleaning.assignedStaffNames && selectedCleaning.assignedStaffNames.length > 0 && (
                    <p className="text-xs text-slate-500">{selectedCleaning.assignedStaffNames.join(', ')}</p>
                  )}
                </div>
              </div>

              {selectedCleaning.status !== 'completed' && (
                <div className="mb-8 grid grid-cols-2 gap-4">
                  {selectedCleaning.estimatedArrival && (
                    <div className="bg-gold/5 p-4 rounded-2xl border border-gold/10">
                      <p className="text-[10px] text-gold uppercase font-bold mb-1">{t('estimatedArrival')}</p>
                      <p className="text-xl font-bold text-petrol">{selectedCleaning.estimatedArrival}</p>
                    </div>
                  )}
                  {selectedCleaning.startTime && (
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                      <p className="text-[10px] text-blue-600 uppercase font-bold mb-1">{t('startTime')}</p>
                      <p className="text-xl font-bold text-petrol">{selectedCleaning.startTime}</p>
                    </div>
                  )}
                </div>
              )}

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

                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t('extraPhotos')}</h4>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedCleaning.extraPhotos?.map((url, i) => (
                          <img 
                            key={i} src={url} alt="Extra" 
                            className="w-24 h-24 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" 
                            onClick={() => setSelectedPhoto(url)}
                          />
                        ))}
                        {(!selectedCleaning.extraPhotos || selectedCleaning.extraPhotos.length === 0) && (
                          <div className="w-24 h-24 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[10px]">No photos</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase">{t('photosByClient')}</h4>
                        <label className="w-6 h-6 rounded-full bg-petrol/5 flex items-center justify-center text-petrol hover:bg-petrol/10 cursor-pointer transition-colors">
                          <Plus size={14} />
                          <input type="file" className="hidden" onChange={(e) => handleUploadPhoto(selectedCleaning.id!, e)} />
                        </label>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedCleaning.photosByClient?.map((url, i) => (
                          <img 
                            key={i} src={url} alt="Client" 
                            className="w-24 h-24 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" 
                            onClick={() => setSelectedPhoto(url)}
                          />
                        ))}
                        {(!selectedCleaning.photosByClient || selectedCleaning.photosByClient.length === 0) && (
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
