import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import multer from "multer";
import { format } from "date-fns";
import admin from "firebase-admin";
import { fileURLToPath } from "url";

/* ================= DIRNAME FIX (ESM SAFE) ================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= FIREBASE ADMIN INIT ================= */

if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    console.log("🔥 Firebase Admin initialized");
  } catch (error) {
    console.error("❌ Firebase Admin init error:", error);
  }
}

/* ================= SAFE SQLITE INIT (ABSOLUTE + FINAL FIX) ================= */

const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "maid_by_ana.db");

console.log("📁 DATABASE PATH:", dbPath);

let db: Database.Database;

try {
  db = new Database(dbPath);
} catch (error: any) {
  if (error.code === "SQLITE_NOTADB") {
    console.log("⚠️ Corrupted DB detected. Recreating...");
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    db = new Database(dbPath);
  } else {
    throw error;
  }
}

/* ================= DATABASE SCHEMA ================= */

db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT CHECK(role IN ('admin','staff'))
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  name TEXT NOT NULL,
  since TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  frequency TEXT,
  property_name TEXT,
  property_link TEXT,
  reviews TEXT
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,
  service_type TEXT,
  extras TEXT,
  service_value REAL,
  staff_pay REAL,
  service_date TEXT,
  payment_date TEXT,
  payment_method TEXT,
  status TEXT DEFAULT 'scheduled',
  FOREIGN KEY(client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT,
  type TEXT,
  inputs TEXT,
  total_value REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_role TEXT,
  title TEXT,
  message TEXT,
  type TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

/* ================= SEED ADMIN ================= */

const adminExists = db
  .prepare("SELECT COUNT(*) as count FROM users WHERE role='admin'")
  .get() as any;

if (adminExists.count === 0) {
  db.prepare(
    "INSERT INTO users (username,password,role) VALUES (?,?,?)"
  ).run("ana", "admin123", "admin");

  db.prepare(
    "INSERT INTO users (username,password,role) VALUES (?,?,?)"
  ).run("staff", "staff123", "staff");
}

/* ================= SERVER START ================= */

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  const PORT = 3000;

  app.use(express.json());

  /* ===== Upload Setup ===== */

  const uploadDir = path.join(__dirname, "uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) =>
      cb(null, Date.now() + "-" + file.originalname),
  });

  const upload = multer({ storage });

  app.use("/uploads", express.static(uploadDir));

  /* ===== SOCKET ===== */

  io.on("connection", (socket) => {
    console.log("🔌 Client connected");

    socket.on("join", (role) => {
      socket.join(role);
    });
  });

  /* ===== NOTIFICATIONS JOB ===== */

  setInterval(() => {
    const today = format(new Date(), "yyyy-MM-dd");

    const todaysServices = db
      .prepare(
        `SELECT services.*, clients.name as client_name
         FROM services
         JOIN clients ON services.client_id = clients.id
         WHERE service_date = ?`
      )
      .all(today) as any[];

    todaysServices.forEach((service) => {
      db.prepare(
        "INSERT INTO notifications (user_role,title,message,type) VALUES (?,?,?,?)"
      ).run(
        "staff",
        "Service Today",
        `Service for ${service.client_name}`,
        "service_reminder"
      );
    });
  }, 60000);

  /* ===== BASIC ROUTES ===== */

  app.get("/api/clients", (_, res) => {
    res.json(db.prepare("SELECT * FROM clients").all());
  });

  app.post("/api/clients", (req, res) => {
    const { name } = req.body;
    const result = db
      .prepare("INSERT INTO clients (name) VALUES (?)")
      .run(name);
    res.json({ id: result.lastInsertRowid });
  });

  /* ===== VITE ===== */

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();