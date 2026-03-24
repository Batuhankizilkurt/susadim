# Susadım Pro Push

Bu paket iki parçadan oluşur:

## 1) frontend
Netlify'ye koyacağın PWA ön yüz.

## 2) backend
Render / Railway / Vercel serverless tarafına koyacağın push servisi.

## Kurulum sırası

### Backend
```bash
cd backend
npm install
npm run generate-vapid
```

Üretilen public/private key'leri `.env` dosyana koy.

Sonra:
```bash
npm run dev
```

### Frontend
```bash
cd frontend
npm install
```

`.env` oluştur:
```bash
VITE_API_BASE_URL=http://localhost:3001
VITE_PUBLIC_VAPID_KEY=backend tarafında üretilen public key
```

Sonra:
```bash
npm run dev
```

## Netlify
Frontend klasörünü deploy et.
Build command: `npm run build`
Publish directory: `dist`

## Render / Railway
Backend klasörünü deploy et.
Start command: `npm start`

## iPhone'da tam çalışması için
- Safari ile siteyi aç
- **Ana Ekrana Ekle**
- açılan uygulama içinden push izni ver
- sonra test bildirimi gönder

## Not
Zamanlanmış otomatik push için backend tarafında cron/job eklemen gerekir.
Bunun için `/api/send-reminder` endpoint'i hazır.
