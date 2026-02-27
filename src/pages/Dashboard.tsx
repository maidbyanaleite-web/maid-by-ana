import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { Client, Cleaning, UserProfile, BudgetRequest } from '../types';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Plus,
  ChevronRight,
  MapPin,
  Clock,
  User,
  RefreshCw,
  MessageSquare,
  Image as ImageIcon,
  X,
  Maximize2,
  Camera,
  Info,
  Calculator,
  Check,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function Dashboard() {
  const { isAdmin, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [cleanings, setCleanings] = useState<Cleaning[]>([]);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [budgetRequests, setBudgetRequests] = useState<BudgetRequest[]>([]);
  const [allCompletedCleanings, setAllCompletedCleanings] = useState<Cleaning[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'overview' | 'payments'>('overview');
  const [selectedCleaning, setSelectedCleaning] = useState<Cleaning | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const unsubClients = db.collection('clients').onSnapshot((snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });

    const unsubCleanings = db.collection('cleanings')
      .where('date', '==', today)
      .onSnapshot((snapshot) => {
        setCleanings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cleaning)));
        setLoading(false);
      });

    if (isAdmin) {
      const unsubStaff = db.collection('users')
        .where('role', '==', 'staff')
        .onSnapshot((snapshot) => {
          setStaffList(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
        });

      const unsubBudgets = db.collection('budget_requests')
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
          const budgets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetRequest));
          setBudgetRequests(budgets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        });

      const unsubAllCompleted = db.collection('cleanings')
        .where('status', '==', 'completed')
        .onSnapshot((snapshot) => {
          setAllCompletedCleanings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cleaning)));
        });

      return () => {
        unsubClients();
        unsubCleanings();
        unsubStaff();
        unsubBudgets();
        unsubAllCompleted();
      };
    }

    return () => {
      unsubClients();
      unsubCleanings();
    };
  }, [isAdmin]);

  const handleToggleStaffPayment = async (cleaning: Cleaning, staffId: string) => {
    const currentPaidIds = cleaning.paidStaffIds || [];
    let nextPaidIds: string[];
    
    if (currentPaidIds.includes(staffId)) {
      nextPaidIds = currentPaidIds.filter(id => id !== staffId);
    } else {
      nextPaidIds = [...currentPaidIds, staffId];
    }
    
    const allPaid = (cleaning.assignedStaffIds || []).every(id => nextPaidIds.includes(id));
    
    await db.collection('cleanings').doc(cleaning.id).update({ 
      paidStaffIds: nextPaidIds,
      paymentStatus: allPaid ? 'paid' : 'pending'
    });
  };

  const handleAssignStaff = async (cleaningId: string, staffId: string, isChecked: boolean) => {
    const cleaning = cleanings.find(c => c.id === cleaningId);
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

  const handleUpdateBudgetStatus = async (budgetId: string, status: 'approved' | 'rejected') => {
    await db.collection('budget_requests').doc(budgetId).update({ status });
  };

  const totalRevenue = clients.reduce((acc, c) => acc + (c.serviceValue || 0), 0);
  const totalTeamPayment = clients.reduce((acc, c) => acc + (c.teamPaymentValue || 0), 0);
  const totalProfit = totalRevenue - totalTeamPayment;

  if (loading) return <div className="p-8 text-center">{t('processing')}</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-petrol">{t('welcome')}, {user?.name}</h1>
          <p className="text-slate-500">{t('todaySummary')}.</p>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setView('overview')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${view === 'overview' ? 'bg-white text-petrol shadow-sm' : 'text-slate-500'}`}
              >
                <TrendingUp size={16} />
                {t('dashboard')}
              </button>
              <button 
                onClick={() => setView('payments')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${view === 'payments' ? 'bg-white text-petrol shadow-sm' : 'text-slate-500'}`}
              >
                <DollarSign size={16} />
                {t('reports')}
              </button>
            </div>
          )}
          {isAdmin && (
            <Link to="/clients/new" className="btn-primary flex items-center gap-2">
              <Plus size={20} />
              {t('registerClient')}
            </Link>
          )}
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
          {view === 'overview' ? (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div whileHover={{ y: -5 }} className="card flex items-center gap-4">
                  <div className="p-3 bg-petrol/10 rounded-xl text-petrol">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('activeClients')}</p>
                    <p className="text-2xl font-bold">{clients.length}</p>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="card flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('upcomingCleanings')}</p>
                    <p className="text-2xl font-bold">{cleanings.length}</p>
                  </div>
                </motion.div>

                {isAdmin && (
                  <motion.div whileHover={{ y: -5 }} className="card flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
                      <Calculator size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{t('pendingBudgets')}</p>
                      <p className="text-2xl font-bold">{budgetRequests.length}</p>
                    </div>
                  </motion.div>
                )}

                {isAdmin && (
                  <>
                    <motion.div whileHover={{ y: -5 }} className="card flex items-center gap-4">
                      <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                        <DollarSign size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">{t('totalRevenue')}</p>
                        <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                      </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -5 }} className="card flex items-center gap-4">
                      <div className="p-3 bg-gold-light rounded-xl text-gold">
                        <TrendingUp size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">{t('totalRevenue')} (Net)</p>
                        <p className="text-2xl font-bold">${totalProfit.toLocaleString()}</p>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>

              {/* Budget Requests Section */}
              {isAdmin && budgetRequests.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
                    <Calculator size={20} />
                    {t('pendingBudgets')}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {budgetRequests.map(budget => (
                      <div key={budget.id} className="card border-purple-100 hover:border-purple-300 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-petrol">{budget.clientName}</h3>
                            <p className="text-xs text-slate-400">{new Date(budget.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-petrol">${budget.totalValue}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">{t(budget.serviceType as any)}</p>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600 mb-4">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-slate-400" />
                            <span>{budget.address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-slate-400" />
                            <span className="text-xs">
                              {Object.entries(budget.extras).filter(([_, v]) => (v as number) > 0).map(([k, v]) => `${t(k + 'Addon' as any)} (x${v})`).join(', ') || 'No extras'}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-slate-100">
                          <button 
                            onClick={() => handleUpdateBudgetStatus(budget.id!, 'approved')}
                            className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <Check size={16} />
                            {t('completed')}
                          </button>
                          <button 
                            onClick={() => handleUpdateBudgetStatus(budget.id!, 'rejected')}
                            className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                          >
                            <Trash2 size={16} />
                            {t('delete')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Today's Schedule */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
                  <Clock size={20} />
                  {t('upcomingCleanings')} - {format(new Date(), 'dd/MM/yyyy')}
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {cleanings.length > 0 ? cleanings.map(cleaning => (
                    <div key={cleaning.id} className="card hover:border-petrol transition-colors group">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex gap-4 items-center flex-1">
                          <div className={`w-2 h-12 rounded-full ${cleaning.clientType === 'airbnb' ? 'bg-gold' : 'bg-petrol'}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg">{cleaning.clientName}</h3>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                cleaning.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
                                cleaning.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                                cleaning.status === 'on_the_way' ? 'bg-gold/10 text-gold' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {t(cleaning.status)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                              <MapPin size={14} />
                              {cleaning.clientAddress}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
                          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100 min-w-[150px]">
                            <User size={18} className="text-petrol" />
                            <div className="flex flex-col w-full">
                              <span className="text-[10px] text-slate-400 uppercase font-bold leading-none mb-1">{t('staff')}</span>
                              {isAdmin ? (
                                <div className="relative group/select">
                                  <div className="text-sm font-bold text-petrol cursor-pointer truncate max-w-[120px]">
                                    {cleaning.assignedStaffNames?.join(', ') || t('selectStaff')}
                                  </div>
                                  <div className="absolute top-full left-0 mt-1 bg-white shadow-xl rounded-xl border p-2 z-20 hidden group-hover/select:block min-w-[180px]">
                                    {staffList.map(staff => (
                                      <label key={staff.uid} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer">
                                        <input 
                                          type="checkbox" 
                                          className="w-3 h-3 accent-petrol"
                                          checked={(cleaning.assignedStaffIds || []).includes(staff.uid)}
                                          onChange={e => handleAssignStaff(cleaning.id!, staff.uid, e.target.checked)}
                                        />
                                        <span className="text-xs text-slate-700">{staff.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm font-bold text-petrol truncate max-w-[120px]">
                                  {cleaning.assignedStaffNames?.join(', ') || '---'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right ml-auto md:ml-0 flex flex-col items-end gap-1">
                            <p className="text-xs text-slate-400 uppercase tracking-wider">{t('teamPay')}</p>
                            <p className="font-bold text-petrol">${cleaning.teamPaymentValue}</p>
                            <div className="flex gap-2">
                              {cleaning.staffNotes && <MessageSquare size={14} className="text-blue-500" />}
                              {(cleaning.photosBefore?.length || 0) + (cleaning.photosAfter?.length || 0) + (cleaning.extraPhotos?.length || 0) > 0 && (
                                <ImageIcon size={14} className="text-emerald-500" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setSelectedCleaning(cleaning)}
                              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-petrol"
                              title="View Details"
                            >
                              <Maximize2 size={20} />
                            </button>
                            <button 
                              onClick={() => navigate(`/clients/${cleaning.clientId}`)}
                              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                              <ChevronRight className="text-slate-300 group-hover:text-petrol transition-colors" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="card text-center py-12 text-slate-400">
                      {t('noCleaningsToday')}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="card space-y-6">
                <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
                    <DollarSign size={20} />
                    {t('combinedCleanings')}
                  </h2>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">{t('totalRevenue')}</p>
                    <p className="text-3xl font-black text-petrol">
                      ${allCompletedCleanings
                        .flatMap(cleaning => 
                          (cleaning.assignedStaffIds || []).map(staffId => ({
                            individualValue: (cleaning.teamPaymentValue || 0) / (cleaning.assignedStaffIds?.length || 1),
                            isPaid: (cleaning.paidStaffIds || []).includes(staffId)
                          }))
                        )
                        .filter(item => !item.isPaid)
                        .reduce((acc, curr) => acc + curr.individualValue, 0)
                        .toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {allCompletedCleanings
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .flatMap(cleaning => 
                      (cleaning.assignedStaffIds || []).map((staffId, index) => ({
                        ...cleaning,
                        staffId,
                        staffName: cleaning.assignedStaffNames?.[index] || '---',
                        individualValue: (cleaning.teamPaymentValue || 0) / (cleaning.assignedStaffIds?.length || 1),
                        isPaid: (cleaning.paidStaffIds || []).includes(staffId)
                      }))
                    )
                    .filter(item => !item.isPaid)
                    .map((item, idx) => (
                      <div key={`${item.id}-${item.staffId}-${idx}`} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex gap-4 items-center flex-1">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-petrol shadow-sm">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-800">{item.clientName}</h4>
                              <span className="text-[10px] bg-petrol/10 text-petrol px-2 py-0.5 rounded-full font-bold uppercase">
                                {item.staffName}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                              <span className="flex items-center gap-1"><Clock size={12} /> {item.date}</span>
                              <span className="flex items-center gap-1"><MapPin size={12} /> {item.clientAddress}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right">
                            <p className="text-lg font-black text-petrol">${item.individualValue.toFixed(2)}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">{t('teamPay')}</p>
                          </div>
                          <button 
                            onClick={() => handleToggleStaffPayment(item, item.staffId)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                              item.isPaid 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                                : 'bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20'
                            }`}
                          >
                            {item.isPaid ? t('paid') : t('pending')}
                          </button>
                        </div>
                      </div>
                    ))}
                  {allCompletedCleanings.flatMap(c => (c.assignedStaffIds || []).filter(id => !(c.paidStaffIds || []).includes(id))).length === 0 && (
                    <p className="text-center text-slate-400 py-12">{t('noDataFound')}</p>
                  )}
                </div>
              </div>

              {/* Finalized Cleanings Section */}
              <div className="card space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-slate-400 flex items-center gap-2">
                    <CheckCircle2 size={20} />
                    {t('finalizedCleanings' as any)}
                  </h2>
                </div>
                <div className="space-y-4">
                  {allCompletedCleanings
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .flatMap(cleaning => 
                      (cleaning.assignedStaffIds || []).map((staffId, index) => ({
                        ...cleaning,
                        staffId,
                        staffName: cleaning.assignedStaffNames?.[index] || '---',
                        individualValue: (cleaning.teamPaymentValue || 0) / (cleaning.assignedStaffIds?.length || 1),
                        isPaid: (cleaning.paidStaffIds || []).includes(staffId)
                      }))
                    )
                    .filter(item => item.isPaid)
                    .map((item, idx) => (
                      <div key={`final-${item.id}-${item.staffId}-${idx}`} className="p-4 bg-white rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 opacity-70">
                        <div className="flex gap-4 items-center flex-1">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-600 line-through">{item.clientName}</h4>
                              <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase">
                                {item.staffName}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                              <span className="flex items-center gap-1"><Clock size={12} /> {item.date}</span>
                              <span className="flex items-center gap-1"><MapPin size={12} /> {item.clientAddress}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-400">${item.individualValue.toFixed(2)}</p>
                          </div>
                          <div className="px-4 py-2 rounded-xl text-xs font-bold uppercase bg-emerald-50 text-emerald-500 border border-emerald-100">
                            {t('paid')}
                          </div>
                        </div>
                      </div>
                    ))}
                  {allCompletedCleanings.flatMap(c => (c.assignedStaffIds || []).filter(id => (c.paidStaffIds || []).includes(id))).length === 0 && (
                    <p className="text-center text-slate-400 py-12">{t('noDataFound')}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

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
                        <p className={`text-sm font-bold ${
                          selectedCleaning.status === 'completed' ? 'text-emerald-500' : 
                          selectedCleaning.status === 'in_progress' ? 'text-blue-500' :
                          selectedCleaning.status === 'on_the_way' ? 'text-gold' :
                          'text-slate-400'
                        }`}>
                          {t(selectedCleaning.status)}
                        </p>
                      </div>
                      {selectedCleaning.estimatedArrival && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{t('estimatedArrival')}</p>
                          <p className="text-sm font-bold text-petrol">{selectedCleaning.estimatedArrival}</p>
                        </div>
                      )}
                      {selectedCleaning.startTime && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{t('startTime')}</p>
                          <p className="text-sm font-bold text-petrol">{selectedCleaning.startTime}</p>
                        </div>
                      )}
                      {selectedCleaning.endTime && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{t('endTime')}</p>
                          <p className="text-sm font-bold text-petrol">{selectedCleaning.endTime}</p>
                        </div>
                      )}
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
                      {clients.find(c => c.id === selectedCleaning.clientId)?.numberOfStaff && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{t('numberOfStaff')}</p>
                          <p className="text-sm font-bold text-petrol">{clients.find(c => c.id === selectedCleaning.clientId)?.numberOfStaff}</p>
                        </div>
                      )}
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

                  {selectedCleaning.clientFeedback && (
                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">{t('clientFeedback')}</p>
                      <p className="text-sm text-blue-900 leading-relaxed">{selectedCleaning.clientFeedback}</p>
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
    </div>
  );
}
