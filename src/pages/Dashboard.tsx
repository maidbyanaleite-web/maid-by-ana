import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { Client } from '../types';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Plus,
  ChevronRight,
  MapPin,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function Dashboard() {
  const { isAdmin, user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = db.collection('clients').onSnapshot((snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(clientsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalRevenue = clients.reduce((acc, c) => acc + (c.serviceValue || 0), 0);
  const totalTeamPayment = clients.reduce((acc, c) => acc + (c.teamPaymentValue || 0), 0);
  const totalProfit = totalRevenue - totalTeamPayment;

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayCleanings = clients.filter(c => c.cleaningDates?.includes(today));

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-petrol">Welcome, {user?.name}</h1>
          <p className="text-slate-500">Here's what's happening today.</p>
        </div>
        {isAdmin && (
          <Link to="/clients/new" className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            New Client
          </Link>
        )}
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -5 }} className="card flex items-center gap-4">
          <div className="p-3 bg-petrol/10 rounded-xl text-petrol">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Clients</p>
            <p className="text-2xl font-bold">{clients.length}</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="card flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Today's Cleanings</p>
            <p className="text-2xl font-bold">{todayCleanings.length}</p>
          </div>
        </motion.div>

        {isAdmin && (
          <>
            <motion.div whileHover={{ y: -5 }} className="card flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Monthly Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="card flex items-center gap-4">
              <div className="p-3 bg-gold-light rounded-xl text-gold">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Net Profit</p>
                <p className="text-2xl font-bold">${totalProfit.toLocaleString()}</p>
              </div>
            </motion.div>
          </>
        )}
        
        {!isAdmin && (
           <motion.div whileHover={{ y: -5 }} className="card flex items-center gap-4">
           <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
             <DollarSign size={24} />
           </div>
           <div>
             <p className="text-sm text-slate-500">Team Payment (Today)</p>
             <p className="text-2xl font-bold">${todayCleanings.reduce((acc, c) => acc + (c.teamPaymentValue || 0), 0)}</p>
           </div>
         </motion.div>
        )}
      </div>

      {/* Today's Schedule */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-petrol flex items-center gap-2">
          <Clock size={20} />
          Today's Schedule
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {todayCleanings.length > 0 ? todayCleanings.map(client => (
            <Link key={client.id} to={`/clients/${client.id}`} className="card hover:border-petrol transition-colors group">
              <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div className={`w-2 h-12 rounded-full ${client.type === 'airbnb' ? 'bg-gold' : 'bg-petrol'}`} />
                  <div>
                    <h3 className="font-bold text-lg">{client.name}</h3>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <MapPin size={14} />
                      {client.address}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Team Pay</p>
                    <p className="font-bold text-petrol">${client.teamPaymentValue}</p>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-petrol transition-colors" />
                </div>
              </div>
            </Link>
          )) : (
            <div className="card text-center py-12 text-slate-400">
              No cleanings scheduled for today.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
