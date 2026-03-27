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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUBS_FILE = path.join(__dirname, "subscriptions.json");
const USERS_FILE = path.join(__dirname, "users.json");

app.use(cors());
app.use(express.json());

// 🔐 VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ---------------- FILE HELPERS ----------------

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------------- HEALTH ----------------

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

// ---------------- SUBSCRIBE ----------------

app.post("/api/subscribe", (req, res) => {
  const { subscription } = req.body;

  const subs = readJSON(SUBS_FILE);

  if (!subs.find((s) => s.endpoint === subscription.endpoint)) {
    subs.push(subscription);
    writeJSON(SUBS_FILE, subs);
  }

  const users = readJSON(USERS_FILE);
  const user = users[0];

  if (user) {
    user.subscription = subscription;
    writeJSON(USERS_FILE, users);
  }

  res.json({ ok: true });
});

// ---------------- TEST ----------------

app.get("/api/test", async (_, res) => {
  const subs = readJSON(SUBS_FILE);

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        sub,
        JSON.stringify({
          title: "Susadım 💧",
          body: "Test bildirimi geldi!",
        })
      )
    )
  );

  console.log("📩 TEST gönderildi");

  res.json({ ok: true });
});

// ---------------- CRON API (UPTIMEROBOT) ----------------

app.get("/api/cron-check", async (_, res) => {
  console.log("🔥 CRON API TETİKLENDİ");

  const users = readJSON(USERS_FILE);
  const subs = readJSON(SUBS_FILE);

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
    title: "Susadım 💧",
    body: `Kalan ${remaining} ml`,
  });

  await Promise.allSettled(
    subs.map((s) => webpush.sendNotification(s, payload))
  );

  console.log("📩 OTOMATİK gönderildi");

  res.json({ ok: true });
});

// ---------------- START ----------------

app.listen(PORT, () => {
  console.log(`🚀 Backend running on ${PORT}`);
});
