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
  List
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
  const [view, setView] = useState<'list' | 'calendar'>('list');

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
                          className={`p-3 rounded-2xl transition-all flex items-center gap-2 font-bold text-sm ${' '}
                            ${cleaning.status === 'completed' ? 'text-emerald-500 bg-emerald-50' : 
                            cleaning.status === 'in_progress' ? 'text-blue-500 bg-blue-50' :
                            cleaning.status === 'on_the_way' ? 'text-gold bg-gold/10' :
                            'text-slate-300 bg-slate-50 hover:bg-slate-100'}
                          `}
                        >
                          <CheckCircle size={24} />
                          {t(cleaning.status)}
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
          ) : (
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
