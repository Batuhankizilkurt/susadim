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

const reminderMessages = [
  "Bir bardak su iyi gider 💧",
  "Hedefin seni bekliyor, küçük bir yudum yeter.",
  "Telefonu açtıysan suyu da hatırla 💙",
  "Susadım diyor olabilirsin, su molası zamanı.",
  "Biraz su iç, iyi gelecek 🌸",
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readJSON(file, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function readSubscriptions() {
  return readJSON(SUBS_FILE, []);
}

function saveSubscriptions(subs) {
  writeJSON(SUBS_FILE, subs);
}

function readUsers() {
  return readJSON(USERS_FILE, []);
}

function saveUsers(users) {
  writeJSON(USERS_FILE, users);
}

function minutesSince(dateString) {
  if (!dateString) return Number.POSITIVE_INFINITY;
  const diffMs = Date.now() - new Date(dateString).getTime();
  return diffMs / 1000 / 60;
}

async function sendPushToAll(payloadObj) {
  const subs = readSubscriptions();

  if (!subs.length) {
    return { ok: false, sent: 0, removed: 0 };
  }

  const payload = JSON.stringify(payloadObj);

  const results = await Promise.allSettled(
    subs.map((sub) => webpush.sendNotification(sub, payload))
  );

  const failedEndpoints = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      failedEndpoints.push(subs[index].endpoint);
      console.error("push hata:", result.reason);
    }
  });

  if (failedEndpoints.length) {
    const filtered = subs.filter(
      (sub) => !failedEndpoints.includes(sub.endpoint)
    );
    saveSubscriptions(filtered);
  }

  return {
    ok: true,
    sent: subs.length - failedEndpoints.length,
    removed: failedEndpoints.length,
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/version", (_req, res) => {
  res.json({ version: "batuhan-cron-v1" });
});

app.get("/api/vapid-public-key", (_req, res) => {
  res.json({ publicKey: (process.env.VAPID_PUBLIC_KEY || "").trim() });
});

app.get("/api/debug-subs", (_req, res) => {
  const subs = readSubscriptions();
  res.json({
    count: subs.length,
    endpoints: subs.map((s) => s.endpoint),
  });
});

app.post("/api/subscribe", (req, res) => {
  const { subscription } = req.body || {};

  if (!subscription?.endpoint) {
    return res.status(400).json({ ok: false, message: "subscription eksik" });
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

app.post("/api/drink", (req, res) => {
  const { userId, amountMl } = req.body || {};

  const users = readUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ ok: false, message: "kullanıcı bulunamadı" });
  }

  user.todayConsumedMl = (user.todayConsumedMl || 0) + Number(amountMl || 0);
  user.lastDrinkAt = new Date().toISOString();

  saveUsers(users);

  res.json({
    ok: true,
    todayConsumedMl: user.todayConsumedMl,
  });
});

app.post("/api/update-settings", (req, res) => {
  const { userId, dailyGoalMl, reminderMinutes, notificationsEnabled } =
    req.body || {};

  const users = readUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ ok: false, message: "kullanıcı bulunamadı" });
  }

  if (dailyGoalMl !== undefined) {
    user.dailyGoalMl = Number(dailyGoalMl);
  }

  if (reminderMinutes !== undefined) {
    user.reminderMinutes = Number(reminderMinutes);
  }

  if (notificationsEnabled !== undefined) {
    user.notificationsEnabled = Boolean(notificationsEnabled);
  }

  saveUsers(users);

  res.json({ ok: true, user });
});

app.post("/api/reset-day", (req, res) => {
  const { userId, dailyGoalMl } = req.body || {};

  const users = readUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ ok: false, message: "kullanıcı bulunamadı" });
  }

  user.todayConsumedMl = 0;
  user.lastDrinkAt = null;
  user.lastResetDate = todayKey();

  if (dailyGoalMl != null) {
    user.dailyGoalMl = Number(dailyGoalMl);
  }

  saveUsers(users);

  res.json({ ok: true, user });
});

app.get("/api/send-test", async (_req, res) => {
  const result = await sendPushToAll({
    title: "Susadım 💧",
    body: "Test bildirimi geldi!",
    url: "/",
  });

  if (!result.ok) {
    return res
      .status(400)
      .json({ ok: false, message: "kayıtlı subscription yok" });
  }

  res.json(result);
});

app.get("/api/cron-check", async (_req, res) => {
  console.log("🔥 cron-check tetiklendi");

  const users = readUsers();
  if (!users.length) {
    return res.json({ ok: false, reason: "user yok" });
  }

  const user = users[0];
  const today = todayKey();

  if (user.lastResetDate !== today) {
    console.log("🆕 yeni gün, reset atıldı");
    user.todayConsumedMl = 0;
    user.lastDrinkAt = null;
    user.lastResetDate = today;
    saveUsers(users);
  }

  if (!user.notificationsEnabled) {
    return res.json({ ok: false, reason: "notifications kapalı" });
  }

  if ((user.todayConsumedMl || 0) >= (user.dailyGoalMl || 0)) {
    return res.json({ ok: false, reason: "hedef tamam" });
  }

  const mins = minutesSince(user.lastDrinkAt);

  if (mins < (user.reminderMinutes || 1)) {
    return res.json({
      ok: false,
      reason: `${user.reminderMinutes || 45} dk dolmadı`,
      minutesSinceLastDrink: mins,
    });
  }

  const remaining = (user.dailyGoalMl || 0) - (user.todayConsumedMl || 0);

  const body =
    remaining <= (user.defaultCupMl || 250)
      ? "Son bardağa kaldı 🌸"
      : `${randomItem(reminderMessages)} Kalan ${remaining} ml.`;

  const result = await sendPushToAll({
    title: "Susadım 💧",
    body,
    url: "/",
  });

  console.log("📩 otomatik bildirim sonucu:", result);

  res.json({
    ok: true,
    sent: result.sent,
    removed: result.removed,
    remaining,
    minutesSinceLastDrink: mins,
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
