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

webpush.setVapidDetails(
  (process.env.VAPID_SUBJECT || "").trim(),
  (process.env.VAPID_PUBLIC_KEY || "").trim(),
  (process.env.VAPID_PRIVATE_KEY || "").trim()
);

// ---------------- SUBS ----------------

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

app.get("/api/vapid-public-key", (_, res) => {
  res.json({ publicKey: (process.env.VAPID_PUBLIC_KEY || "").trim() });
});

app.get("/api/debug-subs", (_, res) => {
  const subs = readSubscriptions();
  res.json({
    count: subs.length,
    endpoints: subs.map((s) => s.endpoint),
  });
});

// 🔥 SUBSCRIBE
app.post("/api/subscribe", (req, res) => {
  const { subscription } = req.body || {};

  if (!subscription?.endpoint) {
    return res.status(400).json({ ok: false });
  }

  const subs = readSubscriptions();

  if (!subs.find((s) => s.endpoint === subscription.endpoint)) {
    subs.push(subscription);
    saveSubscriptions(subs);
  }

  const users = readUsers();
  if (users.length > 0) {
    users[0].subscription = subscription;
    saveUsers(users);
  }

  res.json({ ok: true });
});

// 🔥 DRINK
app.post("/api/drink", (req, res) => {
  const { userId, amountMl } = req.body || {};

  const users = readUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) return res.status(404).json({ ok: false });

  user.todayConsumedMl =
    (user.todayConsumedMl || 0) + Number(amountMl || 0);

  user.lastDrinkAt = new Date().toISOString();

  saveUsers(users);

  res.json({ ok: true });
});

// 🔥 TEST PUSH (GET + POST)
app.get("/api/send-test", async (_, res) => {
  const subs = readSubscriptions();

  if (!subs.length) {
    return res.status(400).json({ ok: false });
  }

  const payload = JSON.stringify({
    title: "Susadım",
    body: "Test bildirimi 💧",
    url: "/",
  });

  await Promise.allSettled(
    subs.map((s) => webpush.sendNotification(s, payload))
  );

  res.json({ ok: true });
});

app.post("/api/send-test", async (_, res) => {
  const subs = readSubscriptions();

  if (!subs.length) {
    return res.status(400).json({ ok: false });
  }

  const payload = JSON.stringify({
    title: "Susadım",
    body: "Test bildirimi 💧",
    url: "/",
  });

  await Promise.allSettled(
    subs.map((s) => webpush.sendNotification(s, payload))
  );

  res.json({ ok: true });
});

// ---------------- START ----------------
app.get("/api/cron-check", async (_, res) => {
  console.log("🔥 CRON API TETİKLENDİ");

  const users = readUsers();
  const subs = readSubscriptions();

  if (!users.length || !subs.length) {
    return res.json({ ok: false });
  }

  const user = users[0];

  if (!user.notificationsEnabled) {
    return res.json({ ok: false });
  }

  if (user.todayConsumedMl >= user.dailyGoalMl) {
    return res.json({ ok: false });
  }

  const remaining = user.dailyGoalMl - user.todayConsumedMl;

  const payload = JSON.stringify({
    title: "Susadım",
    body: `Kalan ${remaining} ml 💧`,
    url: "/",
  });

  await Promise.allSettled(
    subs.map((s) => webpush.sendNotification(s, payload))
  );

  console.log("📩 API bildirim gönderdi");

  res.json({ ok: true });
});
app.listen(PORT, () => {
  console.log(`Server running ${PORT}`);
});

// ---------------- CRON ----------------

// 🔥 HER DAKİKA ÇALIŞIR
cron.schedule("* * * * *", async () => {
  console.log("⏰ CRON ÇALIŞTI");

  const users = readUsers();
  const subs = readSubscriptions();

  if (!users.length || !subs.length) return;

  const user = users[0];

  if (!user.notificationsEnabled) return;
  if (user.todayConsumedMl >= user.dailyGoalMl) return;

  const remaining = user.dailyGoalMl - user.todayConsumedMl;

  const payload = JSON.stringify({
    title: "Susadım",
    body: `Kalan ${remaining} ml 💧`,
    url: "/",
  });

  await Promise.allSettled(
    subs.map((s) => webpush.sendNotification(s, payload))
  );

  console.log("📩 CRON GÖNDERDİ");
});
