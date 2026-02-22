import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

/**
 * NOTE FOR DEPLOYMENT:
 * This app uses better-sqlite3 which stores data in a local file (maid_by_ana.db).
 * On serverless platforms like Vercel or Firebase Functions, the filesystem is ephemeral,
 * meaning your data will be LOST when the function restarts.
 * 
 * For production deployment on Vercel/Firebase, it is HIGHLY RECOMMENDED to:
 * 1. Use Firebase Firestore (already configured in src/lib/firebase.ts)
 * 2. Or use a hosted PostgreSQL/MySQL database (e.g., Supabase, Neon, Railway).
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;
try {
  const dbPath = process.env.NODE_ENV === "production" ? path.join("/tmp", "maid_by_ana.db") : "maid_by_ana.db";
  db = new Database(dbPath);
  
  // Initialize Database
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'regular', 'airbnb'
      name TEXT NOT NULL,
      owner_name TEXT,
      property_name TEXT,
      address TEXT,
      email TEXT,
      phone TEXT,
      frequency TEXT,
      property_link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      service_type TEXT NOT NULL,
      service_value REAL NOT NULL,
      staff_value REAL NOT NULL,
      payment_status TEXT DEFAULT 'pending',
      payment_method TEXT,
      payment_date TEXT,
      notes TEXT,
      FOREIGN KEY (client_id) REFERENCES clients (id)
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'hourly', 'detailed'
      details TEXT NOT NULL, -- JSON string
      total REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_role TEXT NOT NULL, -- 'admin', 'staff'
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
} catch (error) {
  console.error("Database initialization failed:", error);
  // Fallback to a mock DB object to prevent the server from crashing
  db = {
    prepare: () => ({
      all: () => [],
      get: () => null,
      run: () => ({ lastInsertRowid: 0 })
    }),
    exec: () => {}
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/clients", (req, res) => {
    const clients = db.prepare("SELECT * FROM clients ORDER BY name ASC").all();
    res.json(clients);
  });

  app.post("/api/clients", (req, res) => {
    const { type, name, owner_name, property_name, address, email, phone, frequency, property_link } = req.body;
    const info = db.prepare(`
      INSERT INTO clients (type, name, owner_name, property_name, address, email, phone, frequency, property_link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(type, name, owner_name, property_name, address, email, phone, frequency, property_link);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/services", (req, res) => {
    const services = db.prepare(`
      SELECT s.*, c.name as client_name, c.type as client_type 
      FROM services s 
      JOIN clients c ON s.client_id = c.id 
      ORDER BY s.date DESC
    `).all();
    res.json(services);
  });

  app.post("/api/services", (req, res) => {
    const { client_id, date, service_type, service_value, staff_value, notes } = req.body;
    const info = db.prepare(`
      INSERT INTO services (client_id, date, service_type, service_value, staff_value, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(client_id, date, service_type, service_value, staff_value, notes);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/services/:id", (req, res) => {
    const { id } = req.params;
    const { payment_status, payment_method, payment_date } = req.body;
    db.prepare(`
      UPDATE services 
      SET payment_status = ?, payment_method = ?, payment_date = ?
      WHERE id = ?
    `).run(payment_status, payment_method, payment_date, id);
    res.json({ success: true });
  });

  app.get("/api/quotations", (req, res) => {
    const quotations = db.prepare("SELECT * FROM quotations ORDER BY created_at DESC").all();
    res.json(quotations);
  });

  app.post("/api/quotations", (req, res) => {
    const { client_name, type, details, total } = req.body;
    const info = db.prepare(`
      INSERT INTO quotations (client_name, type, details, total)
      VALUES (?, ?, ?, ?)
    `).run(client_name, type, JSON.stringify(details), total);
    res.json({ id: info.lastInsertRowid });
  });

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

  app.get("/api/financial-stats", (req, res) => {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        SUM(service_value) as total_revenue,
        SUM(staff_value) as total_staff_pay,
        SUM(service_value - staff_value) as total_profit
      FROM services
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += " AND date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      query += " AND date <= ?";
      params.push(end_date);
    }

    const stats = db.prepare(query).get(...params);

    // Get daily breakdown for charts
    let breakdownQuery = `
      SELECT 
        date,
        SUM(service_value) as revenue,
        SUM(staff_value) as staff_pay,
        SUM(service_value - staff_value) as profit
      FROM services
      WHERE 1=1
    `;
    const breakdownParams = [];
    if (start_date) {
      breakdownQuery += " AND date >= ?";
      breakdownParams.push(start_date);
    }
    if (end_date) {
      breakdownQuery += " AND date <= ?";
      breakdownParams.push(end_date);
    }
    breakdownQuery += " GROUP BY date ORDER BY date ASC";
    
    const breakdown = db.prepare(breakdownQuery).all(...breakdownParams);

    res.json({ stats, breakdown });
  });

  // Background task to generate notifications (simplified for demo)
  setInterval(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Staff: Upcoming services for today
    const todayServices = db.prepare(`
      SELECT s.*, c.name as client_name, c.address 
      FROM services s 
      JOIN clients c ON s.client_id = c.id 
      WHERE s.date = ?
    `).all(today);

    todayServices.forEach(s => {
      const title = `Upcoming Service: ${s.client_name}`;
      const message = `Service today at ${s.address}. Type: ${s.service_type}`;
      
      // Check if already notified
      const exists = db.prepare("SELECT id FROM notifications WHERE title = ? AND created_at >= ?").get(title, today);
      if (!exists) {
        db.prepare("INSERT INTO notifications (user_role, title, message) VALUES (?, ?, ?)").run('staff', title, message);
      }
    });

    // 2. Admin: Pending payments
    const pendingPayments = db.prepare(`
      SELECT s.*, c.name as client_name 
      FROM services s 
      JOIN clients c ON s.client_id = c.id 
      WHERE s.payment_status = 'pending' AND s.date <= ?
    `).all(today);

    pendingPayments.forEach(s => {
      const title = `Pending Payment: ${s.client_name}`;
      const message = `Payment of $${s.service_value} is pending for service on ${s.date}.`;
      
      const exists = db.prepare("SELECT id FROM notifications WHERE title = ? AND created_at >= ?").get(title, today);
      if (!exists) {
        db.prepare("INSERT INTO notifications (user_role, title, message) VALUES (?, ?, ?)").run('admin', title, message);
      }
    });

    // 3. Admin: Pending quotations
    const pendingQuotes = db.prepare("SELECT * FROM quotations WHERE sent = 0").all();
    pendingQuotes.forEach(q => {
      const title = `Pending Quotation: ${q.client_name}`;
      const message = `Quotation for $${q.total} has not been sent yet.`;
      
      const exists = db.prepare("SELECT id FROM notifications WHERE title = ? AND created_at >= ?").get(title, today);
      if (!exists) {
        db.prepare("INSERT INTO notifications (user_role, title, message) VALUES (?, ?, ?)").run('admin', title, message);
      }
    });

  }, 60000); // Check every minute

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
