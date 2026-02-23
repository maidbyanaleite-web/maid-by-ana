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
  getDoc,
  setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { Client, Service, Quotation, Notification, Settings, InspectionReport, InspectionPhoto } from "../types";

// Collection Names
const CLIENTS_COL = "clients";
const SERVICES_COL = "services";
const QUOTATIONS_COL = "quotations";
const NOTIFICATIONS_COL = "notifications";
const SETTINGS_COL = "settings";
const INSPECTIONS_COL = "inspections";

export const firebaseService = {
  // Storage
  async uploadImage(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  },
  // Settings
  async getSettings(): Promise<Settings> {
    const docRef = doc(db, SETTINGS_COL, "global");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Settings;
    }
    return {
      company_name: "Maid By Ana",
      company_subtitle: "Cleaning Management",
      company_address: ""
    };
  },

  async updateSettings(settings: Settings): Promise<void> {
    const docRef = doc(db, SETTINGS_COL, "global");
    await updateDoc(docRef, { ...settings } as any).catch(async (error) => {
      if (error.code === 'not-found') {
        const { setDoc } = await import("firebase/firestore");
        await setDoc(docRef, settings);
      } else {
        throw error;
      }
    });
  },

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

  async updateClient(id: string, data: Partial<Client>) {
    const clientRef = doc(db, CLIENTS_COL, id);
    return updateDoc(clientRef, data);
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
  },

  // Inspections
  async getInspectionReport(serviceId: string): Promise<InspectionReport | null> {
    const q = query(collection(db, INSPECTIONS_COL), where("service_id", "==", serviceId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() } as InspectionReport;
  },

  async saveInspectionReport(report: Partial<InspectionReport>) {
    if (report.id) {
      const reportRef = doc(db, INSPECTIONS_COL, report.id);
      const { id, ...data } = report;
      return updateDoc(reportRef, { ...data, updated_at: serverTimestamp() });
    } else {
      return addDoc(collection(db, INSPECTIONS_COL), {
        ...report,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    }
  },

  subscribeInspectionReport(serviceId: string, callback: (report: InspectionReport | null) => void) {
    const q = query(collection(db, INSPECTIONS_COL), where("service_id", "==", serviceId));
    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback(null);
      } else {
        const d = snapshot.docs[0];
        callback({ id: d.id, ...d.data() } as InspectionReport);
      }
    });
  }
};
