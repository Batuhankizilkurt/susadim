import cron from "node-cron";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import webpush from "web-push";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUBS_FILE = path.join(__dirname, "subscriptions.json");
const USERS_FILE = path.join(__dirname, "users.json");

app.use(cors({ origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN }));
app.use(express.json());

/* 🔥 VAPID FIX (TRIM EKLENDİ) */
webpush.setVapidDetails(
  (process.env.VAPID_SUBJECT || "").trim(),
  (process.env.VAPID_PUBLIC_KEY || "").trim(),
  (process.env.VAPID_PRIVATE_KEY || "").trim()
);

// ---------------- SUBSCRIPTIONS ----------------

function readSubscriptions() {
  try {
    return JSON.parse(fs.readFileSync(SUBS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveSubscriptions(subs) {
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), "utf8");
}

// ---------------- USERS ----------------

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

// ---------------- API ----------------

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

/* 🔥 BURASI ÇOK KRİTİK (iPhone fix) */
app.get("/api/vapid-public-key", (_, res) => {
  const key = (process.env.VAPID_PUBLIC_KEY || "").trim();
  res.json({ publicKey: key });
});

app.get("/api/debug-subs", (_req, res) => {
  const subs = readSubscriptions();
  res.json({
    count: subs.length,
    endpoints: subs.map((s) => s.endpoint),
  });
});

app.get("/api/send-test", async (_, res) => {
  const subscriptions = readSubscriptions();

  if (!subscriptions.length) {
    return res.status(400).json({ ok: false });
  }

  const payload = JSON.stringify({
    title: "Susadım",
    body: "Test bildirimi 💧",
    url: "/",
  });

  await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification(sub, payload))
  );

  res.json({ ok: true });
});

app.post("/api/subscribe", (req, res) => {
  const { subscription } = req.body;

  if (!subscription?.endpoint) {
    return res.status(400).json({ ok: false });
  }

  const subs = readSubscriptions();

  if (!subs.find((s) => s.endpoint === subscription.endpoint)) {
    subs.push(subscription);
    saveSubscriptions(subs);
  }

  res.json({ ok: true });
});

// ---------------- START ----------------

app.listen(PORT, () => {
  console.log(`Backend running on ${PORT}`);
});
