import React, { createContext, useContext, useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';

interface Notification {
  id: string;
  type: string;
  message: string;
  sent_at: string;
  role: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children, role }: { children: React.ReactNode, role: 'Admin' | 'Staff' }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Setup Firestore listener
    const unsubscribe = firebaseService.subscribeToNotifications(role, (data) => {
      // If the new count is higher than previous, it means new notifications arrived
      if (data.length > notifications.length && notifications.length > 0) {
        const newCount = data.length - notifications.length;
        setUnreadCount(prev => prev + newCount);

        // Show browser notification for the latest one
        if (Notification.permission === 'granted' && data[0]) {
          new Notification('Maid By Ana', {
            body: data[0].message,
            icon: '/favicon.ico'
          });
        }
      }
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [role, notifications.length]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
