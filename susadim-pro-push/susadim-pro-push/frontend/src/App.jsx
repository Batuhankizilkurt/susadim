import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function urlBase64ToUint8Array(base64String) {
  const cleaned = (base64String || "").trim();
  const padding = "=".repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function App() {
  const [permissionState, setPermissionState] = useState(Notification.permission);

  const subscribeToPush = async () => {
    try {
      if (!("serviceWorker" in navigator)) {
        alert("Service Worker yok");
        return;
      }

      if (!("PushManager" in window)) {
        alert("Push desteklenmiyor");
        return;
      }

      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== "granted") {
        alert("İzin verilmedi");
        return;
      }

      let registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
      }

      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const res = await fetch(`${API_BASE}/api/vapid-public-key`);
        const data = await res.json();

        const cleanKey = (data.publicKey || "").trim();

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(cleanKey),
        });
      }

      await fetch(`${API_BASE}/api/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription }),
      });

      alert("Bildirimler aktif 💧");
    } catch (err) {
      console.error(err);
      alert("HATA: " + err.message);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Susadım 💧</h1>
      <p>Durum: {permissionState}</p>

      <button onClick={subscribeToPush}>
        Bildirimleri aç
      </button>
    </div>
  );
}
