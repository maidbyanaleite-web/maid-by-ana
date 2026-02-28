import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { Client, UserProfile, Cleaning } from '../types';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  FileText, 
  Image as ImageIcon,
  ArrowLeft,
  Trash2,
  ExternalLink,
  Clock,
  Plus,
  User,
  MessageSquare,
  Maximize2,
  X,
  Camera,
  Info,
  RefreshCw,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateReceipt } from '../utils/pdfGenerator';
import { format } from 'date-fns';
import CleaningCard from '../components/CleaningCard';

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [clientCleanings, setClientCleanings] = useState<Cleaning[]>([]);
  const [pastCleanings, setPastCleanings] = useState<Cleaning[]>([]);
  const [futureCleanings, setFutureCleanings] = useState<Cleaning[]>([]);
  const [todaysCleanings, setTodaysCleanings] = useState<Cleaning[]>([]);
  const [selectedCleaning, setSelectedCleaning] = useState<Cleaning | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Client | null>(null);
  const [editingCleaning, setEditingCleaning] = useState<Cleaning | null>(null);
  const [isAddingCleaning, setIsAddingCleaning] = useState(false);
  const [newCleaningDate, setNewCleaningDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newCleaningTime, setNewCleaningTime] = useState('09:00');

  useEffect(() => {
    if (!id) return;
    const unsubscribe = db.collection('clients').doc(id).onSnapshot((doc) => {
      if (doc.exists) {
        setClient({ id: doc.id, ...doc.data() } as Client);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = db.collection('cleanings')
      .where('clientId', '==', id)
      .onSnapshot((snapshot) => {
        const cleanings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cleaning));
        // Sort manually to avoid composite index requirement
        cleanings.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setClientCleanings(cleanings);
      });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = db.collection('users')
      .where('role', '==', 'staff')
      .onSnapshot((snapshot) => {
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setStaffList(users);
      });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const past = clientCleanings.filter(c => c.date < today);
    const future = clientCleanings.filter(c => c.date > today);
    const todays = clientCleanings.filter(c => c.date === today);

    setPastCleanings(past);
    setFutureCleanings(future);
    setTodaysCleanings(todays);
  }, [clientCleanings]);



  const handleAssignStaffToCleaning = async (cleaningId: string, staffId: string, isChecked: boolean) => {
    const cleaning = clientCleanings.find(c => c.id === cleaningId);
    if (!cleaning) return;
    
    const currentIds = cleaning.assignedStaffIds || [];
    const currentNames = cleaning.assignedStaffNames || [];
    
    let nextIds: string[];
    let nextNames: string[];
    
    if (isChecked) {
      const staff = staffList.find(s => s.uid === staffId);
      if (!staff) return;
      nextIds = [...currentIds, staffId];
      nextNames = [...currentNames, staff.name];
    } else {
      const index = currentIds.indexOf(staffId);
      nextIds = currentIds.filter(id => id !== staffId);
      nextNames = currentNames.filter((_, i) => i !== index);
    }
    
    await db.collection('cleanings').doc(cleaningId).update({ 
      assignedStaffIds: nextIds,
      assignedStaffNames: nextNames
    });
  };

  const handleUpdateNotes = async (cleaningId: string, currentNotes: string) => {
    const newNotes = prompt(t('notes'), currentNotes || '');
    if (newNotes !== null) {
      await db.collection('cleanings').doc(cleaningId).update({ notes: newNotes });
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !id || !client) return;
    const file = e.target.files[0];
    const storageRef = storage.ref(`clients/${id}/${file.name}`);
    await storageRef.put(file);
    const url = await storageRef.getDownloadURL();
    
    await db.collection('clients').doc(id).update({
      gallery: [...(client.gallery || []), url]
    });
  };

  const handleUpdateBudget = async () => {
    if (!client || !id) return;
    const newServiceValue = prompt(t('serviceValue'), client.serviceValue.toString());
    const newTeamPay = prompt(t('teamPay'), client.teamPaymentValue.toString());
    const newNumStaff = prompt(t('numberOfStaff'), (client.numberOfStaff || 1).toString());

    if (newServiceValue !== null && newTeamPay !== null && newNumStaff !== null) {
      await db.collection('clients').doc(id).update({
        serviceValue: parseFloat(newServiceValue),
        teamPaymentValue: parseFloat(newTeamPay),
        numberOfStaff: parseInt(newNumStaff)
      });
    }
  };

  const handleUpdateStaff = async (staffId: string, isChecked: boolean) => {
    if (!id || !client) return;
    const current = client.assignedStaffIds || [];
    let next: string[];
    if (isChecked) {
      next = [...current, staffId];
    } else {
      next = current.filter(uid => uid !== staffId);
    }
    await db.collection('clients').doc(id).update({
      assignedStaffIds: next
    });
  };

  const handleUpdateServiceInfo = async () => {
    if (!client || !id) return;
    
    let newFrequency = client.frequency;
    if (client.type !== 'airbnb') {
      const freq = prompt(`${t('frequency')} (mensal, quinzenal, semanal)`, client.frequency);
      if (freq === null) return;
      newFrequency = freq as any;
    }

    const newServiceType = prompt(`${t('serviceType')} (regular, deep, move_in, move_out, airbnb_cleaning)`, client.serviceType);
    if (newServiceType === null) return;

    await db.collection('clients').doc(id).update({
      frequency: newFrequency,
      serviceType: newServiceType as any
    });
  };

  const openEditModal = () => {
    if (client) {
      const allExtras = {
        fridge: false,
        oven: false,
        pet: false,
        window: false,
        bedroom: false,
        room: false,
        bathroom: false,
      };

      const mergedExtras = {
        ...allExtras,
        ...client.extras,
      };

      setEditFormData({
        ...client,
        extras: mergedExtras,
      });

      setIsEditModalOpen(true);
    }
  };

  const handleUpdateClient = async () => {
    if (!editFormData || !id) return;
    try {
      await db.collection('clients').doc(id).update(editFormData);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating client: ", error);
    }
  };

  const handleDeleteClient = async () => {
    if (!id) return;
    if (window.confirm(t('deleteConfirm'))) {
      try {
        await db.collection('clients').doc(id).delete();
        navigate('/clients');
      } catch (error) {
        console.error("Error deleting client: ", error);
      }
    }
  };

  const handleDeleteCleaning = async (cleaningId: string) => {
    if (window.confirm(t('deleteConfirm'))) {
      try {
        await db.collection('cleanings').doc(cleaningId).delete();
      } catch (error) {
        console.error("Error deleting cleaning: ", error);
      }
    }
  };

  const handleUpdateCleaningDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCleaning || !editingCleaning.id) return;
    try {
      await db.collection('cleanings').doc(editingCleaning.id).update(editingCleaning);
      setEditingCleaning(null);
    } catch (error) {
      console.error("Error updating cleaning: ", error);
    }
  };

  const handleAddCleaning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    try {
      await db.collection('cleanings').add({
        clientId: id,
        clientName: client.name,
        clientAddress: client.address,
        clientType: client.type,
        serviceType: client.serviceType,
        extras: client.extras,
        date: newCleaningDate,
        scheduledTime: newCleaningTime,
        assignedStaffIds: client.assignedStaffIds || [],
        assignedStaffNames: [], // Will be populated by the system if needed
        serviceValue: client.serviceValue,
        teamPaymentValue: client.teamPaymentValue,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      });
      setIsAddingCleaning(false);
    } catch (error) {
      console.error("Error adding cleaning: ", error);
    }
  };

  const handleDeletePhoto = async (url: string) => {
    if (!id || !client) return;
    if (window.confirm(t('deleteConfirm'))) {
      try {
        const nextGallery = (client.gallery || []).filter(photoUrl => photoUrl !== url);
        await db.collection('clients').doc(id).update({ gallery: nextGallery });
        // Optionally delete from storage too, but for simplicity we just remove from firestore
      } catch (error) {
        console.error("Error deleting photo: ", error);
      }
    }
  };

  if (loading) return <div className="p-8 text-center">{t('processing')}</div>;
  if (!client) return <div className="p-8 text-center">Client not found.</div>;

  return (
    <div className="space-y-8">
      {/* --- DEBUG PANEL --- */}
      <div className='card bg-yellow-100 text-yellow-900 border border-yellow-300'>
        <h3 className='font-bold text-sm mb-2'>Debug Information</h3>
        <p className='text-xs'>Total cleanings found in database for this client: <strong>{clientCleanings.length}</strong></p>
        <p className='text-xs'>Cleanings filtered for Today: <strong>{todaysCleanings.length}</strong></p>
        <p className='text-xs'>Cleanings filtered for Future: <strong>{futureCleanings.length}</strong></p>
        <p className='text-xs'>Cleanings filtered for Past: <strong>{pastCleanings.length}</strong></p>
      </div>
      {/* --- END DEBUG PANEL --- */}

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-petrol transition-colors">
        <ArrowLeft size={20} />
        {t('cancel')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="card">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-petrol">{client.name}</h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${client.type === 'airbnb' ? 'bg-gold/10 text-gold' : 'bg-petrol/10 text-petrol'}`}>
                    {t(client.type)}
                  </span>
                </div>
                <p className="text-slate-500 flex items-center gap-2">
                  <MapPin size={16} />
                  {client.address}
                </p>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={openEditModal}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                    title={t('editClient')}
                  >
                    <Edit size={20} />
                  </button>
                  <button 
                    onClick={handleDeleteClient}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone size={18} className="text-petrol" />
                  {client.phone}
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Mail size={18} className="text-petrol" />
                  {client.email}
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Calendar size={18} className="text-petrol" />
                  {t('clientSince')}: {client.clientSince}
                </div>
              </div>
              <div className="space-y-4 relative">
                {isAdmin && (
                  <button 
                    onClick={handleUpdateServiceInfo}
                    className="absolute -top-2 -right-2 p-1 hover:bg-slate-100 rounded transition-colors text-slate-400"
                    title={t('editClient')}
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
                {client.type !== 'airbnb' && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <Clock size={18} className="text-petrol" />
                    {t('frequency')}: <span className="capitalize font-medium">{t(client.frequency as any)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-slate-600">
                  <FileText size={18} className="text-petrol" />
                  {t('serviceType')}: <span className="capitalize font-medium">{t(client.serviceType as any)}</span>
                </div>
                {client.type === 'airbnb' && client.propertyLink && (
                  <a href={client.propertyLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-blue-600 hover:underline">
                    <ExternalLink size={18} />
                    View Property
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Cleanings */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
                <Clock size={20} />
                {t('cleanings' as any)}
              </h2>
              {isAdmin && (
                <button 
                  onClick={() => setIsAddingCleaning(true)}
                  className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                >
                  <Plus size={16} />
                  {t('scheduleCleaning' as any) || 'Schedule Cleaning'}
                </button>
              )}
            </div>
            <div className="space-y-6">
              {/* Today's Cleanings */}
              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-3 border-b pb-2">{t('todaysCleanings' as any)}</h3>
                <div className="space-y-4">
                  {todaysCleanings.length > 0 ? todaysCleanings.map(cleaning => (
                    <CleaningCard 
                      key={cleaning.id} 
                      cleaning={cleaning} 
                      isAdmin={isAdmin || false} 
                      onEdit={setEditingCleaning}
                      onDelete={handleDeleteCleaning}
                    />
                  )) : (
                    <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                      <p>{t('noCleaningsForToday' as any)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Cleanings */}
              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-3 border-b pb-2">{t('upcomingCleanings' as any)}</h3>
                <div className="space-y-4">
                  {futureCleanings.length > 0 ? futureCleanings.map(cleaning => (
                    <CleaningCard 
                      key={cleaning.id} 
                      cleaning={cleaning} 
                      isAdmin={isAdmin || false} 
                      onEdit={setEditingCleaning}
                      onDelete={handleDeleteCleaning}
                    />
                  )) : (
                    <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                      <p>{t('noUpcomingCleanings' as any)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Past Cleanings */}
              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-3 border-b pb-2">{t('cleaningHistory' as any)}</h3>
                <div className="space-y-4">
                  {pastCleanings.length > 0 ? pastCleanings.map(cleaning => (
                    <CleaningCard 
                      key={cleaning.id} 
                      cleaning={cleaning} 
                      isAdmin={isAdmin || false} 
                      onEdit={setEditingCleaning}
                      onDelete={handleDeleteCleaning}
                    />
                  )) : (
                    <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                      <p>{t('noPastCleanings' as any)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna da direita: Finanças e Ações */}
        <div className="space-y-8">
          {/* Card com fundo escuro - Ajustado para visibilidade total */}
          <div className="card bg-petrol text-white shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <DollarSign size={20} className="text-gold" />
                {t('budget')}
              </h3>
              {isAdmin && (
                <button 
                  onClick={handleUpdateBudget}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-gold"
                >
                  <RefreshCw size={16} />
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex justify-between items-center border-b border-white/20 pb-2">
                  <span className="text-white font-medium">{t('serviceValue')}</span>
                  {/* Usei text-white puro para não sumir */}
                  <span className="text-xl font-black text-white">${client.serviceValue}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center border-b border-white/20 pb-2">
                <span className="text-white font-medium">{t('teamPay')}</span>
                {/* Gold geralmente tem bom contraste no azul escuro */}
                <span className="text-xl font-black text-gold">${client.teamPaymentValue}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-white/20 pb-2">
                <span className="text-white font-medium">{t('numberOfStaff')}</span>
                <span className="text-xl font-black text-white">{client.numberOfStaff || 1}</span>
              </div>
              
              {isAdmin && (
                <div className="flex justify-between items-center pt-2 bg-white/10 p-2 rounded-lg">
                  <span className="text-white font-bold">{t('netProfit')}</span>
                  {/* Emerald-400 as vezes some, usei um verde mais brilhante ou branco */}
                  <span className="text-2xl font-black text-green-400">
                    ${(client.serviceValue - client.teamPaymentValue).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="card space-y-4">
              <h3 className="font-bold text-petrol mb-2 flex items-center gap-2">
                <User size={18} />
                {t('assignStaff')}
              </h3>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-3 border rounded-xl bg-slate-50">
                {staffList.map(staff => (
                  <label key={staff.uid} className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-petrol"
                        checked={(client.assignedStaffIds || []).includes(staff.uid)}
                        onChange={e => handleUpdateStaff(staff.uid, e.target.checked)}
                      />
                      <span className="text-sm text-slate-700">{staff.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {client.notes && isAdmin && (
            <div className="card space-y-4">
              <h3 className="font-bold text-petrol mb-2 flex items-center gap-2">
                <MessageSquare size={18} />
                {t('notes')}
              </h3>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}

          {isAdmin && (
            <div className="card space-y-4">
              <h3 className="font-bold text-petrol mb-2 flex items-center gap-2">
                <ImageIcon size={18} />
                {t('gallery')}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {client.gallery?.map((url, i) => (
                  <div key={i} className="relative group">
                    <img 
                      src={url} 
                      alt="Gallery" 
                      className="w-full h-24 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedPhoto(url)}
                    />
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeletePhoto(url)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <label className="w-full h-24 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors">
                  <Plus size={24} />
                  <span className="text-[10px] font-bold uppercase">{t('uploadPhoto')}</span>
                  <input type="file" className="hidden" onChange={handleUploadImage} accept="image/*" />
                </label>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="card space-y-4">
              <h3 className="font-bold text-petrol mb-2">{t('actions')}</h3>
              
              <button 
                onClick={() => setIsAddingCleaning(true)}
                className="w-full btn-secondary flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                {t('scheduleCleaning' as any)}
              </button>
            </div>
          )}


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
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-petrol">{selectedCleaning.clientName}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedCleaning.clientType === 'airbnb' ? 'bg-gold/10 text-gold' : 'bg-petrol/10 text-petrol'}`}>
                    {t(selectedCleaning.clientType)}
                  </span>
                </div>
                <p className="text-slate-500 flex items-center gap-2">
                  <MapPin size={16} />
                  {selectedCleaning.clientAddress}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Info Section */}
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Info size={18} className="text-petrol" />
                      Service Info
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{t('status')}</p>
                        <p className={`text-sm font-bold ${selectedCleaning.status === 'completed' ? 'text-emerald-500' : 'text-gold'}`}>
                          {t(selectedCleaning.status)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{t('staff')}</p>
                        <p className="text-sm font-bold text-petrol">{selectedCleaning.assignedStaffNames?.join(', ') || '---'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{t('teamPay')}</p>
                        <p className="text-sm font-bold text-petrol">${selectedCleaning.teamPaymentValue}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Service Date</p>
                        <p className="text-sm font-bold text-petrol">{selectedCleaning.date}</p>
                      </div>
                    </div>
                  </div>

                  {selectedCleaning.notes && (
                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">{t('notes')} (Admin)</p>
                      <p className="text-sm text-blue-900 leading-relaxed">{selectedCleaning.notes}</p>
                    </div>
                  )}

                  {selectedCleaning.staffNotes && (
                    <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">{t('staffNotes')}</p>
                      <p className="text-sm text-emerald-900 leading-relaxed">{selectedCleaning.staffNotes}</p>
                    </div>
                  )}
                </div>

                {/* Photos Section */}
                <div className="space-y-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Camera size={18} className="text-petrol" />
                    Cleaning Gallery
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Before */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t('photosBefore')}</h4>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedCleaning.photosBefore?.map((url, i) => (
                          <img 
                            key={i} src={url} alt="Before" 
                            className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" 
                            onClick={() => setSelectedPhoto(url)}
                          />
                        ))}
                        {(!selectedCleaning.photosBefore || selectedCleaning.photosBefore.length === 0) && (
                          <div className="w-20 h-20 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[10px]">No photos</div>
                        )}
                      </div>
                    </div>

                    {/* After */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t('photosAfter')}</h4>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedCleaning.photosAfter?.map((url, i) => (
                          <img 
                            key={i} src={url} alt="After" 
                            className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" 
                            onClick={() => setSelectedPhoto(url)}
                          />
                        ))}
                        {(!selectedCleaning.photosAfter || selectedCleaning.photosAfter.length === 0) && (
                          <div className="w-20 h-20 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[10px]">No photos</div>
                        )}
                      </div>
                    </div>

                    {/* Extra */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t('extraPhotos')}</h4>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedCleaning.extraPhotos?.map((url, i) => (
                          <img 
                            key={i} src={url} alt="Extra" 
                            className="w-20 h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" 
                            onClick={() => setSelectedPhoto(url)}
                          />
                        ))}
                        {(!selectedCleaning.extraPhotos || selectedCleaning.extraPhotos.length === 0) && (
                          <div className="w-20 h-20 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[10px]">No photos</div>
                        )}
                      </div>
                    </div>
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

      {/* Edit Client Modal */}
      <AnimatePresence>
        {isEditModalOpen && editFormData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl p-8 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
              
              <h2 className="text-2xl font-bold text-petrol mb-6">{t('editClient')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('clientName' as any)}</label>
                  <input 
                    type="text"
                    className="input"
                    value={editFormData.name}
                    onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                  />
                </div>
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('email')}</label>
                  <input 
                    type="email"
                    className="input"
                    value={editFormData.email}
                    onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                  />
                </div>
                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('phone')}</label>
                  <input 
                    type="tel"
                    className="input"
                    value={editFormData.phone}
                    onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                  />
                </div>
                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('address')}</label>
                  <input 
                    type="text"
                    className="input"
                    value={editFormData.address}
                    onChange={e => setEditFormData({...editFormData, address: e.target.value})}
                  />
                </div>
                {/* Service Value */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('serviceValue')}</label>
                  <input 
                    type="number"
                    className="input"
                    value={editFormData.serviceValue}
                    onChange={e => setEditFormData({...editFormData, serviceValue: parseFloat(e.target.value) || 0})}
                  />
                </div>
                {/* Team Pay */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('teamPay')}</label>
                  <input 
                    type="number"
                    className="input"
                    value={editFormData.teamPaymentValue}
                    onChange={e => setEditFormData({...editFormData, teamPaymentValue: parseFloat(e.target.value) || 0})}
                  />
                </div>
                {/* Number of Staff */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('numberOfStaff')}</label>
                  <input 
                    type="number"
                    min="1"
                    className="input"
                    value={editFormData.numberOfStaff || 1}
                    onChange={e => setEditFormData({...editFormData, numberOfStaff: parseInt(e.target.value) || 1})}
                  />
                </div>
                {/* Frequency */}
                {editFormData.type !== 'airbnb' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">{t('frequency')}</label>
                    <select 
                      className="input"
                      value={editFormData.frequency}
                      onChange={e => setEditFormData({...editFormData, frequency: e.target.value as any})}
                    >
                      <option value="mensal">{t('monthly')}</option>
                      <option value="quinzenal">{t('biweekly')}</option>
                      <option value="semanal">{t('weekly')}</option>
                    </select>
                  </div>
                )}
                {/* Service Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('serviceType')}</label>
                  <select 
                    className="input"
                    value={editFormData.serviceType}
                    onChange={e => setEditFormData({...editFormData, serviceType: e.target.value as any})}
                  >
                    <option value="regular">{t('regular')}</option>
                    <option value="deep">{t('deepCleaning')}</option>
                    <option value="move_in">Move In</option>
                    <option value="move_out">{t('moveOut')}</option>
                    <option value="airbnb_cleaning">Airbnb Cleaning</option>
                  </select>
                </div>
                {/* Extras */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-2">{t('extras')}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 border rounded-2xl bg-slate-50/50">
                    {editFormData.extras && Object.keys(editFormData.extras).map(key => (
                      <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 accent-petrol rounded"
                          checked={editFormData.extras[key as keyof typeof editFormData.extras] || false}
                          onChange={e => {
                            const newExtras = { ...editFormData.extras, [key]: e.target.checked };
                            setEditFormData({ ...editFormData, extras: newExtras });
                          }}
                        />
                        {t(key + 'Addon' as any)}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-1">{t('notes')}</label>
                  <textarea
                    className="input"
                    rows={4}
                    value={editFormData.notes || ''}
                    onChange={e => setEditFormData({...editFormData, notes: e.target.value})}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <button onClick={() => setIsEditModalOpen(false)} className="btn-secondary">{t('cancel')}</button>
                <button onClick={handleUpdateClient} className="btn-primary">{t('save')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Cleaning Modal */}
      <AnimatePresence>
        {editingCleaning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl relative"
            >
              <button 
                onClick={() => setEditingCleaning(null)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>

              <h2 className="text-2xl font-bold text-petrol mb-6">{t('editCleaning')}</h2>

              <form onSubmit={handleUpdateCleaningDetails} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('date')}</label>
                  <input 
                    type="date"
                    className="input"
                    value={editingCleaning.date}
                    onChange={e => setEditingCleaning({...editingCleaning, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('scheduledTime')}</label>
                  <input 
                    type="time"
                    className="input"
                    value={editingCleaning.scheduledTime}
                    onChange={e => setEditingCleaning({...editingCleaning, scheduledTime: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('teamPay')}</label>
                  <input 
                    type="number"
                    className="input"
                    value={editingCleaning.teamPaymentValue}
                    onChange={e => setEditingCleaning({...editingCleaning, teamPaymentValue: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">{t('staff')}</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 bg-slate-50 rounded-lg">
                    {staffList.map(staff => (
                      <label key={staff.uid} className="flex items-center gap-2 text-sm">
                        <input 
                          type="checkbox"
                          checked={(editingCleaning.assignedStaffIds || []).includes(staff.uid)}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const currentIds = editingCleaning.assignedStaffIds || [];
                            const currentNames = editingCleaning.assignedStaffNames || [];
                            let nextIds: string[];
                            let nextNames: string[];
                            if (isChecked) {
                              nextIds = [...currentIds, staff.uid];
                              nextNames = [...currentNames, staff.name];
                            } else {
                              const index = currentIds.indexOf(staff.uid);
                              nextIds = currentIds.filter(id => id !== staff.uid);
                              nextNames = currentNames.filter((_, i) => i !== index);
                            }
                            setEditingCleaning({ 
                              ...editingCleaning, 
                              assignedStaffIds: nextIds,
                              assignedStaffNames: nextNames
                            });
                          }}
                        />
                        {staff.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full btn-primary py-3">{t('save')}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Cleaning Modal */}
      <AnimatePresence>
        {isAddingCleaning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAddingCleaning(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>

              <h2 className="text-2xl font-bold text-petrol mb-6">{t('scheduleCleaning' as any) || 'Schedule Cleaning'}</h2>

              <form onSubmit={handleAddCleaning} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('date')}</label>
                  <input 
                    type="date"
                    required
                    className="input"
                    value={newCleaningDate}
                    onChange={(e) => setNewCleaningDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('time')}</label>
                  <input 
                    type="time"
                    required
                    className="input"
                    value={newCleaningTime}
                    onChange={(e) => setNewCleaningTime(e.target.value)}
                  />
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full btn-primary py-3">
                    {t('save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
