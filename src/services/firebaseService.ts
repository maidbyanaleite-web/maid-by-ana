import { db, auth, storage } from '../lib/firebase';
import { Client, Job, Staff, Quotation, Stats, AppUser, UserRole } from '../types';

// Collection names
const COLLECTIONS = {
  CLIENTS: 'clients',
  JOBS: 'jobs',
  STAFF: 'staff',
  QUOTATIONS: 'quotations',
  NOTIFICATIONS: 'notifications',
  USERS: 'users'
};

export const firebaseService = {
  async register(email: string, password: string, role: UserRole, related_id?: string): Promise<AppUser> {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    if (!user) throw new Error('User creation failed');

    const userData = {
      role,
      related_id: related_id || null
    };

    await db.collection(COLLECTIONS.USERS).doc(user.uid).set(userData);

    return { uid: user.uid, email: user.email!, role, related_id };
  },

  async login(email: string, password: string): Promise<AppUser> {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    if (!user) throw new Error('User not found');

    const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
    if (!userDoc.exists) {
      // If user exists in Auth but not in Firestore, we might want to handle it.
      // For now, let's assume they are Admin if it's the first user or something, 
      // but better to throw error or default.
      throw new Error('User role not configured');
    }

    return { uid: user.uid, email: user.email!, ...userDoc.data() } as AppUser;
  },

  async logout(): Promise<void> {
    await auth.signOut();
  },

  async getCurrentUser(): Promise<AppUser | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
    if (!userDoc.exists) return null;

    return { uid: user.uid, email: user.email!, ...userDoc.data() } as AppUser;
  },

  // Users
  async createUser(uid: string, data: Omit<AppUser, 'uid' | 'email'>): Promise<void> {
    await db.collection(COLLECTIONS.USERS).doc(uid).set(data);
  },
  // Clients
  async getClients(): Promise<Client[]> {
    const snapshot = await db.collection(COLLECTIONS.CLIENTS).orderBy('name').get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  },

  async addClient(client: Omit<Client, 'id'>): Promise<string> {
    const docRef = await db.collection(COLLECTIONS.CLIENTS).add({
      ...client,
      created_at: new Date().toISOString()
    });
    return docRef.id;
  },

  // Jobs
  async getJobs(): Promise<Job[]> {
    const snapshot = await db.collection(COLLECTIONS.JOBS).orderBy('cleaning_date', 'desc').get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  },

  async addJob(job: Omit<Job, 'id'>): Promise<string> {
    const docRef = await db.collection(COLLECTIONS.JOBS).add({
      ...job,
      created_at: new Date().toISOString()
    });
    return docRef.id;
  },

  async updateJob(id: string, updates: Partial<Job>): Promise<void> {
    await db.collection(COLLECTIONS.JOBS).doc(id).update(updates);
  },

  // Staff
  async getStaff(): Promise<Staff[]> {
    const snapshot = await db.collection(COLLECTIONS.STAFF).orderBy('name').get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  },

  async addStaff(staff: Omit<Staff, 'id'>): Promise<string> {
    const docRef = await db.collection(COLLECTIONS.STAFF).add({
      ...staff,
      created_at: new Date().toISOString()
    });
    return docRef.id;
  },

  // Quotations
  async addQuotation(quotation: Omit<Quotation, 'id'>): Promise<string> {
    const docRef = await db.collection(COLLECTIONS.QUOTATIONS).add({
      ...quotation,
      created_at: new Date().toISOString()
    });
    return docRef.id;
  },

  // Stats
  async getStats(): Promise<Stats> {
    const jobsSnapshot = await db.collection(COLLECTIONS.JOBS).where('status', '==', 'Finished').get();
    const clientsSnapshot = await db.collection(COLLECTIONS.CLIENTS).get();
    const staffSnapshot = await db.collection(COLLECTIONS.STAFF).where('status', '==', 'Active').get();
    const pendingPaymentsSnapshot = await db.collection(COLLECTIONS.JOBS)
      .where('status', '==', 'Finished')
      .get();

    const jobs = jobsSnapshot.docs.map((doc: any) => doc.data());
    const revenue = jobs.reduce((acc: number, job: any) => acc + (job.service_value || 0), 0);
    const staffPay = jobs.reduce((acc: number, job: any) => acc + (job.staff_value || 0), 0);
    
    // Filter pending payments in memory since Firestore doesn't support != or multiple inequalities well without composite indexes
    const pendingPayments = pendingPaymentsSnapshot.docs.filter((doc: any) => {
      const data = doc.data();
      return !data.payment_date || data.payment_date === '';
    }).length;

    return {
      revenue,
      staffPay,
      profit: revenue - staffPay,
      jobCount: jobs.length,
      clientCount: clientsSnapshot.size,
      staffCount: staffSnapshot.size,
      pendingPayments
    };
  },

  async getFilteredStats(start: string, end: string): Promise<any> {
    const jobsSnapshot = await db.collection(COLLECTIONS.JOBS)
      .where('status', '==', 'Finished')
      .where('cleaning_date', '>=', start)
      .where('cleaning_date', '<=', end)
      .get();

    const jobs = jobsSnapshot.docs.map((doc: any) => doc.data());
    const revenue = jobs.reduce((acc: number, job: any) => acc + (job.service_value || 0), 0);
    const staffPay = jobs.reduce((acc: number, job: any) => acc + (job.staff_value || 0), 0);
    
    // Group by date for charts
    const chartDataMap: { [key: string]: any } = {};
    jobs.forEach((job: any) => {
      const date = job.cleaning_date;
      if (!chartDataMap[date]) {
        chartDataMap[date] = { date, revenue: 0, staffPay: 0, profit: 0 };
      }
      chartDataMap[date].revenue += job.service_value || 0;
      chartDataMap[date].staffPay += job.staff_value || 0;
      chartDataMap[date].profit = chartDataMap[date].revenue - chartDataMap[date].staffPay;
    });

    const chartData = Object.values(chartDataMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      revenue,
      staffPay,
      profit: revenue - staffPay,
      chartData
    };
  },

  // Storage
  async uploadFile(file: File, path: string): Promise<string> {
    const storageRef = storage.ref();
    const fileRef = storageRef.child(path);
    await fileRef.put(file);
    return await fileRef.getDownloadURL();
  },

  // Notifications
  async getNotifications(role: string): Promise<any[]> {
    const snapshot = await db.collection(COLLECTIONS.NOTIFICATIONS)
      .where('role', '==', role)
      .orderBy('sent_at', 'desc')
      .limit(20)
      .get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  },

  // Real-time listeners
  subscribeToJobs(callback: (jobs: Job[]) => void) {
    return db.collection(COLLECTIONS.JOBS)
      .orderBy('cleaning_date', 'desc')
      .onSnapshot((snapshot: any) => {
        const jobs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        callback(jobs);
      });
  },

  subscribeToNotifications(role: string, callback: (notifications: any[]) => void) {
    return db.collection(COLLECTIONS.NOTIFICATIONS)
      .where('role', '==', role)
      .orderBy('sent_at', 'desc')
      .limit(20)
      .onSnapshot((snapshot: any) => {
        const notifications = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        callback(notifications);
      });
  }
};
