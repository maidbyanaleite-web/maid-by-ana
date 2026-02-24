import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { Cleaning } from '../types';
import { 
  Calendar, 
  MapPin,
  Clock,
  ChevronRight,
  Info,
  Camera,
  CheckCircle,
  Plus,
  X,
  Maximize2,
  MessageSquare,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [assignedCleanings, setAssignedCleanings] = useState<Cleaning[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    const unsubscribe = db.collection('cleanings')
      .where('date', '==', today)
      .where('assignedStaffId', '==', user.uid)
      .onSnapshot((snapshot) => {
        setAssignedCleanings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cleaning)));
        setLoading(false);
      });

    return () => unsubscribe();
  }, [user]);

  const handleUploadPhoto = async (cleaningId: string, type: 'before' | 'after' | 'extra', e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const storageRef = storage.ref(`cleanings/${cleaningId}/${type}/${file.name}`);
    await storageRef.put(file);
    const url = await storageRef.getDownloadURL();
    
    const cleaning = assignedCleanings.find(c => c.id === cleaningId);
    if (!cleaning) return;

    let field: keyof Cleaning;
    if (type === 'before') field = 'photosBefore';
    else if (type === 'after') field = 'photosAfter';
    else field = 'extraPhotos';

    await db.collection('cleanings').doc(cleaningId).update({
      [field]: [...((cleaning[field] as string[]) || []), url]
    });
  };

  const handleUpdateStaffNotes = async (cleaningId: string, notes: string) => {
    await db.collection('cleanings').doc(cleaningId).update({ staffNotes: notes });
  };

  const toggleStatus = async (cleaningId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'scheduled' ? 'completed' : 'scheduled';
    await db.collection('cleanings').doc(cleaningId).update({ status: newStatus });
  };

  if (loading) return <div className="p-8 text-center">{t('processing')}</div>;

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-3xl font-bold text-petrol">{t('welcome')}, {user?.name}</h1>
        <p className="text-slate-500">{t('staffDashboard')}</p>
      </header>

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
          <Calendar size={20} />
          {t('myCleanings')} - {format(new Date(), 'dd/MM/yyyy')}
        </h2>

        <div className="grid grid-cols-1 gap-8">
          {assignedCleanings.length > 0 ? assignedCleanings.map(cleaning => (
            <motion.div 
              key={cleaning.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card space-y-6 overflow-hidden border-l-4 border-l-petrol"
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-4 items-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cleaning.clientType === 'airbnb' ? 'bg-gold/10 text-gold' : 'bg-petrol/10 text-petrol'}`}>
                    <ImageIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-slate-800">{cleaning.clientName}</h3>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <MapPin size={14} />
                      {cleaning.clientAddress}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => toggleStatus(cleaning.id!, cleaning.status)}
                  className={`p-3 rounded-2xl transition-all ${cleaning.status === 'completed' ? 'text-emerald-500 bg-emerald-50 scale-110' : 'text-slate-300 bg-slate-50 hover:bg-slate-100'}`}
                >
                  <CheckCircle size={32} />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-slate-50">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t('teamPay')}</p>
                  <p className="text-xl font-bold text-petrol">${cleaning.teamPaymentValue}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t('status')}</p>
                  <p className={`text-sm font-bold flex items-center gap-1 ${cleaning.status === 'completed' ? 'text-emerald-500' : 'text-gold'}`}>
                    <span className={`w-2 h-2 rounded-full ${cleaning.status === 'completed' ? 'bg-emerald-500' : 'bg-gold animate-pulse'}`} />
                    {t(cleaning.status)}
                  </p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t('clientType')}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${cleaning.clientType === 'airbnb' ? 'bg-gold/10 text-gold' : 'bg-petrol/10 text-petrol'}`}>
                    {t(cleaning.clientType)}
                  </span>
                </div>
              </div>

              {/* Admin Notes */}
              {cleaning.notes && (
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <Info size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">{t('notes')}</p>
                    <p className="text-sm text-blue-900 leading-relaxed font-medium">{cleaning.notes}</p>
                  </div>
                </div>
              )}

              {/* Staff Notes Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare size={14} />
                  {t('staffNotes')}
                </label>
                <textarea 
                  className="input min-h-[100px] resize-none text-sm"
                  placeholder={t('notes') + '...'}
                  value={cleaning.staffNotes || ''}
                  onChange={(e) => handleUpdateStaffNotes(cleaning.id!, e.target.value)}
                />
              </div>

              {/* Photo Sections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Photos Before */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Camera size={16} className="text-petrol" />
                      {t('photosBefore')}
                    </h4>
                    <label className="w-8 h-8 rounded-full bg-petrol/5 flex items-center justify-center text-petrol hover:bg-petrol/10 cursor-pointer transition-colors">
                      <Plus size={18} />
                      <input type="file" className="hidden" onChange={(e) => handleUploadPhoto(cleaning.id!, 'before', e)} />
                    </label>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {cleaning.photosBefore?.map((url, i) => (
                      <div key={i} className="relative group shrink-0">
                        <img src={url} alt="Before" className="w-24 h-24 object-cover rounded-2xl border border-slate-100 shadow-sm" />
                        <button 
                          onClick={() => setSelectedPhoto(url)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center text-white"
                        >
                          <Maximize2 size={20} />
                        </button>
                      </div>
                    ))}
                    {(!cleaning.photosBefore || cleaning.photosBefore.length === 0) && (
                      <div className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                        <Camera size={24} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Photos After */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Camera size={16} className="text-emerald-500" />
                      {t('photosAfter')}
                    </h4>
                    <label className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 cursor-pointer transition-colors">
                      <Plus size={18} />
                      <input type="file" className="hidden" onChange={(e) => handleUploadPhoto(cleaning.id!, 'after', e)} />
                    </label>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {cleaning.photosAfter?.map((url, i) => (
                      <div key={i} className="relative group shrink-0">
                        <img src={url} alt="After" className="w-24 h-24 object-cover rounded-2xl border border-slate-100 shadow-sm" />
                        <button 
                          onClick={() => setSelectedPhoto(url)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center text-white"
                        >
                          <Maximize2 size={20} />
                        </button>
                      </div>
                    ))}
                    {(!cleaning.photosAfter || cleaning.photosAfter.length === 0) && (
                      <div className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                        <Camera size={24} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Extra Photos */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <ImageIcon size={16} className="text-gold" />
                      {t('extraPhotos')}
                    </h4>
                    <label className="w-8 h-8 rounded-full bg-gold/5 flex items-center justify-center text-gold hover:bg-gold/10 cursor-pointer transition-colors">
                      <Plus size={18} />
                      <input type="file" className="hidden" onChange={(e) => handleUploadPhoto(cleaning.id!, 'extra', e)} />
                    </label>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {cleaning.extraPhotos?.map((url, i) => (
                      <div key={i} className="relative group shrink-0">
                        <img src={url} alt="Extra" className="w-24 h-24 object-cover rounded-2xl border border-slate-100 shadow-sm" />
                        <button 
                          onClick={() => setSelectedPhoto(url)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center text-white"
                        >
                          <Maximize2 size={20} />
                        </button>
                      </div>
                    ))}
                    {(!cleaning.extraPhotos || cleaning.extraPhotos.length === 0) && (
                      <div className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="card text-center py-20 text-slate-400">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar size={40} className="text-slate-200" />
              </div>
              <p className="text-lg font-medium">{t('noAssignedCleanings')}</p>
            </div>
          )}
        </div>
      </section>

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
