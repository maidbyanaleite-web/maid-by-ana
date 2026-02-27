import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { Cleaning } from '../types';
import { 
  Calendar as CalendarIcon, 
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
  Image as ImageIcon,
  ExternalLink,
  List,
  DollarSign,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { enUS, ptBR } from 'date-fns/locale';

const locales = {
  'en': enUS,
  'pt': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function StaffDashboard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [assignedCleanings, setAssignedCleanings] = useState<Cleaning[]>([]);
  const [allCleanings, setAllCleanings] = useState<Cleaning[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar' | 'payments'>('list');

  useEffect(() => {
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    const unsubscribeToday = db.collection('cleanings')
      .where('date', '==', today)
      .where('assignedStaffIds', 'array-contains', user.uid)
      .onSnapshot((snapshot) => {
        setAssignedCleanings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cleaning)));
        setLoading(false);
      });

    const unsubscribeAll = db.collection('cleanings')
      .where('assignedStaffIds', 'array-contains', user.uid)
      .onSnapshot((snapshot) => {
        setAllCleanings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cleaning)));
      });

    return () => {
      unsubscribeToday();
      unsubscribeAll();
    };
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

  const handleDeletePhoto = async (cleaningId: string, type: 'before' | 'after' | 'extra', url: string) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    
    const cleaning = assignedCleanings.find(c => c.id === cleaningId);
    if (!cleaning) return;

    let field: keyof Cleaning;
    if (type === 'before') field = 'photosBefore';
    else if (type === 'after') field = 'photosAfter';
    else field = 'extraPhotos';

    const nextPhotos = ((cleaning[field] as string[]) || []).filter(photoUrl => photoUrl !== url);

    await db.collection('cleanings').doc(cleaningId).update({
      [field]: nextPhotos
    });
  };

  const handleUpdateStaffNotes = async (cleaningId: string, notes: string) => {
    await db.collection('cleanings').doc(cleaningId).update({ staffNotes: notes });
  };

  const toggleStatus = async (cleaningId: string, currentStatus: string) => {
    const statuses: Cleaning['status'][] = ['scheduled', 'on_the_way', 'in_progress', 'completed'];
    const currentIndex = statuses.indexOf(currentStatus as any);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    const updateData: any = { status: nextStatus };
    
    if (nextStatus === 'in_progress' && !assignedCleanings.find(c => c.id === cleaningId)?.startTime) {
      updateData.startTime = format(new Date(), 'HH:mm');
    }

    if (nextStatus === 'completed') {
      updateData.endTime = format(new Date(), 'HH:mm');
    }
    
    await db.collection('cleanings').doc(cleaningId).update(updateData);
  };

  const handleUpdateArrival = async (cleaningId: string, time: string) => {
    await db.collection('cleanings').doc(cleaningId).update({ estimatedArrival: time });
  };

  const calendarEvents = allCleanings.map(c => ({
    title: c.clientName,
    start: new Date(c.date + 'T' + (c.scheduledTime || '09:00')),
    end: new Date(c.date + 'T' + (c.scheduledTime ? format(new Date(new Date().setHours(parseInt(c.scheduledTime.split(':')[0]) + 2, 0)), 'HH:mm') : '11:00')),
    allDay: false,
    resource: c
  }));

  const combinedCleanings = allCleanings.filter(c => 
    c.status === 'completed' && 
    !(c.paidStaffIds || []).includes(user?.uid || '')
  );
  const finalizedCleanings = allCleanings.filter(c => 
    c.status === 'completed' && 
    (c.paidStaffIds || []).includes(user?.uid || '')
  );
  const totalToReceive = combinedCleanings.reduce((acc, curr) => {
    const share = (curr.teamPaymentValue || 0) / (curr.assignedStaffIds?.length || 1);
    return acc + share;
  }, 0);

  if (loading) return <div className="p-8 text-center">{t('processing')}</div>;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-petrol">{t('welcome')}, {user?.name}</h1>
          <p className="text-slate-500">{t('staffDashboard')}</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${view === 'list' ? 'bg-white text-petrol shadow-sm' : 'text-slate-500'}`}
          >
            <List size={16} />
            {t('todaysServices')}
          </button>
          <button 
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${view === 'calendar' ? 'bg-white text-petrol shadow-sm' : 'text-slate-500'}`}
          >
            <CalendarIcon size={16} />
            {t('calendar')}
          </button>
          <button 
            onClick={() => setView('payments')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${view === 'payments' ? 'bg-white text-petrol shadow-sm' : 'text-slate-500'}`}
          >
            <DollarSign size={16} />
            {t('myPayments')}
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {view === 'list' ? (
            <section className="space-y-6">
              <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
                <List size={20} />
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
                    <div className="flex flex-wrap items-center gap-4 mt-1">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <MapPin size={14} />
                        {cleaning.clientAddress}
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleaning.clientAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-petrol hover:text-gold transition-colors"
                          title="Open in Google Maps"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                      {cleaning.scheduledTime && (
                        <div className="flex items-center gap-2 text-slate-500 text-sm bg-slate-100 px-2 py-1 rounded-lg">
                          <Clock size={14} className="text-petrol" />
                          <span className="font-bold">{t('scheduledTime')}: {cleaning.scheduledTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button 
                    onClick={() => toggleStatus(cleaning.id!, cleaning.status)}
                    disabled={cleaning.status === 'completed'}
                    className={`p-3 rounded-2xl transition-all flex items-center gap-2 font-bold text-sm ${
                      cleaning.status === 'completed' ? 'text-emerald-500 bg-emerald-50 cursor-default' : 
                      cleaning.status === 'in_progress' ? 'text-blue-500 bg-blue-50 hover:bg-blue-100' :
                      cleaning.status === 'on_the_way' ? 'text-gold bg-gold/10 hover:bg-gold/20' :
                      'text-slate-500 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle size={24} />
                    {cleaning.status === 'scheduled' ? t('on_the_way') : 
                     cleaning.status === 'on_the_way' ? t('in_progress') :
                     cleaning.status === 'in_progress' ? t('completed') :
                     t('completed')}
                  </button>
                  {cleaning.status === 'on_the_way' && (
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gold" />
                      <input 
                        type="time" 
                        className="text-xs border rounded p-1 outline-none focus:border-gold"
                        value={cleaning.estimatedArrival || ''}
                        onChange={(e) => handleUpdateArrival(cleaning.id!, e.target.value)}
                      />
                    </div>
                  )}
                </div>
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
                  {(cleaning.startTime || cleaning.endTime) && (
                    <div className="text-[10px] text-slate-500 font-medium">
                      {cleaning.startTime && <span>{t('startTime')}: {cleaning.startTime}</span>}
                      {cleaning.endTime && <span className="ml-2">| {t('endTime')}: {cleaning.endTime}</span>}
                    </div>
                  )}
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t('serviceType' as any)}</p>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      cleaning.clientType === 'airbnb' ? 'bg-gold/10 text-gold' : 'bg-petrol/10 text-petrol'
                    }`}>
                      {t(cleaning.serviceType as any)}
                    </span>
                  </div>
                </div>
                <div className="col-span-full space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t('extras')}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(cleaning.extras || {}).filter(([_, value]) => value).map(([key]) => (
                      <span key={key} className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded">
                        {t(key as any)}
                      </span>
                    ))}
                    {Object.values(cleaning.extras || {}).every(v => !v) && (
                      <span className="text-xs text-slate-400 italic">No extras</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Observations / Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Admin Notes */}
                {cleaning.notes && (
                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <Info size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">{t('notes')} (Admin)</p>
                      <p className="text-sm text-blue-900 leading-relaxed font-medium">{cleaning.notes}</p>
                    </div>
                  </div>
                )}

                {/* Client Feedback/Observations */}
                {cleaning.clientFeedback && (
                  <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">{t('clientFeedback')}</p>
                      <p className="text-sm text-amber-900 leading-relaxed font-medium">{cleaning.clientFeedback}</p>
                    </div>
                  </div>
                )}
              </div>

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
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setSelectedPhoto(url)}
                            className="p-1 hover:bg-white/20 rounded-full text-white"
                          >
                            <Maximize2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeletePhoto(cleaning.id!, 'before', url)}
                            className="p-1 hover:bg-red-500/20 rounded-full text-red-500"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
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
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setSelectedPhoto(url)}
                            className="p-1 hover:bg-white/20 rounded-full text-white"
                          >
                            <Maximize2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeletePhoto(cleaning.id!, 'after', url)}
                            className="p-1 hover:bg-red-500/20 rounded-full text-red-500"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
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
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setSelectedPhoto(url)}
                            className="p-1 hover:bg-white/20 rounded-full text-white"
                          >
                            <Maximize2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeletePhoto(cleaning.id!, 'extra', url)}
                            className="p-1 hover:bg-red-500/20 rounded-full text-red-500"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
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
                      <CalendarIcon size={40} className="text-slate-200" />
                    </div>
                    <p className="text-lg font-medium">{t('noAssignedCleanings')}</p>
                  </div>
                )}
              </div>
            </section>
          ) : view === 'calendar' ? (
            <section className="card h-[70vh]">
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                culture={language}
              />
            </section>
          ) : (
            <section className="space-y-8">
              {/* Combined Cleanings */}
              <div className="card space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
                    <DollarSign size={20} />
                    {t('combinedCleanings')}
                  </h2>
                  <div className="bg-petrol/10 px-4 py-2 rounded-xl">
                    <span className="text-sm text-petrol font-medium">{t('totalEstimate')}: </span>
                    <span className="text-xl font-black text-petrol">${totalToReceive.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {combinedCleanings.length > 0 ? combinedCleanings.map(cleaning => (
                    <div key={cleaning.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-petrol shadow-sm">
                          <CalendarIcon size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{cleaning.clientName}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><Clock size={12} /> {cleaning.date} {cleaning.scheduledTime}</span>
                            <span className="flex items-center gap-1"><MapPin size={12} /> {cleaning.clientAddress}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-petrol">
                          ${((cleaning.teamPaymentValue || 0) / (cleaning.assignedStaffIds?.length || 1)).toFixed(2)}
                        </p>
                        <span className="text-[10px] font-bold uppercase text-gold bg-gold/10 px-2 py-0.5 rounded-full">{t('pending')}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-slate-400 py-8">{t('noDataFound')}</p>
                  )}
                </div>
              </div>

              {/* Finalized Cleanings */}
              <div className="card space-y-6">
                <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
                  <CheckCircle size={20} />
                  {t('finalizedCleanings')}
                </h2>
                
                <div className="space-y-4">
                  {finalizedCleanings.length > 0 ? finalizedCleanings.map(cleaning => (
                    <div key={cleaning.id} className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 flex justify-between items-center">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                          <CheckCircle size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{cleaning.clientName}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><Clock size={12} /> {cleaning.date} {cleaning.scheduledTime}</span>
                            <span className="flex items-center gap-1"><MapPin size={12} /> {cleaning.clientAddress}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-600">
                          ${((cleaning.teamPaymentValue || 0) / (cleaning.assignedStaffIds?.length || 1)).toFixed(2)}
                        </p>
                        <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{t('paid')}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-slate-400 py-8">{t('noDataFound')}</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </motion.div>
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
