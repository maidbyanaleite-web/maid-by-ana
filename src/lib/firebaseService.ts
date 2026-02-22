import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { Client, Service, Quotation, Notification } from "../types";

// Collection Names
const CLIENTS_COL = "clients";
const SERVICES_COL = "services";
const QUOTATIONS_COL = "quotations";
const NOTIFICATIONS_COL = "notifications";

export const firebaseService = {
  // Clients
  async getClients(): Promise<Client[]> {
    const q = query(collection(db, CLIENTS_COL), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
  },

  async addClient(client: Partial<Client>) {
    return addDoc(collection(db, CLIENTS_COL), {
      ...client,
      created_at: serverTimestamp()
    });
  },

  // Services
  async getServices(): Promise<Service[]> {
    const q = query(collection(db, SERVICES_COL), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
  },

  async addService(service: Partial<Service>) {
    return addDoc(collection(db, SERVICES_COL), {
      ...service,
      payment_status: service.payment_status || 'pending',
      created_at: serverTimestamp()
    });
  },

  async updateService(id: string, data: Partial<Service>) {
    const serviceRef = doc(db, SERVICES_COL, id);
    return updateDoc(serviceRef, data);
  },

  // Quotations
  async getQuotations(): Promise<Quotation[]> {
    const q = query(collection(db, QUOTATIONS_COL), orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
  },

  async addQuotation(quotation: Partial<Quotation>) {
    return addDoc(collection(db, QUOTATIONS_COL), {
      ...quotation,
      sent: 0,
      created_at: serverTimestamp()
    });
  },

  // Notifications
  async getNotifications(role: string): Promise<Notification[]> {
    const q = query(
      collection(db, NOTIFICATIONS_COL), 
      where("user_role", "==", role),
      orderBy("created_at", "desc"),
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
  },

  async markNotificationRead(id: string) {
    const ref = doc(db, NOTIFICATIONS_COL, id);
    return updateDoc(ref, { is_read: 1 });
  },

  // Real-time listeners
  subscribeNotifications(role: string, callback: (notifications: Notification[]) => void) {
    const q = query(
      collection(db, NOTIFICATIONS_COL), 
      where("user_role", "==", role),
      orderBy("created_at", "desc"),
      limit(20)
    );
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      callback(notifications);
    });
  }
};
