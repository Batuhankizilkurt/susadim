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

app.use(cors({ origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN }));
app.use(express.json());

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
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
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
}

// ---------------- USERS ----------------

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "users.json"), "utf8"));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(
    path.join(__dirname, "users.json"),
    JSON.stringify(users, null, 2)
  );
}

// ---------------- API ----------------

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});
app.get("/api/send-test", async (_, res) => {
  const users = readUsers();

  for (const user of users) {
    if (!user.subscription) continue;

    await webpush.sendNotification(
      user.subscription,
      JSON.stringify({
        title: "Susadım",
        body: "Test bildirimi 💧",
      })
    );
  }

  res.json({ ok: true });
});

app.post("/api/subscribe", (req, res) => {
  const { subscription } = req.body;
  const subs = readSubscriptions();

  if (!subs.find(s => s.endpoint === subscription.endpoint)) {
    subs.push(subscription);
    saveSubscriptions(subs);
  }

  // subscription'ı user'a bağla
  const users = readUsers();
  const user = users[0]; // şimdilik tek user
  user.subscription = subscription;
  saveUsers(users);

  res.json({ ok: true });
});

// 🔥 YENİ EKLEDİĞİMİZ KISIM
app.post("/api/drink", (req, res) => {
  const { userId, amountMl } = req.body;

  const users = readUsers();
  const user = users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ ok: false });

  user.todayConsumedMl += amountMl;
  user.lastDrinkAt = new Date().toISOString();

  saveUsers(users);

  res.json({ ok: true });
});

// test push
app.post("/api/send-test", async (_, res) => {
  const users = readUsers();

  for (const user of users) {
    if (!user.subscription) continue;

    await webpush.sendNotification(
      user.subscription,
      JSON.stringify({
        title: "Susadım",
        body: "Test bildirimi 💧",
      })
    );
  }

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

cron.schedule("*/30 * * * *", async () => {
  console.log("⏰ kontrol çalıştı");

  const users = readUsers();

  for (const user of users) {
    if (!user.notificationsEnabled) continue;
    if (!user.subscription) continue;

    // hedef tamam mı?
    if (user.todayConsumedMl >= user.dailyGoalMl) continue;

    // son 45 dk içinde içti mi?
    if (user.lastDrinkAt) {
      const diff = (Date.now() - new Date(user.lastDrinkAt)) / 1000 / 60;
      if (diff < 45) continue;
    
    }

    const remaining = user.dailyGoalMl - user.todayConsumedMl;
    const cups = Math.ceil(remaining / user.defaultCupMl);

    const message = {
      title: "Susadım",
      body:
        remaining <= user.defaultCupMl
          ? "Son bardağa kaldı 🌸"
          : `Yaklaşık ${cups} bardak kaldı 💧`,
    };

    try {
      await webpush.sendNotification(
        user.subscription,
        JSON.stringify(message)
      );
      console.log("📩 bildirim gitti");
    } catch (err) {
      console.error("push hata:", err);
    }
  }
});
