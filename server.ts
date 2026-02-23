import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import multer from "multer";
import { format, addDays, isSameDay } from "date-fns";
import admin from "firebase-admin";

// Initialize Firebase Admin
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
  }
}

const db = new Database("maid_by_ana.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'staff'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT CHECK(type IN ('regular', 'airbnb')),
    name TEXT NOT NULL,
    since TEXT,
    address TEXT,
    email TEXT,
    phone TEXT,
    frequency TEXT, -- weekly, biweekly, monthly
    property_name TEXT, -- for airbnb
    property_link TEXT, -- for airbnb
    reviews TEXT -- for airbnb
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    service_type TEXT, -- regular, deep, move-in, move-out
    extras TEXT, -- JSON string of extras
    service_value REAL,
    staff_pay REAL,
    service_date TEXT,
    payment_date TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'scheduled', -- scheduled, completed, paid
    photos_before TEXT, -- JSON array of paths
    photos_after TEXT, -- JSON array of paths
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT,
    type TEXT, -- hourly, detailed
    inputs TEXT, -- JSON string of inputs
    total_value REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_role TEXT, -- admin, staff
    title TEXT,
    message TEXT,
    type TEXT, -- service_reminder, payment_due, quote_pending
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Initialize default settings
const settingsCount = db.prepare("SELECT count(*) as count FROM settings").get() as { count: number };
if (settingsCount.count === 0) {
  const defaults = [
    ['brand_name', 'Maid By Ana'],
    ['brand_subtitle', 'Professional Cleaning Services'],
    ['company_address', '123 Cleaning St, Clean City, CL 12345'],
    ['logo_url', ''],
    ['language', 'en']
  ];
  const insert = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  defaults.forEach(([k, v]) => insert.run(k, v));
}

// Inspection Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS property_checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    photo_name TEXT,
    is_required INTEGER DEFAULT 1,
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS inspection_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER,
    status TEXT, -- in_progress, completed
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS inspection_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER,
    category TEXT, -- Bedrooms, Kitchen, Bathroom, Special, Entry, Audit
    url TEXT,
    comment TEXT,
    type TEXT, -- entry, exit, audit
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(report_id) REFERENCES inspection_reports(id)
  );

  CREATE TABLE IF NOT EXISTS inspection_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER,
    user_role TEXT,
    message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(report_id) REFERENCES inspection_reports(id)
  );
`);

// Seed admin if not exists
const adminCount = db.prepare("SELECT count(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
if (adminCount.count === 0) {
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("ana", "admin123", "admin");
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("staff", "staff123", "staff");
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  const PORT = 3000;

  // Multer setup for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = './uploads';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  const upload = multer({ storage });

  app.use(express.json());
  app.use('/uploads', express.static('uploads'));

  // Socket.io connection
  io.on("connection", (socket) => {
    console.log("Client connected");
    
    socket.on("join", (role) => {
      socket.join(role);
      console.log(`User joined as ${role}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  // Helper to send notifications
  const sendNotification = (role: string, title: string, message: string, type: string) => {
    const stmt = db.prepare("INSERT INTO notifications (user_role, title, message, type) VALUES (?, ?, ?, ?)");
    const result = stmt.run(role, title, message, type);
    
    io.to(role).emit("notification", {
      id: result.lastInsertRowid,
      title,
      message,
      type,
      created_at: new Date().toISOString()
    });
  };

  // Background Job for Notifications (runs every minute in a real app, here every 30s for demo)
  setInterval(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // 1. Staff Reminders: Today's Services
    const todaysServices = db.prepare(`
      SELECT services.*, clients.name as client_name, clients.address as client_address 
      FROM services 
      JOIN clients ON services.client_id = clients.id
      WHERE service_date = ? AND status = 'scheduled'
    `).all(today) as any[];

    todaysServices.forEach(service => {
      // Check if we already sent a reminder today for this service
      const exists = db.prepare("SELECT id FROM notifications WHERE type = 'service_reminder' AND message LIKE ? AND created_at >= ?")
        .get(`%${service.client_name}%`, today);
      
      if (!exists) {
        sendNotification(
          'staff', 
          'Upcoming Service Today', 
          `Service for ${service.client_name} at ${service.client_address}`, 
          'service_reminder'
        );
      }
    });

    // 2. Admin: Payment Reminders (Services completed but not paid)
    const unpaidServices = db.prepare(`
      SELECT services.*, clients.name as client_name 
      FROM services 
      JOIN clients ON services.client_id = clients.id
      WHERE status = 'completed' AND (payment_date IS NULL OR payment_date = '')
    `).all() as any[];

    unpaidServices.forEach(service => {
      const exists = db.prepare("SELECT id FROM notifications WHERE type = 'payment_due' AND message LIKE ? AND created_at >= ?")
        .get(`%${service.client_name}%`, today);
      
      if (!exists) {
        sendNotification(
          'admin', 
          'Payment Pending', 
          `Payment for ${service.client_name} (Service on ${service.service_date}) is pending.`, 
          'payment_due'
        );
      }
    });

    // 3. Admin: Quote Reminders (Quotes older than 2 days)
    const twoDaysAgo = format(addDays(new Date(), -2), 'yyyy-MM-dd');
    const pendingQuotes = db.prepare("SELECT * FROM quotations WHERE created_at <= ?").all(twoDaysAgo) as any[];

    pendingQuotes.forEach(quote => {
      const exists = db.prepare("SELECT id FROM notifications WHERE type = 'quote_pending' AND message LIKE ? AND created_at >= ?")
        .get(`%${quote.client_name}%`, today);
      
      if (!exists) {
        sendNotification(
          'admin', 
          'Quote Follow-up', 
          `Quotation for ${quote.client_name} was created 2 days ago. Follow up?`, 
          'quote_pending'
        );
      }
    });

  }, 30000);

  // API Routes
  app.get("/api/notifications", (req, res) => {
    const { role } = req.query;
    const notifications = db.prepare("SELECT * FROM notifications WHERE user_role = ? ORDER BY created_at DESC LIMIT 20").all(role);
    res.json(notifications);
  });

  app.post("/api/notifications/read", (req, res) => {
    const { id } = req.body;
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", (req, res) => {
    const settings = req.body;
    const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    Object.entries(settings).forEach(([key, value]) => {
      upsert.run(key, value);
    });
    res.json({ success: true });
  });

  // Checklist Endpoints
  app.get("/api/checklists/:clientId", (req, res) => {
    const checklists = db.prepare("SELECT * FROM property_checklists WHERE client_id = ?").all(req.params.clientId);
    res.json(checklists);
  });

  app.post("/api/checklists", (req, res) => {
    const { client_id, photo_name, is_required } = req.body;
    const result = db.prepare("INSERT INTO property_checklists (client_id, photo_name, is_required) VALUES (?, ?, ?)").run(client_id, photo_name, is_required ? 1 : 0);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/checklists/:id", (req, res) => {
    db.prepare("DELETE FROM property_checklists WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Inspection Endpoints
  app.get("/api/inspections/:serviceId", async (req, res) => {
    // Try Firestore first if configured
    if (process.env.FIREBASE_PROJECT_ID) {
      try {
        const dbFirestore = admin.firestore();
        const snapshot = await dbFirestore.collection('inspections')
          .where('service_id', '==', parseInt(req.params.serviceId))
          .limit(1)
          .get();
        
        if (!snapshot.empty) {
          const reportDoc = snapshot.docs[0];
          const reportData = reportDoc.data();
          
          // Fetch photos and comments from subcollections
          const photosSnap = await reportDoc.ref.collection('photos').get();
          const commentsSnap = await reportDoc.ref.collection('comments').orderBy('created_at', 'asc').get();
          
          return res.json({
            id: reportDoc.id,
            ...reportData,
            photos: photosSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            comments: commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          });
        }
      } catch (error) {
        console.error("Firestore error:", error);
      }
    }

    // Fallback to SQLite
    const report = db.prepare("SELECT * FROM inspection_reports WHERE service_id = ?").get(req.params.serviceId);
    if (!report) return res.json(null);

    const photos = db.prepare("SELECT * FROM inspection_photos WHERE report_id = ?").all(report.id);
    const comments = db.prepare("SELECT * FROM inspection_comments WHERE report_id = ? ORDER BY created_at ASC").all(report.id);
    
    res.json({ ...report, photos, comments });
  });

  app.post("/api/inspections", async (req, res) => {
    const { service_id } = req.body;

    if (process.env.FIREBASE_PROJECT_ID) {
      try {
        const dbFirestore = admin.firestore();
        const snapshot = await dbFirestore.collection('inspections')
          .where('service_id', '==', service_id)
          .limit(1)
          .get();
        
        if (!snapshot.empty) {
          return res.json({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        } else {
          const newReport = {
            service_id,
            status: 'in_progress',
            created_at: new Date().toISOString()
          };
          const docRef = await dbFirestore.collection('inspections').add(newReport);
          return res.json({ id: docRef.id, ...newReport });
        }
      } catch (error) {
        console.error("Firestore error:", error);
      }
    }

    // Fallback to SQLite
    let report = db.prepare("SELECT * FROM inspection_reports WHERE service_id = ?").get(service_id);
    if (!report) {
      const result = db.prepare("INSERT INTO inspection_reports (service_id, status) VALUES (?, ?)").run(service_id, 'in_progress');
      report = { id: result.lastInsertRowid, service_id, status: 'in_progress' };
    }
    res.json(report);
  });

  app.post("/api/inspections/photos", upload.array('photos'), async (req, res) => {
    const { report_id, category, comment, type } = req.body;
    const files = req.files as Express.Multer.File[];
    
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_STORAGE_BUCKET) {
      try {
        const bucket = admin.storage().bucket();
        const dbFirestore = admin.firestore();
        
        const uploadPromises = files.map(async (file) => {
          const destination = `inspections/${report_id}/${Date.now()}-${file.originalname}`;
          const [uploadedFile] = await bucket.upload(file.path, {
            destination,
            public: true,
            metadata: { contentType: file.mimetype }
          });
          
          const url = uploadedFile.publicUrl();
          
          // Save to Firestore
          const photoData = {
            category,
            url,
            comment: comment || '',
            type,
            created_at: new Date().toISOString()
          };
          
          const photoRef = await dbFirestore.collection('inspections').doc(report_id).collection('photos').add(photoData);
          
          // Cleanup local file
          fs.unlinkSync(file.path);
          
          return { id: photoRef.id, url };
        });
        
        const results = await Promise.all(uploadPromises);
        return res.json(results);
      } catch (error) {
        console.error("Firebase upload error:", error);
      }
    }

    // Fallback to SQLite
    const insert = db.prepare("INSERT INTO inspection_photos (report_id, category, url, comment, type) VALUES (?, ?, ?, ?, ?)");
    const results = files.map(file => {
      const url = `/uploads/${file.filename}`;
      const result = insert.run(report_id, category, url, comment || '', type);
      return { id: result.lastInsertRowid, url };
    });

    res.json(results);
  });

  app.post("/api/inspections/comments", async (req, res) => {
    const { report_id, user_role, message } = req.body;

    if (process.env.FIREBASE_PROJECT_ID) {
      try {
        const dbFirestore = admin.firestore();
        const commentData = {
          user_role,
          message,
          created_at: new Date().toISOString()
        };
        
        const commentRef = await dbFirestore.collection('inspections').doc(report_id).collection('comments').add(commentData);
        const comment = { id: commentRef.id, report_id, ...commentData };
        
        io.emit('inspection_comment', comment);
        return res.json(comment);
      } catch (error) {
        console.error("Firestore error:", error);
      }
    }

    // Fallback to SQLite
    const result = db.prepare("INSERT INTO inspection_comments (report_id, user_role, message) VALUES (?, ?, ?)").run(report_id, user_role, message);
    const comment = { id: result.lastInsertRowid, report_id, user_role, message, created_at: new Date().toISOString() };
    
    io.emit('inspection_comment', comment);
    res.json(comment);
  });

  app.get("/api/clients", (req, res) => {
    const clients = db.prepare("SELECT * FROM clients").all();
    res.json(clients);
  });

  app.post("/api/clients", (req, res) => {
    const { type, name, since, address, email, phone, frequency, property_name, property_link } = req.body;
    const result = db.prepare(`
      INSERT INTO clients (type, name, since, address, email, phone, frequency, property_name, property_link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(type, name, since, address, email, phone, frequency, property_name, property_link);
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/services", (req, res) => {
    const services = db.prepare(`
      SELECT services.*, clients.name as client_name, clients.address as client_address, clients.type as client_type
      FROM services
      JOIN clients ON services.client_id = clients.id
      ORDER BY service_date DESC
    `).all();
    res.json(services);
  });

  app.post("/api/services", (req, res) => {
    const { client_id, service_type, extras, service_value, staff_pay, service_date, payment_method } = req.body;
    const result = db.prepare(`
      INSERT INTO services (client_id, service_type, extras, service_value, staff_pay, service_date, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(client_id, service_type, JSON.stringify(extras), service_value, staff_pay, service_date, payment_method);
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/stats", (req, res) => {
    const totalRevenue = db.prepare("SELECT SUM(service_value) as total FROM services WHERE status != 'cancelled'").get() as { total: number };
    const totalStaffPay = db.prepare("SELECT SUM(staff_pay) as total FROM services WHERE status != 'cancelled'").get() as { total: number };
    const clientCount = db.prepare("SELECT COUNT(*) as count FROM clients").get() as { count: number };
    const serviceCount = db.prepare("SELECT COUNT(*) as count FROM services").get() as { count: number };

    res.json({
      revenue: totalRevenue.total || 0,
      staffPay: totalStaffPay.total || 0,
      profit: (totalRevenue.total || 0) - (totalStaffPay.total || 0),
      clients: clientCount.count,
      services: serviceCount.count
    });
  });

  app.get("/api/reports/financial", (req, res) => {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        service_date as date,
        SUM(service_value) as revenue,
        SUM(staff_pay) as staffPay
      FROM services 
      WHERE status != 'cancelled'
    `;
    const params: any[] = [];

    if (startDate && endDate) {
      query += ` AND service_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    query += ` GROUP BY service_date ORDER BY service_date ASC`;

    const dailyData = db.prepare(query).all(...params) as any[];
    
    const summary = dailyData.reduce((acc, curr) => ({
      revenue: acc.revenue + curr.revenue,
      staffPay: acc.staffPay + curr.staffPay,
      profit: acc.profit + (curr.revenue - curr.staffPay)
    }), { revenue: 0, staffPay: 0, profit: 0 });

    res.json({
      summary,
      dailyData: dailyData.map(d => ({
        ...d,
        profit: d.revenue - d.staffPay
      }))
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve("dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
