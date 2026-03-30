import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets,
  Bell,
  Sparkles,
  GlassWater,
  Palette,
  BarChart3,
  Plus,
  Settings2,
  Download,
  Moon,
  SunMedium,
  Trash2,
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001").trim();
const PUBLIC_VAPID_KEY = (import.meta.env.VITE_PUBLIC_VAPID_KEY || "").trim();

const motivationalMessages = [
  "Harika, vücuduna küçük bir iyilik yaptın.",
  "Bir yudum daha, enerji biraz daha yerini bulsun.",
  "Bugün kendine iyi davranıyorsun.",
  "Su içmek küçük iş gibi görünür, etkisi büyük olur.",
  "Bardağın senden memnun 💧",
  "Güzel gidiyorsun, devam et.",
];

const cookieMessages = [
  "Bugün gösterdiğin küçük özen yarının enerjisini kurar.",
  "Ritmini bozsan da yeniden başlamak her zaman mümkün.",
  "Sen hız değil, istikrar kurdukça güçlenirsin.",
  "İyi hissetmek bazen sadece küçük alışkanlıklarla başlar.",
];

const nudgeMessages = [
  "Heyyy, bugün su içmedin gibi 🙂",
  "Bir bardak su molası iyi gider.",
  "Telefonu açtıysan suyu da hatırla 💧",
  "Hedefin seni bekliyor, küçük bir yudum yeter.",
];

const cupColors = [
  "linear-gradient(180deg, #bae6fd 0%, #38bdf8 100%)",
  "linear-gradient(180deg, #fbcfe8 0%, #f472b6 100%)",
  "linear-gradient(180deg, #a7f3d0 0%, #34d399 100%)",
  "linear-gradient(180deg, #ddd6fe 0%, #8b5cf6 100%)",
];

const quickAmounts = [150, 250, 500];
const STORAGE_KEY = "susadim-pro-state-v1";

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function defaultState() {
  return {
    dailyGoal: 2200,
    consumed: 0,
    cupName: "Benim Bardağım",
    cupColor: cupColors[0],
    notificationsEnabled: true,
    reminderMinutes: 45,
    darkMode: false,
    entries: [],
    history: {},
    streak: 0,
    lastOpenDate: todayKey(),
  };
}

function getInitialState() {
  if (typeof window === "undefined") return defaultState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no state");
    return JSON.parse(raw);
  } catch {
    return defaultState();
  }
}

function urlBase64ToUint8Array(base64String) {
  const cleaned = (base64String || "").trim();
  const padding = "=".repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function Card({ children }) {
  return <div className="card">{children}</div>;
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button className={`tab-btn ${active ? "active" : ""}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ActionButton({ children, secondary = false, ...props }) {
  return (
    <button className={`action-btn ${secondary ? "secondary" : ""}`} {...props}>
      {children}
    </button>
  );
}

function WaterCup({ progress, colorStyle, cupName, darkMode }) {
  return (
    <div className="cup-wrap">
      <div className={`cup ${darkMode ? "dark" : ""}`}>
        <motion.div
          className="water"
          style={{ background: colorStyle }}
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(progress, 4)}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        >
          <motion.div
            className="wave"
            animate={{ x: [0, 6, -4, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
      <motion.div
        className="cup-name"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {cupName}
      </motion.div>
      <div className="cup-shadow" />
    </div>
  );
}

function SplashScreen() {
  return (
    <motion.div
      className="splash-screen"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.45 }}
    >
      <motion.div
        className="splash-mark"
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55 }}
      >
        <div className="brand-badge large">BİK</div>
        <motion.div
          className="splash-drop"
          animate={{ y: [0, -8, 0], scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
        >
          💧
        </motion.div>
        <h1>Susadım</h1>
        <p>Bir yudum kendin için</p>
      </motion.div>
    </motion.div>
  );
}

function FlowerConfetti({ show }) {
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: 8 + ((i * 87) % 84),
    delay: (i % 8) * 0.08,
    duration: 2.2 + (i % 5) * 0.18,
    rotate: -160 + ((i * 27) % 320),
    scale: 0.85 + (i % 4) * 0.12,
  }));

  return (
    <AnimatePresence>
      {show && (
        <div className="confetti-layer" aria-hidden="true">
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              className="flower-piece"
              style={{ left: `${piece.left}%` }}
              initial={{ y: -60, opacity: 0, rotate: 0, scale: 0.4 }}
              animate={{
                y: ["-8vh", "24vh", "52vh", "88vh"],
                opacity: [0, 1, 1, 0],
                rotate: [0, piece.rotate],
                scale: [0.4, piece.scale, piece.scale, 0.7],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: piece.duration,
                delay: piece.delay,
                ease: "easeOut",
              }}
            >
              🌸
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const initial = getInitialState();

  const [tab, setTab] = useState("home");
  const [dailyGoal, setDailyGoal] = useState(initial.dailyGoal);
  const [consumed, setConsumed] = useState(initial.consumed);
  const [message, setMessage] = useState(randomItem(motivationalMessages));
  const [showCookie, setShowCookie] = useState(false);
  const [cookieText, setCookieText] = useState(randomItem(cookieMessages));
  const [cupName, setCupName] = useState(initial.cupName);
  const [cupColor, setCupColor] = useState(initial.cupColor);
  const [notificationsEnabled, setNotificationsEnabled] = useState(initial.notificationsEnabled);
  const [reminderMinutes, setReminderMinutes] = useState(initial.reminderMinutes);
  const [darkMode, setDarkMode] = useState(initial.darkMode);
  const [entries, setEntries] = useState(initial.entries || []);
  const [history, setHistory] = useState(initial.history || {});
  const [streak, setStreak] = useState(initial.streak || 0);
  const [installEvent, setInstallEvent] = useState(null);
  const [permissionState, setPermissionState] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [showSplash, setShowSplash] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pushStatus, setPushStatus] = useState("Hazır");
  const [notificationReady, setNotificationReady] = useState(false);

  const reminderRef = useRef(null);

  const progress = useMemo(
    () => Math.min(100, Math.round((consumed / dailyGoal) * 100)),
    [consumed, dailyGoal]
  );

  const todayEntries = entries.filter((item) => item.date === todayKey());
  const todayCount = todayEntries.length;
  const remaining = Math.max(dailyGoal - consumed, 0);

  const weekData = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      result.push({
        key,
        label: `${d.getDate()}`,
        value: history[key] || (key === todayKey() ? consumed : 0),
      });
    }
    return result;
  }, [history, consumed]);

  function calculateStreak(nextHistory, nextConsumed = consumed) {
    let count = 0;
    for (let i = 0; i < 365; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const value = key === todayKey() ? nextConsumed : nextHistory[key] || 0;
      if (value >= dailyGoal) count += 1;
      else break;
    }
    return count;
  }

  async function updateSettings(nextGoal = dailyGoal, nextReminder = reminderMinutes, nextNotifications = notificationsEnabled) {
    try {
      await fetch(`${API_BASE}/api/update-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "batuhan",
          dailyGoalMl: nextGoal,
          reminderMinutes: nextReminder,
          notificationsEnabled: nextNotifications,
        }),
      });
    } catch (err) {
      console.error("ayar gönderme hatası", err);
    }
  }

  function celebrateGoal() {
    setShowConfetti(true);
    setMessage("Hedef tamam! Kendine bugün gerçekten iyi baktın 🌸");
    window.setTimeout(() => setShowConfetti(false), 3000);
  }

  async function addWater(amount) {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);

    const prevValue = consumed;
    const newValue = consumed + amount;

    const newEntries = [
      ...entries,
      {
        id: Date.now(),
        amount,
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        date,
      },
    ];

    const nextHistory = {
      ...history,
      [date]: newValue,
    };

    setConsumed(newValue);
    setEntries(newEntries);
    setHistory(nextHistory);
    setStreak(calculateStreak(nextHistory, newValue));
    setMessage("Harika! Su içtin 💧");

    if (prevValue < dailyGoal && newValue >= dailyGoal) {
      celebrateGoal();
    }

    if (newValue === amount || newValue >= dailyGoal || Math.random() > 0.55) {
      setCookieText(randomItem(cookieMessages));
      setShowCookie(true);
      window.setTimeout(() => setShowCookie(false), 2800);
    }

    try {
      await fetch(`${API_BASE}/api/drink`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "batuhan",
          amountMl: amount,
        }),
      });
    } catch (err) {
      console.error("Backend hatası:", err);
    }
  }

  async function clearToday() {
    const date = todayKey();
    const filtered = entries.filter((item) => item.date !== date);
    const nextHistory = { ...history, [date]: 0 };

    setEntries(filtered);
    setHistory(nextHistory);
    setConsumed(0);
    setMessage("Bugün yeniden başlayabilirsin.");
    setStreak(calculateStreak(nextHistory, 0));

    try {
      await fetch(`${API_BASE}/api/reset-day`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "batuhan",
          dailyGoalMl: dailyGoal,
        }),
      });
    } catch (err) {
      console.error("reset-day hatası", err);
    }
  }

  async function subscribeToPush() {
    try {
      if (!("serviceWorker" in navigator)) {
        setPushStatus("Bu cihaz Service Worker desteklemiyor");
        alert("Service Worker yok");
        return;
      }

      if (!("PushManager" in window)) {
        setPushStatus("Bu cihaz push desteklemiyor");
        alert("Push desteklenmiyor");
        return;
      }

      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== "granted") {
        setPushStatus("Bildirim izni verilmedi");
        alert("Bildirim izni verilmedi");
        return;
      }

      let registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
      }

      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const keyFromEnv = (PUBLIC_VAPID_KEY || "").trim();

        if (!keyFromEnv) {
          setPushStatus("VAPID key eksik");
          alert("VAPID key eksik");
          return;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyFromEnv),
        });
      }

      const saveRes = await fetch(`${API_BASE}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });

      const result = await saveRes.json();

      if (!saveRes.ok || result.ok !== true) {
        setPushStatus("Backend kayıt hatası");
        alert("Backend kayıt hatası");
        return;
      }

      setNotificationsEnabled(true);
      setNotificationReady(true);
      setPushStatus("Push aktif");
      setMessage("Bildirimler aktif 💧");

      await updateSettings(dailyGoal, reminderMinutes, true);

      alert("Bildirimler başarıyla açıldı 🎉");
    } catch (error) {
      console.error(error);
      setPushStatus("Push kurulamadı");
      alert("HATA: " + error.message);
    }
  }

  async function sendTestPush() {
    try {
      await fetch(`${API_BASE}/api/send-test`);
      setPushStatus("Test bildirimi istendi");
    } catch (error) {
      console.error(error);
      setPushStatus("Test bildirimi başarısız");
    }
  }

  function triggerReminder() {
    setMessage(randomItem(nudgeMessages));
  }

  async function installApp() {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  }

  useEffect(() => {
    const splashTimer = window.setTimeout(() => setShowSplash(false), 1700);
    return () => window.clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    const lastDate = initial.lastOpenDate;
    const nowKey = todayKey();

    if (lastDate !== nowKey) {
      const prevValue = history[lastDate] || consumed || 0;
      const nextHistory = { ...history, [lastDate]: prevValue };
      setHistory(nextHistory);
      setConsumed(nextHistory[nowKey] || 0);
      setEntries((prev) => prev.filter((item) => item.date === nowKey));
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    const payload = {
      dailyGoal,
      consumed,
      cupName,
      cupColor,
      notificationsEnabled,
      reminderMinutes,
      darkMode,
      entries,
      history,
      streak,
      lastOpenDate: todayKey(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    dailyGoal,
    consumed,
    cupName,
    cupColor,
    notificationsEnabled,
    reminderMinutes,
    darkMode,
    entries,
    history,
    streak,
  ]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallEvent(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (reminderRef.current) window.clearInterval(reminderRef.current);
    if (!notificationsEnabled) return;

    reminderRef.current = window.setInterval(() => {
      triggerReminder();
    }, reminderMinutes * 60 * 1000);

    return () => reminderRef.current && window.clearInterval(reminderRef.current);
  }, [notificationsEnabled, reminderMinutes]);

  return (
    <div className={darkMode ? "theme-dark" : ""}>
      <AnimatePresence>{showSplash && <SplashScreen />}</AnimatePresence>
      <FlowerConfetti show={showConfetti} />

      <div className="app-shell">
        <div className="topbar">
          <div>
            <div className="brand-row">
              <div className="brand-badge">BİK</div>
              <h1>Susadım</h1>
            </div>
            <p>Telefon tarayıcısında çalışan su hatırlatıcı ve mini motivasyon uygulaması</p>
          </div>

          <div className="topbar-actions">
            {installEvent && (
              <ActionButton onClick={installApp}>
                <Download size={16} />
                Ana ekrana ekle
              </ActionButton>
            )}

            <ActionButton secondary onClick={() => setDarkMode((v) => !v)}>
              {darkMode ? <SunMedium size={16} /> : <Moon size={16} />}
              {darkMode ? "Açık mod" : "Koyu mod"}
            </ActionButton>

            <div className="streak-box">
              <span>Seri</span>
              <strong>{streak} gün</strong>
            </div>
          </div>
        </div>

        <div className="tabs">
          <TabButton
            active={tab === "home"}
            onClick={() => setTab("home")}
            icon={<GlassWater size={16} />}
            label="Ana Sayfa"
          />
          <TabButton
            active={tab === "design"}
            onClick={() => setTab("design")}
            icon={<Palette size={16} />}
            label="Bardak"
          />
          <TabButton
            active={tab === "stats"}
            onClick={() => setTab("stats")}
            icon={<BarChart3 size={16} />}
            label="İstatistik"
          />
          <TabButton
            active={tab === "settings"}
            onClick={() => setTab("settings")}
            icon={<Settings2 size={16} />}
            label="Ayarlar"
          />
        </div>

        {tab === "home" && (
          <div className="grid-main">
            <Card>
              <div className="home-grid">
                <div>
                  <div className="pill">
                    <Droplets size={16} /> Günlük hedef
                  </div>

                  <h2 className="big-value">
                    {consumed} / {dailyGoal} ml
                  </h2>

                  <p className="muted">Bugünkü ilerlemen %{progress}</p>

                  <div className="progress">
                    <div style={{ width: `${progress}%` }} />
                  </div>

                  <motion.div
                    key={message}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="message-box"
                  >
                    <div className="section-title">
                      <Sparkles size={16} /> Günün mesajı
                    </div>
                    <p>{message}</p>
                  </motion.div>

                  <div className="quick-grid">
                    {quickAmounts.map((amount) => (
                      <ActionButton key={amount} onClick={() => addWater(amount)}>
                        <Plus size={16} /> {amount} ml
                      </ActionButton>
                    ))}
                  </div>

                  <div className="row-actions">
                    <ActionButton secondary onClick={triggerReminder}>
                      <Bell size={16} /> Şimdi hatırlat
                    </ActionButton>
                    <ActionButton secondary onClick={clearToday}>
                      <Trash2 size={16} /> Bugünü sıfırla
                    </ActionButton>
                  </div>
                </div>

                <div className="cup-panel">
                  <WaterCup
                    progress={progress}
                    colorStyle={cupColor}
                    cupName={cupName}
                    darkMode={darkMode}
                  />

                  <AnimatePresence>
                    {showCookie && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="cookie-box"
                      >
                        <div className="cookie-title">🥠 Şans kurabiyesi</div>
                        <p>{cookieText}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </Card>

            <div className="side-stack">
              <Card>
                <div className="section-title">
                  <Bell size={18} /> Pro push durumu
                </div>

                <div className="soft-box">Durum: {pushStatus}</div>

                <div className="row-actions">
                  <ActionButton onClick={subscribeToPush}>Bildirimleri gerçekten aç</ActionButton>
                  <ActionButton secondary onClick={sendTestPush}>Test push gönder</ActionButton>
                </div>

                <p className="muted preview-note">
                  iPhone tarafında tam çalışması için Safari’den Ana Ekrana Ekle yapman gerekir.
                </p>
              </Card>

              <Card>
                <div className="mini-stats">
                  <div>
                    <span>Bugün kalan</span>
                    <strong>{remaining} ml</strong>
                  </div>
                  <div>
                    <span>Bugünkü giriş sayısı</span>
                    <strong>{todayCount}</strong>
                  </div>
                </div>

                <p className="muted">
                  Gerçek push bu sürümde backend ile gelir. Site kapalıyken bile bildirime uygun altyapı bununla kurulur.
                </p>
              </Card>
            </div>
          </div>
        )}

        {tab === "design" && (
          <div className="grid-main design-grid">
            <Card>
              <WaterCup progress={65} colorStyle={cupColor} cupName={cupName} darkMode={darkMode} />
            </Card>

            <Card>
              <div className="field">
                <label>Bardak adı</label>
                <input
                  value={cupName}
                  onChange={(e) => setCupName(e.target.value)}
                  placeholder="Benim Bardağım"
                />
              </div>

              <div className="field">
                <label>Renk seç</label>
                <div className="color-grid">
                  {cupColors.map((c) => (
                    <button
                      key={c}
                      className={`color-btn ${cupColor === c ? "selected" : ""}`}
                      style={{ background: c }}
                      onClick={() => setCupColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="soft-box">
                İlk sürüm web uygulaması için hazır bardak kombinasyonları var. Sonraki sürümde sticker, pipet, kapak ve tema mağazası eklenir.
              </div>
            </Card>
          </div>
        )}

        {tab === "stats" && (
          <div className="grid-main stats-grid">
            <Card>
              <h3>Son 7 gün</h3>
              <div className="chart">
                {weekData.map((item) => {
                  const height = Math.max(16, Math.min(100, Math.round((item.value / dailyGoal) * 100)));
                  return (
                    <div key={item.key} className="bar-col">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        className="bar"
                      />
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h3>Bugünkü kayıtlar</h3>
              <div className="list-stack">
                {todayEntries.length === 0 && (
                  <div className="soft-box">Henüz kayıt yok. İlk bardağı ekle.</div>
                )}
                {todayEntries
                  .slice()
                  .reverse()
                  .map((item) => (
                    <div key={item.id} className="row-item">
                      <span>{item.amount} ml</span>
                      <span>{item.time}</span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        )}

        {tab === "settings" && (
          <div className="grid-main settings-grid">
            <Card>
              <div className="field">
                <label>Günlük hedef</label>
                <input
                  type="range"
                  min="1000"
                  max="4000"
                  step="100"
                  value={dailyGoal}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setDailyGoal(value);
                    updateSettings(value, reminderMinutes, notificationsEnabled);
                  }}
                />
                <div className="muted">{dailyGoal} ml</div>
              </div>

              <div className="field">
                <label>Hatırlatma aralığı</label>
                <input
                  type="range"
                  min="1"
                  max="240"
                  step="1"
                  value={reminderMinutes}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setReminderMinutes(value);
                    updateSettings(dailyGoal, value, notificationsEnabled);
                  }}
                />
                <div className="muted">Her {reminderMinutes} dakikada bir</div>
              </div>

              <div className="row-item">
                <div>
                  <strong>Bildirimler</strong>
                  <div className="muted">Gerçek push + tarayıcı hatırlatması</div>
                </div>

                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setNotificationsEnabled(checked);
                      updateSettings(dailyGoal, reminderMinutes, checked);
                    }}
                  />
                  <span />
                </label>
              </div>

              <div className="row-actions">
                <ActionButton onClick={subscribeToPush}>Push aboneliği aç</ActionButton>
                <div className="soft-box">Durum: {permissionState}</div>
              </div>
            </Card>

            <Card>
              <h3>Bu sürümde neler var</h3>
              <ul className="feature-list">
                <li>Gerçek web push altyapısına hazır ön yüz</li>
                <li>Service worker ile bildirim gösterimi</li>
                <li>Push aboneliği oluşturma</li>
                <li>Test push butonu</li>
                <li>Kısa splash açılış ekranı</li>
                <li>Hedef dolunca pembe çiçek konfeti</li>
              </ul>
              <div className="soft-box">
                Bu ön yüzün yanında backend'i Render tarafına koyman gerekir.
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
