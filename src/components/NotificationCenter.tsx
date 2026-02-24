import React, { useEffect, useState } from 'react';
import { Bell, X, Info, AlertTriangle, DollarSign, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { Client } from '../types';
import { format, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { requestNotificationPermission, onMessageListener } from '../services/notificationService';
import { useLanguage } from '../contexts/LanguageContext';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'cleaning' | 'payment' | 'budget';
  date: Date;
}

export default function NotificationCenter() {
  const { user, isAdmin, isStaff } = useAuth();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (user) {
      requestNotificationPermission(user.uid);
      onMessageListener().then((payload: any) => {
        console.log('Foreground message:', payload);
        // Handle foreground message if needed
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = db.collection('clients').onSnapshot((snapshot) => {
      const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      const newNotifications: NotificationItem[] = [];
      const today = startOfDay(new Date());

      clients.forEach(client => {
        // 1. Staff: Today's Cleanings
        if (isStaff) {
          const hasCleaningToday = client.cleaningDates?.some(date => 
            format(new Date(date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
          );
          if (hasCleaningToday) {
            newNotifications.push({
              id: `cleaning-${client.id}`,
              title: t('cleaningToday'),
              body: `${client.name} at ${client.address}`,
              type: 'cleaning',
              date: new Date()
            });
          }
        }

        // 2. Admin: Payments Due
        if (isAdmin) {
          if (client.nextPaymentDue) {
            const dueDate = new Date(client.nextPaymentDue);
            const threeDaysFromNow = addDays(today, 3);
            
            if (isBefore(dueDate, threeDaysFromNow) && isAfter(dueDate, addDays(today, -1))) {
              newNotifications.push({
                id: `payment-${client.id}`,
                title: t('paymentDueSoon'),
                body: `${client.name}: $${client.serviceValue} due on ${client.nextPaymentDue}`,
                type: 'payment',
                date: new Date()
              });
            }
          }

          // 3. Admin: Pending Budgets
          if (client.budgetRequested && !client.budgetSent) {
            newNotifications.push({
              id: `budget-${client.id}`,
              title: t('budgetRequest'),
              body: `New request from ${client.name}`,
              type: 'budget',
              date: new Date()
            });
          }
        }
      });

      setNotifications(newNotifications);
    });

    return () => unsubscribe();
  }, [user, isAdmin, isStaff, t]);

  return (
    <div className="relative">
      <button 
        onClick={() => setShowPanel(!showPanel)}
        className="p-2 rounded-full hover:bg-slate-100 transition-colors relative"
      >
        <Bell size={24} className="text-petrol" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
            {notifications.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showPanel && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowPanel(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-petrol">{t('notifications')}</h3>
                <button onClick={() => setShowPanel(false)} className="text-slate-400 hover:text-petrol">
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map(notif => (
                    <div key={notif.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3">
                      <div className={`p-2 rounded-lg h-fit ${
                        notif.type === 'cleaning' ? 'bg-blue-100 text-blue-600' :
                        notif.type === 'payment' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-gold-light text-gold'
                      }`}>
                        {notif.type === 'cleaning' && <Info size={16} />}
                        {notif.type === 'payment' && <DollarSign size={16} />}
                        {notif.type === 'budget' && <FileText size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{notif.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{notif.body}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    <Bell size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">{t('allCaughtUp')}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
