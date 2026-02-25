import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("maid_by_ana.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT CHECK(type IN ('Regular', 'Airbnb')),
    name TEXT NOT NULL,
    owner_name TEXT,
    property_name TEXT,
    since TEXT,
    address TEXT,
    email TEXT,
    phone TEXT,
    frequency TEXT,
    property_link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    staff_id INTEGER, -- Assigned staff member
    service_type TEXT,
    service_value REAL,
    staff_value REAL,
    cleaning_date TEXT,
    cleaning_time TEXT, -- Added time
    payment_date TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'Scheduled', -- Scheduled, On the way, Started, Finished, Cancelled
    notes TEXT,
    photos_before TEXT,
    photos_after TEXT,
    FOREIGN KEY(client_id) REFERENCES clients(id),
    FOREIGN KEY(staff_id) REFERENCES staff(id)
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    inputs TEXT,
    total_value REAL,
    status TEXT DEFAULT 'Pending', -- Pending, Sent
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT, -- 'Staff_Job', 'Admin_Payment', 'Admin_Quotation'
    target_id INTEGER, -- job_id or quotation_id
    role TEXT, -- 'Admin', 'Staff'
    message TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });
  const PORT = 3000;

  app.use(express.json());

  // WebSocket Connection Handling
  const clients_ws = new Set<WebSocket>();
  wss.on("connection", (ws) => {
    clients_ws.add(ws);
    ws.on("close", () => clients_ws.delete(ws));
  });

  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    clients_ws.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Notification Engine
  const checkNotifications = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Staff: Upcoming jobs today
    const upcomingJobs = db.prepare(`
      SELECT jobs.*, clients.name as client_name, clients.address as client_address
      FROM jobs 
      JOIN clients ON jobs.client_id = clients.id
      WHERE cleaning_date = ? AND jobs.status = 'Scheduled'
    `).all(today);

    upcomingJobs.forEach((job: any) => {
      const alreadySent = db.prepare("SELECT id FROM notifications WHERE type = 'Staff_Job' AND target_id = ?").get(job.id);
      if (!alreadySent) {
        const message = `Reminder: Cleaning at ${job.client_address} for ${job.client_name} today!`;
        db.prepare("INSERT INTO notifications (type, target_id, role, message) VALUES (?, ?, ?, ?)").run('Staff_Job', job.id, 'Staff', message);
        broadcast({ type: 'NOTIFICATION', role: 'Staff', message, data: job });
      }
    });

    // 2. Admin: Pending payments for completed jobs
    const pendingPayments = db.prepare(`
      SELECT jobs.*, clients.name as client_name
      FROM jobs
      JOIN clients ON jobs.client_id = clients.id
      WHERE jobs.status = 'Finished' AND (payment_date IS NULL OR payment_date = '')
    `).all();

    pendingPayments.forEach((job: any) => {
      const alreadySent = db.prepare("SELECT id FROM notifications WHERE type = 'Admin_Payment' AND target_id = ?").get(job.id);
      if (!alreadySent) {
        const message = `Payment Pending: ${job.client_name} has not paid for the service on ${job.cleaning_date}.`;
        db.prepare("INSERT INTO notifications (type, target_id, role, message) VALUES (?, ?, ?, ?)").run('Admin_Payment', job.id, 'Admin', message);
        broadcast({ type: 'NOTIFICATION', role: 'Admin', message, data: job });
      }
    });

    // 3. Admin: Pending quotations
    const pendingQuotes = db.prepare("SELECT * FROM quotations WHERE status = 'Pending'").all();
    pendingQuotes.forEach((quote: any) => {
      const alreadySent = db.prepare("SELECT id FROM notifications WHERE type = 'Admin_Quotation' AND target_id = ?").get(quote.id);
      if (!alreadySent) {
        const message = `Pending Quotation: A ${quote.type} quote for ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(quote.total_value)} is waiting to be sent.`;
        db.prepare("INSERT INTO notifications (type, target_id, role, message) VALUES (?, ?, ?, ?)").run('Admin_Quotation', quote.id, 'Admin', message);
        broadcast({ type: 'NOTIFICATION', role: 'Admin', message, data: quote });
      }
    });
  };

  // Run check every 30 seconds
  setInterval(checkNotifications, 30000);

  // API Routes
  app.get("/api/notifications", (req, res) => {
    const role = req.query.role as string;
    const notifications = db.prepare("SELECT * FROM notifications WHERE role = ? ORDER BY sent_at DESC LIMIT 20").all(role);
    res.json(notifications);
  });

  app.get("/api/clients", (req, res) => {
    const clients = db.prepare("SELECT * FROM clients ORDER BY name ASC").all();
    res.json(clients);
  });

  app.post("/api/clients", (req, res) => {
    const { type, name, owner_name, property_name, since, address, email, phone, frequency, property_link } = req.body;
    const info = db.prepare(`
      INSERT INTO clients (type, name, owner_name, property_name, since, address, email, phone, frequency, property_link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(type, name, owner_name, property_name, since, address, email, phone, frequency, property_link);
    res.json({ id: info.lastInsertRowid });
  });

  // Staff Routes
  app.get("/api/staff", (req, res) => {
    const staff = db.prepare("SELECT * FROM staff ORDER BY name ASC").all();
    res.json(staff);
  });

  app.post("/api/staff", (req, res) => {
    const { name, email, phone } = req.body;
    const info = db.prepare("INSERT INTO staff (name, email, phone) VALUES (?, ?, ?)").run(name, email, phone);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/jobs", (req, res) => {
    const jobs = db.prepare(`
      SELECT jobs.*, 
             clients.name as client_name, 
             clients.type as client_type, 
             clients.address as client_address,
             staff.name as staff_name
      FROM jobs 
      JOIN clients ON jobs.client_id = clients.id
      LEFT JOIN staff ON jobs.staff_id = staff.id
      ORDER BY cleaning_date DESC, cleaning_time ASC
    `).all();
    res.json(jobs);
  });

  app.post("/api/jobs", (req, res) => {
    const { client_id, staff_id, service_type, service_value, staff_value, cleaning_date, cleaning_time, notes } = req.body;
    const info = db.prepare(`
      INSERT INTO jobs (client_id, staff_id, service_type, service_value, staff_value, cleaning_date, cleaning_time, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(client_id, staff_id, service_type, service_value, staff_value, cleaning_date, cleaning_time, notes);
    
    // Broadcast new job
    broadcast({ type: 'JOB_CREATED', data: { id: info.lastInsertRowid, client_id, staff_id } });
    
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/jobs/:id", (req, res) => {
    const { id } = req.params;
    const { status, payment_date, payment_method, photos_before, photos_after, staff_id } = req.body;
    
    const updates = [];
    const params = [];
    
    if (status) { updates.push("status = ?"); params.push(status); }
    if (payment_date) { updates.push("payment_date = ?"); params.push(payment_date); }
    if (payment_method) { updates.push("payment_method = ?"); params.push(payment_method); }
    if (photos_before) { updates.push("photos_before = ?"); params.push(photos_before); }
    if (photos_after) { updates.push("photos_after = ?"); params.push(photos_after); }
    if (staff_id) { updates.push("staff_id = ?"); params.push(staff_id); }
    
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    
    params.push(id);
    db.prepare(`UPDATE jobs SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    
    // Broadcast update
    broadcast({ type: 'JOB_UPDATED', id, status });
    
    res.json({ success: true });
  });

  app.get("/api/stats", (req, res) => {
    const revenue = db.prepare("SELECT SUM(service_value) as total FROM jobs WHERE status = 'Finished'").get() as any;
    const staffPay = db.prepare("SELECT SUM(staff_value) as total FROM jobs WHERE status = 'Finished'").get() as any;
    const jobCount = db.prepare("SELECT COUNT(*) as total FROM jobs WHERE status = 'Finished'").get() as any;
    const clientCount = db.prepare("SELECT COUNT(*) as total FROM clients").get() as any;
    const staffCount = db.prepare("SELECT COUNT(*) as total FROM staff WHERE status = 'Active'").get() as any;
    const pendingPayments = db.prepare("SELECT COUNT(*) as total FROM jobs WHERE status = 'Finished' AND (payment_date IS NULL OR payment_date = '')").get() as any;

    res.json({
      revenue: revenue.total || 0,
      staffPay: staffPay.total || 0,
      profit: (revenue.total || 0) - (staffPay.total || 0),
      jobCount: jobCount.total || 0,
      clientCount: clientCount.total || 0,
      staffCount: staffCount.total || 0,
      pendingPayments: pendingPayments.total || 0
    });
  });

  app.post("/api/quotations", (req, res) => {
    const { type, inputs, total_value } = req.body;
    const info = db.prepare(`
      INSERT INTO quotations (type, inputs, total_value)
      VALUES (?, ?, ?)
    `).run(type, JSON.stringify(inputs), total_value);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/stats/filtered", (req, res) => {
    const { start, end } = req.query;
    let query = "SELECT SUM(service_value) as revenue, SUM(staff_value) as staffPay, COUNT(*) as jobCount FROM jobs WHERE status = 'Finished'";
    const params = [];

    if (start && end) {
      query += " AND cleaning_date BETWEEN ? AND ?";
      params.push(start, end);
    }

    const stats = db.prepare(query).get(...params);
    
    // Get daily breakdown for chart
    let chartQuery = "SELECT cleaning_date as date, SUM(service_value) as revenue, SUM(staff_value) as staffPay FROM jobs WHERE status = 'Finished'";
    if (start && end) {
      chartQuery += " AND cleaning_date BETWEEN ? AND ?";
    }
    chartQuery += " GROUP BY cleaning_date ORDER BY cleaning_date ASC";
    
    const chartData = db.prepare(chartQuery).all(...params);

    res.json({
      revenue: stats.revenue || 0,
      staffPay: stats.staffPay || 0,
      profit: (stats.revenue || 0) - (stats.staffPay || 0),
      jobCount: stats.jobCount || 0,
      chartData: chartData.map((d: any) => ({
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
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
