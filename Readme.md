<div align="center">

# 🎬 Media Compressor

### Professional Social Media Video, Image & Audio Studio

**Compress · Edit · Optimize — 100% FREE, no limits, no watermarks**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

[![Deploy to Render](https://img.shields.io/badge/Deploy%20Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)
[![Deploy to Vercel](https://img.shields.io/badge/Deploy%20Frontend-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com)

> Instagram Reels · TikTok · YouTube Shorts · Facebook · X/Twitter · and more

</div>

---

## 📖 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [🎯 Project Overview](#-project-overview)
- [🏗️ System Architecture](#️-system-architecture)
- [🛠️ Complete Tech Stack](#️-complete-tech-stack)
- [📱 Features Matrix](#-features-matrix)
- [🔧 Backend Setup & Installation](#-backend-setup--installation)
- [🎨 Frontend Setup & Installation](#-frontend-setup--installation)
- [🗄️ Database Setup](#️-database-setup)
- [☁️ Cloudinary Storage Setup](#️-cloudinary-storage-setup)
- [🔐 Authentication Setup](#-authentication-setup)
- [🚀 Production Deployment](#-production-deployment)
- [📡 Complete API Reference](#-complete-api-reference)
- [💾 Database Schema](#-database-schema)
- [🎨 UI/UX Design System](#-uiux-design-system)
- [⚙️ Configuration Reference](#️-configuration-reference)
- [🧪 Testing](#-testing)
- [📊 Monitoring & Analytics](#-monitoring--analytics)
- [🔒 Security](#-security)
- [📈 Performance Optimization](#-performance-optimization)
- [🗂️ Project Structure](#️-project-structure)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🚀 Quick Start

**Get running in under 5 minutes:**

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/media-compressor.git
cd media-compressor

# 2. Backend setup
python -m venv venv
.\venv\Scripts\activate      # Windows
# source venv/bin/activate   # macOS / Linux
pip install -r backend/requirements.txt

# 3. Start backend (port 8001)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001 --reload

# 4. Frontend setup (new terminal)
cd web
npm install

# create web/.env.local
echo "VITE_API_BASE=http://localhost:8001" > .env.local
echo "VITE_GOOGLE_CLIENT_ID=your_client_id" >> .env.local

npm run dev
```

**Open your browser:**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8001 |
| Interactive Docs | http://localhost:8001/docs |
| ReDoc | http://localhost:8001/redoc |

**Production deploy (10 minutes):**

```
Backend  → Render.com   (FREE web service)
Frontend → Vercel.com   (FREE static hosting)
Database → Render PostgreSQL  (FREE 1 GB)
Storage  → Cloudinary   (FREE 25 GB)
```

---

## 🎯 Project Overview

**Media Compressor** is a production-grade social media optimization studio. Upload any video, image, or audio file and compress it to the exact dimensions, bitrate, and format demanded by every major platform — without paying for Clideo, VEED.io, or Adobe Express.

### 🎬 Core Capabilities

```
MULTI-FILE PROCESSING
├── 📹 Video  — MP4, MOV, AVI → H.264 / H.265 / AV1 (9:16, 1:1, 16:9, 4:5)
├── 🖼️  Image  — JPG, PNG, WEBP → WebP / JPEG (Profile, Post, Story sizes)
└── 🎵 Audio  — MP3, WAV, AAC → MP3 / Opus (Social, Podcast)

EDITING PIPELINE
├── ✂️  Crop      — Preset aspect ratios + interactive region
├── ↺  Rotate    — 90° / 180° / 270° + Auto-fix phone orientation
├── 🔄 Flip      — Horizontal + Vertical mirror
├── 🎞️  Trim      — Precise start/end cutpoints (seconds)
├── 🔇 Audio     — Remove, normalize loudness, trim silence
├── 💧 Watermark — Text or logo, 5 position options
└── 🤖 AI Layout — Face/object-aware smart crop (MediaPipe + YOLOv8)

USER FEATURES
├── 👤 Accounts  — Email/password + Google Sign-In
├── 📜 History   — Full compression history per user
├── 📦 ZIP       — Batch download multiple outputs
├── 📊 Stats     — File size savings percentage
└── 🎯 Presets   — Save & reuse favourite settings
```

### 🎨 User Experience

- **5-Step Wizard** — Upload → Platform → Edit → Quality → Compress
- **Glassmorphism UI** — Dark/light mode, vibrant CSS animations
- **Real-time Progress** — Live progress bar with stage label
- **Safe-area Preview** — Visual crop guides with canvas overlay
- **Mobile-first** — Fully responsive on phones and tablets

### 📊 Platform Support

| Platform | Format | Resolution | FPS | Max Size |
|----------|--------|-----------|-----|----------|
| Instagram Reels | MP4 H.264 | 1080×1920 | 30 | 650 MB |
| TikTok | MP4 H.264 | 1080×1920 | 30 | 287 MB |
| YouTube Shorts | MP4 H.264 | 1080×1920 | 60 | No limit |
| Instagram Post | MP4 / JPEG | 1080×1080 | 30 | 100 MB |
| Instagram Story | MP4 H.264 | 1080×1920 | 30 | 4 GB |
| Facebook Reel | MP4 H.264 | 1080×1920 | 30 | 4 GB |
| X / Twitter | MP4 H.264 | 1280×720 | 40 | 512 MB |
| LinkedIn | MP4 H.264 | 1920×1080 | 30 | 5 GB |

---

## 🏗️ System Architecture

```
┌────────────────────────────┐     ┌──────────────────────────────┐
│    Vercel  (Frontend)      │◄───►│   Render  (FastAPI Backend)  │
│    React + TypeScript      │     │   Python · FFmpeg · Pillow   │
│    http://your.vercel.app  │     │   http://your.onrender.com   │
└────────────┬───────────────┘     └────────────┬─────────────────┘
             │  REST + multipart                 │
             │                       ┌───────────┴───────────┐
             │                       │                       │
             ▼                       ▼                       ▼
┌────────────────────┐  ┌────────────────────┐  ┌──────────────────────┐
│  Cloudinary CDN    │  │  Render PostgreSQL │  │  Local Disk (dev)    │
│  25 GB Free        │  │  1 GB Free         │  │  uploads/ processed/ │
│  uploads/          │  │  Users, Jobs,      │  │  SQLite dev.db       │
│  processed/        │  │  Presets           │  │                      │
└────────────────────┘  └────────────────────┘  └──────────────────────┘
```

### 🧩 Request Data Flow

```
1.  User drags file         →  UploadScreen (React)
2.  POST /upload            →  FastAPI streams 1 MB chunks → disk/Cloudinary
3.  Thumbnail + metadata    →  UI runs generateThumbnail() + /analyze concurrently
4.  User picks platform     →  GET /presets → platform JSON
5.  POST /layout-strategy   →  MediaPipe/YOLOv8 → smart crop region
6.  User edits              →  POST /jobs/preview-edit → 5s FFmpeg preview
7.  POST /jobs              →  background thread → FFmpeg/Pillow encoding
8.  Frontend polls          →  GET /jobs/{id} every 1.5s → progress 0→1
9.  Status = done           →  GET /download/{filename} → save to disk
10. Optional ZIP            →  POST /download/zip → archive multiple outputs
```

### 🧱 Backend Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `main.py` | FastAPI app — all 20 route definitions, CORS, startup |
| `models.py` | Pydantic v2 request/response models |
| `encoding.py` | FFmpeg subprocess management, Pillow image ops, edit filter pipeline |
| `jobs.py` | SQLAlchemy job CRUD, background thread orchestration |
| `layout.py` | Smart crop region calc, safe-area hint generation |
| `detection.py` | MediaPipe face mesh + YOLOv8 object detection |
| `storage.py` | File path management, Cloudinary upload/download |
| `auth.py` | JWT encode/decode, bcrypt hashing, Google token verification |
| `database.py` | SQLAlchemy engine, ORM models, session factory |
| `schemas.py` | Platform preset JSON loader from `presets/` directory |

---

## 🛠️ Complete Tech Stack

### Backend

| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | ≥0.109 | REST API framework |
| `uvicorn[standard]` | ≥0.27 | ASGI server |
| `pydantic` | ≥2.6 | Request/response validation |
| `python-multipart` | ≥0.0.9 | Multipart file upload |
| `sqlalchemy` | ≥2.0 | ORM (SQLite dev / PostgreSQL prod) |
| `psycopg2-binary` | ≥2.9 | PostgreSQL driver |
| `python-jose[cryptography]` | ≥3.3 | JWT signing |
| `bcrypt` | ≥4.0 | Password hashing |
| `passlib[bcrypt]` | ≥1.7 | bcrypt wrapper |
| `google-auth` | ≥2.28 | Verify Google ID tokens |
| `pillow` | ≥10.2 | Image resize/compress/convert |
| `mediapipe` | ≥0.10 | Face mesh for smart crop |
| `ultralytics` | ≥8.3 | YOLOv8 object detection |
| `opencv-python-headless` | ≥4.9 | Frame extraction |
| `cloudinary` | ≥1.40 | Cloud file storage |
| `python-dotenv` | ≥1.0 | `.env` file loading |
| `numpy` | ≥1.26 | Numerical ops |
| `python-magic` / `python-magic-bin` | — | MIME detection |

**System dependency:** FFmpeg must be installed and on `PATH`.

### Frontend

| Package | Purpose |
|---------|---------|
| `react` 18 | UI framework |
| `react-dom` 18 | DOM renderer |
| `typescript` 5 | Static typing |
| `vite` | Build tool + dev server |
| `axios` | HTTP client (timeout=0, no size limit) |
| `@react-oauth/google` | Google Sign-In button |

### Infrastructure

| Service | Use | Free Tier |
|---------|-----|-----------|
| Render | Backend hosting | 512 MB RAM, 0.1 CPU |
| Vercel | Frontend hosting | 100 GB bandwidth |
| Render PostgreSQL | Production database | 1 GB storage |
| Cloudinary | File storage CDN | 25 GB storage |
| SQLite | Local dev database | Unlimited |

---

## 📱 Features Matrix

| Feature | Backend | Frontend | Video | Image | Audio |
|---------|---------|----------|-------|-------|-------|
| Chunked upload (1 MB) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Concurrent thumbnail + upload | — | ✅ | ✅ | ✅ | ✅ |
| Platform presets | ✅ | ✅ | ✅ | ✅ | ✅ |
| Smart crop (AI face/object) | ✅ | ✅ | ✅ | ✅ | — |
| Crop to aspect ratio | ✅ | ✅ | ✅ | ✅ | — |
| Rotate 90/180/270° | ✅ | ✅ | ✅ | ✅ | — |
| Flip horizontal/vertical | ✅ | ✅ | ✅ | ✅ | — |
| Auto-fix EXIF orientation | ✅ | ✅ | ✅ | ✅ | — |
| 5-second edit preview | ✅ | ✅ | ✅ | — | — |
| Trim start/end | ✅ | ✅ | ✅ | — | ✅ |
| Remove audio | ✅ | ✅ | ✅ | — | — |
| Normalize loudness | ✅ | ✅ | ✅ | — | ✅ |
| Trim silence | ✅ | ✅ | — | — | ✅ |
| Extract audio only | ✅ | ✅ | ✅ | — | — |
| Text watermark | ✅ | ✅ | ✅ | ✅ | — |
| Logo watermark | ✅ | ✅ | ✅ | ✅ | — |
| Quality presets (3 tiers) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Real-time progress | ✅ | ✅ | ✅ | ✅ | ✅ |
| Email/password auth | ✅ | ✅ | ✅ | ✅ | ✅ |
| Google OAuth | ✅ | ✅ | ✅ | ✅ | ✅ |
| Compression history | ✅ | ✅ | ✅ | ✅ | ✅ |
| Batch ZIP download | ✅ | ✅ | ✅ | ✅ | ✅ |
| Saved user presets | ✅ | ✅ | ✅ | ✅ | ✅ |
| Platform suggestion (AI) | ✅ | ✅ | ✅ | ✅ | — |

---

## 🔧 Backend Setup & Installation

### Prerequisites

Ensure the following are installed on your system:

**Python 3.11+**
```bash
python --version   # should print 3.11.x or higher
```

**FFmpeg** (required for video/audio processing)
```bash
# Windows
winget install ffmpeg
# or download from https://ffmpeg.org/download.html and add bin/ to PATH

# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt update && sudo apt install ffmpeg

# Verify
ffmpeg -version
```

**Node.js 20+** (for frontend)
```bash
node --version   # should print v20.x or higher
```

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/yourusername/media-compressor.git
cd media-compressor
```

### Step 2 — Create Python Virtual Environment

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3.11 -m venv venv
source venv/bin/activate
```

### Step 3 — Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r backend/requirements.txt
```

> **Windows-specific:** `requirements.txt` uses `python-magic-bin` on Windows.
> On macOS/Linux it uses `python-magic`. Both are already in `requirements.txt`
> with conditional comments — no changes needed.

> **ML libraries note:** `mediapipe`, `ultralytics`, and `opencv-python-headless`
> are large (~2 GB total). If you do not need AI smart-crop, comment them out.
> The app degrades gracefully to center-crop when they are absent.

### Step 4 — Configure Environment Variables

Create a `.env` file in the project root (or `backend/.env`):

```env
# Required for Google login
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com

# Required in production (auto-generated by Render otherwise)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars

# Production database (leave blank for local SQLite dev.db)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Optional — Cloudinary file storage (local disk used if blank)
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

# CORS allowed origin for your frontend
ALLOWED_ORIGIN=https://your-app.vercel.app
```

**Generate a secure JWT secret:**
```bash
# Windows PowerShell
-join ((65..90)+(97..122)+(48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# macOS/Linux
openssl rand -hex 32
```

### Step 5 — Start the Development Server

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001 --reload
```

**Verify it works:**
```
http://localhost:8001           → {"status": "ok"}
http://localhost:8001/docs      → Swagger UI (all 20 endpoints)
http://localhost:8001/redoc     → ReDoc reference
```

### Step 6 — Verify All Routes Load

```bash
python -c "from backend.main import app; print('Routes:', len(app.routes))"
# Should print: Routes: 24 (20 API + 4 internal)
```

---

## 🎨 Frontend Setup & Installation

### Step 1 — Install Node Dependencies

```bash
cd web
npm install
```

### Step 2 — Create Environment File

Create `web/.env.local`:

```env
VITE_API_BASE=http://localhost:8001
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

> `.env.local` is git-ignored. Never commit your Client ID to a public repo,
> though it is technically a public identifier.

### Step 3 — Start Development Server

```bash
npm run dev
# Vite dev server → http://localhost:5173
```

### Step 4 — Build for Production

```bash
npm run build
# Output in web/dist/
npm run preview   # preview production bundle locally
```

### Step 5 — Type Check

```bash
npm run tsc       # TypeScript type check (no output = no errors)
```

---

## 🗄️ Database Setup

### Local Development (SQLite — Zero Config)

SQLite is used automatically in local development with no setup required.
The database file `dev.db` is created at the project root on first backend start.

```bash
# The file is created automatically:
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001 --reload
# → creates dev.db in project root
```

### Production — Render PostgreSQL

1. **Render Dashboard** → **New** → **PostgreSQL**
2. Name: `media-compressor-db` | Plan: **Free**
3. After creation, copy the **Internal Database URL**
4. Set `DATABASE_URL` in your backend environment variables on Render

The `render.yaml` already declares the database and links it automatically:

```yaml
databases:
  - name: media-compressor-db
    databaseName: media_compressor
    plan: free
```

### Local PostgreSQL (Optional)

```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Ubuntu
sudo apt install postgresql postgresql-contrib
sudo service postgresql start

# Create database
createdb media_compressor
# or via psql:
psql -U postgres -c "CREATE DATABASE media_compressor;"
```

```env
# backend/.env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/media_compressor
```

---

## ☁️ Cloudinary Storage Setup

Cloudinary is **optional** — the app works perfectly with local disk storage
during development. In production, Cloudinary prevents files from being lost
on Render redeployments (Render has ephemeral storage).

### Step 1 — Create Free Account

```
https://cloudinary.com → Sign Up (FREE 25 GB)
```

### Step 2 — Get Credentials

```
Dashboard → Account Details:
  Cloud Name: your-cloud-name
  API Key:    123456789012345
  API Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3 — Set Environment Variable

```env
CLOUDINARY_URL=cloudinary://123456789012345:xxxxxxxxxxxxxxxxxxxxxxxxxxx@your-cloud-name
```

### Step 4 — Folder Structure (Auto-Created)

```
cloudinary://your-cloud/
├── uploads/          ← original uploaded files
├── processed/        ← compressed outputs
└── thumbnails/       ← video/image thumbnails
```

### Step 5 — Verify Connection

```bash
python -c "
import cloudinary
import os
from dotenv import load_dotenv
load_dotenv()
cloudinary.config(cloudinary_url=os.environ['CLOUDINARY_URL'])
print('Cloudinary OK —', cloudinary.config().cloud_name)
"
```

---

## 🔐 Authentication Setup

### Email / Password Auth

Works out of the box. No external setup required. Passwords are hashed with
`bcrypt` (cost factor 12). Tokens are signed HS256 JWTs with a 7-day expiry.

### Google OAuth 2.0

#### Step 1 — Google Cloud Console

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Application type: **Web application**

#### Step 2 — Authorised Origins

Add all origins where your frontend runs:

```
http://localhost:5173          (local Vite dev)
http://localhost:3000          (alternative local port)
https://your-app.vercel.app    (production)
```

#### Step 3 — Copy Client ID

```
Client ID: 914403xxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

#### Step 4 — Set in Both Frontend and Backend

```env
# web/.env.local
VITE_GOOGLE_CLIENT_ID=914403xxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com

# backend .env
GOOGLE_CLIENT_ID=914403xxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

#### How It Works

```
1. User clicks "Sign in with Google" → @react-oauth/google popup
2. Google returns credential (ID token, JWT)
3. Frontend POST /auth/google { tokenId }
4. Backend verifies token via google-auth library
5. Creates or fetches user in DB
6. Returns our own JWT → stored in localStorage
```

---

## 🚀 Production Deployment

### Backend → Render.com

The project ships a `render.yaml` at the root. Render auto-reads it.

#### Option A — Automatic (Recommended)

1. Push code to GitHub
2. **Render Dashboard** → **New** → **Blueprint**
3. Connect your GitHub repo → Render reads `render.yaml` → deploys everything

#### Option B — Manual Web Service

1. **New Web Service** → connect repo
2. **Root Directory:** `/` (project root)
3. **Build Command:**
   ```bash
   pip install -r backend/requirements.txt && apt-get update && apt-get install -y ffmpeg
   ```
4. **Start Command:**
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```
5. **Environment Variables** (set in Render dashboard):

| Key | Value |
|-----|-------|
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
| `CLOUDINARY_URL` | `cloudinary://KEY:SECRET@CLOUD` |
| `ALLOWED_ORIGIN` | `https://your-app.vercel.app` |
| `JWT_SECRET` | Auto-generated (generateValue: true) |
| `DATABASE_URL` | Auto-linked from Render Postgres |

#### render.yaml (Full Reference)

```yaml
services:
  - type: web
    name: media-compressor-api
    env: python
    region: frankfurt
    plan: free
    buildCommand: pip install -r backend/requirements.txt && apt-get update && apt-get install -y ffmpeg
    startCommand: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - fromDatabase:
          name: media-compressor-db
          property: connectionString
        key: DATABASE_URL
      - key: CLOUDINARY_URL
        sync: false
      - key: ALLOWED_ORIGIN
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: JWT_SECRET
        generateValue: true

databases:
  - name: media-compressor-db
    databaseName: media_compressor
    plan: free
```

#### Free-tier Limitations

| Constraint | Details |
|-----------|---------|
| RAM | 512 MB |
| CPU | 0.1 shared |
| Storage | Ephemeral — use Cloudinary for persistent files |
| Cold start | ~30 seconds after 15 min inactivity |
| Build time | ~3-5 minutes (FFmpeg apt-get install) |

> **Tip:** Disable ML deps (`mediapipe`, `ultralytics`, `opencv-python-headless`)
> in `requirements.txt` for free tier. Smart-crop falls back to center-crop gracefully.

---

### Frontend → Vercel

#### Option A — Vercel CLI

```bash
cd web
npm install -g vercel
vercel --prod
```

Follow the prompts:
- **Framework:** Vite
- **Root directory:** `web`
- **Build command:** `npm run build`
- **Output directory:** `dist`

#### Option B — Vercel Dashboard

1. https://vercel.com → **New Project** → Import GitHub repo
2. **Root Directory:** `web`
3. **Framework Preset:** Vite
4. **Environment Variables:**

| Key | Value |
|-----|-------|
| `VITE_API_BASE` | `https://your-api.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |

5. Click **Deploy**

#### Custom Domain (Optional)

```
Vercel Dashboard → your project → Settings → Domains → Add
```

---

## 📡 Complete API Reference

Base URL (local): `http://localhost:8001`
Base URL (prod): `https://your-api.onrender.com`

All endpoints that require authentication expect:
```
Authorization: Bearer <jwt_token>
```

---

### Health

#### `GET /`
Returns a simple health check.

**Response:**
```json
{"status": "ok"}
```

---

### Media Analysis

#### `POST /upload`
Upload a file. Streams in 1 MB chunks to avoid OOM on large videos.

**Request:** `multipart/form-data`
- `file` — the file to upload

**Response:**
```json
{
  "filename": "a1b2c3d4-myvideo.mp4",
  "path": "uploads/a1b2c3d4-myvideo.mp4",
  "mediaType": "video",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "duration": 45.2,
    "codec": "h264",
    "audioChannels": 2,
    "mime_type": "video/mp4",
    "originalPath": "uploads/a1b2c3d4-myvideo.mp4"
  }
}
```

#### `POST /analyze`
Analyze an already-uploaded file.

**Request body:**
```json
{"path": "uploads/a1b2c3d4-myvideo.mp4"}
```

**Response:** `MediaMetadata` (same shape as above)

#### `GET /presets`
All platform presets grouped by media type.

**Response:**
```json
{
  "video": [
    {
      "id": "instagram_reels",
      "label": "Instagram Reels",
      "width": 1080,
      "height": 1920,
      "fps": 30,
      "codec": "h264",
      "bitrate": "3500k",
      "audioBitrate": "128k",
      "aspectRatio": "9:16"
    }
  ],
  "image": [...],
  "audio": [...]
}
```

#### `POST /suggest-platform`
AI-powered platform suggestion based on file dimensions.

**Request body:**
```json
{"inputPath": "uploads/my-video.mp4"}
```

**Response:**
```json
{"platform": "instagram_reels", "confidence": 0.92}
```

#### `POST /layout-strategy`
Get smart crop/pad strategy with AI-detected safe area.

**Request body:**
```json
{
  "inputPath": "uploads/my-video.mp4",
  "platform": "instagram_reels",
  "userPreference": "center"
}
```

**Response:**
```json
{
  "mode": "crop",
  "cropRegion": {"x": 420, "y": 0, "w": 1080, "h": 1920},
  "safeArea": {"cx": 540, "cy": 800, "label": "face"},
  "backgroundType": "blur"
}
```

---

### Jobs

#### `POST /jobs`
Start a new encoding job. Runs in a background thread.

**Request body:** See [StartJobRequest](#startjobrequest-full-schema)

**Response:** `Job` object with `status: "pending"`

#### `GET /jobs/{job_id}`
Poll job status and progress. Call every 1.5 seconds until `status == "done"`.

**Response:**
```json
{
  "id": "abc123",
  "status": "encoding",
  "progress": 0.67,
  "error": null,
  "output_filename": null,
  "platform": "instagram_reels",
  "quality": "balanced",
  "media_type": "video",
  "original_size": 52428800,
  "compressed_size": null,
  "percent_saved": null,
  "created_at": "2026-03-02T10:30:00Z"
}
```

**Status values:**

| Status | Meaning |
|--------|---------|
| `pending` | Job queued, not started |
| `encoding` | FFmpeg/Pillow processing, progress 0.0→1.0 |
| `done` | Complete — `output_filename` is set |
| `failed` | Error — check `error` field |

#### `GET /jobs`
List all jobs (admin / debug).

#### `POST /jobs/preview-edit`
Generate a 5-second preview clip with edit transforms (crop/rotate/flip) applied,
without full encoding. Returns almost instantly using `ultrafast` preset.

**Request body:**
```json
{
  "inputPath": "uploads/my-video.mp4",
  "edit": {
    "rotate": 90,
    "flipH": true
  },
  "previewDuration": 5.0
}
```

**Response:**
```json
{"previewPath": "processed/preview_abc123.mp4"}
```

---

### Download

#### `GET /download/{filename}`
Download a processed file by its filename.

```
GET /download/a1b2c3-instagram_reels.mp4
```

Returns the file as a binary stream with appropriate `Content-Type`.

#### `POST /download/zip`
Archive multiple processed files and download as a ZIP.

**Request body:**
```json
{"filenames": ["file1_reels.mp4", "file2_reels.mp4", "file3_post.jpg"]}
```

Returns a ZIP archive binary stream.

---

### Authentication

#### `POST /auth/register`
Register a new account with email and password.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### `POST /auth/login`
Login with existing credentials.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** Same as `/auth/register`

#### `POST /auth/google`
Login or register using a Google ID token from the frontend.

**Request body:**
```json
{"tokenId": "google-id-token-from-gsi-button"}
```

**Response:** Same as `/auth/register`

#### `GET /auth/me`
Returns the current authenticated user's info.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "created_at": "2026-01-01T00:00:00Z"
}
```

#### `GET /history`
Returns the authenticated user's compression history.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": "abc123",
    "status": "done",
    "platform": "instagram_reels",
    "media_type": "video",
    "original_size": 52428800,
    "compressed_size": 8388608,
    "percent_saved": 84,
    "output_filename": "abc123_reels.mp4",
    "created_at": "2026-03-01T12:00:00Z"
  }
]
```

---

### User Presets

#### `POST /user-presets`
Save a named preset (auth required).

**Request body:**
```json
{
  "name": "My TikTok Setup",
  "platform": "tiktok",
  "quality": "balanced",
  "layoutOptions": {"mode": "crop", "safeAreaPreference": "center", "backgroundType": "blur"}
}
```

#### `GET /user-presets`
Return all saved presets for the current user (auth required).

#### `DELETE /user-presets/{name}`
Delete a saved preset by name (auth required).

---

### StartJobRequest — Full Schema

```typescript
{
  // Required
  inputPath: string               // path returned by POST /upload
  platform: string                // e.g. "instagram_reels", "tiktok"
  mediaType: "video" | "image" | "audio"

  // Quality
  quality?: "light" | "balanced" | "best"   // default: "balanced"
  deviceClass?: "desktop" | "mobile"

  // Layout
  layoutOptions?: {
    mode: "crop" | "pad" | "none"
    safeAreaPreference: "center" | "top" | "bottom"
    backgroundType: "blur" | "black"
  }

  // Edit transforms (applied first, before encoding)
  edit?: {
    crop?: { w: number; h: number; x: number; y: number } | null
    rotate?: 90 | 180 | 270 | null
    flipH?: boolean
    flipV?: boolean
    fixOrientation?: boolean
  }

  // Trim (seconds from start/end of file)
  trimStart?: number
  trimEnd?: number

  // Audio
  removeAudio?: boolean
  normalizeLoudness?: boolean
  silenceTrim?: boolean
  extractAudioOnly?: boolean

  // Watermark
  watermarkText?: string
  watermarkPosition?: "bottomright" | "bottomleft" | "topleft" | "topright" | "center"
  watermarkLogoPath?: string
}
```

---

## 💾 Database Schema

### SQLAlchemy ORM Models (`database.py`)

```python
class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)   # null for Google-only accounts
    google_id     = Column(String, unique=True, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    jobs          = relationship("Job", back_populates="user")
    presets       = relationship("UserPreset", back_populates="user")


class Job(Base):
    __tablename__ = "jobs"

    id              = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=True)
    status          = Column(String, default="pending")   # pending|encoding|done|failed
    progress        = Column(Float, default=0.0)
    error           = Column(String, nullable=True)
    input_path      = Column(String, nullable=False)
    output_path     = Column(String, nullable=True)
    output_filename = Column(String, nullable=True)
    platform        = Column(String, nullable=True)
    quality         = Column(String, nullable=True)
    media_type      = Column(String, nullable=True)
    original_size   = Column(Integer, nullable=True)
    compressed_size = Column(Integer, nullable=True)
    percent_saved   = Column(Float, nullable=True)
    edit_options    = Column(JSON, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    user            = relationship("User", back_populates="jobs")


class UserPreset(Base):
    __tablename__ = "user_presets"

    id             = Column(Integer, primary_key=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False)
    name           = Column(String, nullable=False)
    platform       = Column(String, nullable=True)
    quality        = Column(String, nullable=True)
    layout_options = Column(JSON, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
    user           = relationship("User", back_populates="presets")
```

### Indexes

```sql
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_user_presets_user_id ON user_presets(user_id);
```

---

## 🎨 UI/UX Design System

### 5-Step Wizard Flow

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  1. Upload   │ → │ 2. Platform  │ → │   3. Edit    │ → │  4. Quality  │ → │ 5. Compress  │
│              │   │              │   │              │   │              │   │              │
│ Drag & drop  │   │ Pick target  │   │ Crop/Rotate  │   │ Light/Best   │   │ Progress bar │
│ Multi-file   │   │ Smart layout │   │ Flip/Trim    │   │ Advanced     │   │ Download     │
│ Thumbnails   │   │ Canvas prev  │   │ 5s preview   │   │ Watermark    │   │ ZIP batch    │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

### Component Map

| Component | File | Step | Key Props |
|-----------|------|------|-----------|
| `UploadScreen` | `UploadScreen.tsx` | 1 | `onFilesReady(files)` |
| `PlatformAndLayoutStep` | `PlatformAndLayoutStep.tsx` | 2 | `file`, `onNext(platform, layout)` |
| `EditStep` | `EditStep.tsx` | 3 | `file`, `platform`, `onNext(edit)` |
| `QualityStep` | `QualityStep.tsx` | 4 | `file`, `platform`, `onNext(quality, options)` |
| `PreviewAndCompressStep` | `PreviewAndCompressStep.tsx` | 5 | `file`, `allOptions`, `onDone()` |
| `LoginScreen` | `LoginScreen.tsx` | Auth | `onLogin(token)` |
| `HistoryPage` | `HistoryPage.tsx` | — | `token` |
| `JobProgress` | `JobProgress.tsx` | — | `jobId`, `onComplete(job)` |
| `ProtectedRoute` | `ProtectedRoute.tsx` | — | `token` (wraps auth pages) |
| `PresetSelector` | `PresetSelector.tsx` | 2 | `mediaType`, `onSelect(preset)` |

### Color System (CSS Variables)

```css
:root {
  --bg-primary:    #0a0a0f;
  --bg-secondary:  #171724;
  --accent:        #6a4c93;      /* amethyst */
  --accent-hover:  #8b5fb5;      /* lavender */
  --success:       #22c55e;
  --warning:       #f59e0b;
  --danger:        #ef4444;
  --text-primary:  #f8fafc;
  --text-muted:    #94a3b8;
  --card-glass:    rgba(106, 76, 147, 0.15);
  --border-glass:  rgba(139, 95, 181, 0.25);
}

[data-theme="light"] {
  --bg-primary:    #f8fafc;
  --bg-secondary:  #f1f5f9;
  --text-primary:  #0f172a;
}
```

### Key CSS Animations

```css
/* Upload zone pulse glow */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(106, 76, 147, 0.4); }
  50%       { box-shadow: 0 0 50px rgba(106, 76, 147, 0.8); }
}

/* Progress bar shimmer */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

/* Button lift on hover */
@keyframes button-lift {
  from { transform: translateY(0)   scale(1); }
  to   { transform: translateY(-8px) scale(1.02); }
}

/* Done celebration */
@keyframes celebrate {
  0%, 100% { transform: scale(1); }
  25%       { transform: scale(1.05) rotate(-1deg); }
  75%       { transform: scale(1.05) rotate(1deg); }
}
```

### Typography

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| Hero title | 48px | 800 | App name, step headers |
| Section title | 28px | 700 | Card headers |
| Body | 16px | 400 | Descriptions, labels |
| Caption | 13px | 400 | File sizes, metadata |
| Button | 16px | 600 | CTAs |
| Badge | 11px | 700 | Status chips |

---

## ⚙️ Configuration Reference

### Full Backend `.env`

```env
# ── Database ────────────────────────────────────────────────────────────────
# Leave blank for local SQLite (dev.db created automatically)
DATABASE_URL=postgresql://user:password@host:5432/media_compressor

# ── JWT Auth ────────────────────────────────────────────────────────────────
# REQUIRED in production. Min 32 chars.
JWT_SECRET=your-super-secret-jwt-signing-key-minimum-32-characters

# Token expiry in minutes (default: 10080 = 7 days)
JWT_EXPIRY_MINUTES=10080

# ── Google OAuth ────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=914403xxxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

# ── Cloudinary (optional — local disk used if blank) ────────────────────────
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

# ── CORS ────────────────────────────────────────────────────────────────────
# Comma-separated list of allowed origins
ALLOWED_ORIGIN=https://your-app.vercel.app,http://localhost:5173

# ── File limits ─────────────────────────────────────────────────────────────
MAX_UPLOAD_MB=500

# ── Debug ───────────────────────────────────────────────────────────────────
DEBUG=false
```

### Full Frontend `web/.env.local`

```env
# Backend API URL (no trailing slash)
VITE_API_BASE=http://localhost:8001

# Google OAuth Client ID (same value as backend GOOGLE_CLIENT_ID)
VITE_GOOGLE_CLIENT_ID=914403xxxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

---

## 🧪 Testing

### Backend Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run all tests
pytest backend/tests/ -v

# Run with coverage
pip install pytest-cov
pytest backend/tests/ --cov=backend --cov-report=html
```

**Example test:**

```python
# backend/tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_presets():
    response = client.get("/presets")
    assert response.status_code == 200
    data = response.json()
    assert "video" in data
    assert "image" in data
    assert "audio" in data


def test_register_and_login():
    # Register
    r = client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "testpass123"
    })
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token

    # Login
    r2 = client.post("/auth/login", json={
        "email": "test@example.com",
        "password": "testpass123"
    })
    assert r2.status_code == 200
    assert r2.json()["access_token"]

    # Auth/me
    r3 = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r3.status_code == 200
    assert r3.json()["email"] == "test@example.com"
```

### Frontend Tests

```bash
cd web

# Install test dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom

# Run tests
npm run test

# Coverage
npm run test -- --coverage
```

**Example test:**

```typescript
// web/src/components/__tests__/UploadScreen.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import UploadScreen from '../UploadScreen'

test('renders upload zone', () => {
  render(<UploadScreen onFilesReady={() => {}} />)
  expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument()
})

test('shows file in queue after selection', async () => {
  render(<UploadScreen onFilesReady={() => {}} />)
  const input = screen.getByTestId('file-input')
  const file = new File(['video'], 'test.mp4', { type: 'video/mp4' })
  fireEvent.change(input, { target: { files: [file] } })
  expect(await screen.findByText('test.mp4')).toBeInTheDocument()
})
```

### Integration Test — Full Pipeline

```bash
# Start backend in test mode
DATABASE_URL=sqlite:///./test.db python -m uvicorn backend.main:app --port 8002

# Run integration tests
pytest backend/tests/integration/ -v --base-url=http://localhost:8002
```

---

## 📊 Monitoring & Analytics

### Render Built-in Metrics

Available in the Render dashboard for your web service:
- CPU + Memory usage graphs
- Request count / response time
- Deploy history + build logs
- Real-time log streaming

### Optional: Sentry Error Tracking (Free 5k events/month)

```bash
pip install sentry-sdk[fastapi]
npm install @sentry/react @sentry/tracing
```

```python
# backend/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
)
```

```typescript
// web/src/main.tsx
import * as Sentry from "@sentry/react";
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

Add to env:
```env
# backend .env
SENTRY_DSN=https://xxxxxxxxxxxxxxxx@o123456.ingest.sentry.io/project

# web/.env.local
VITE_SENTRY_DSN=https://xxxxxxxxxxxxxxxx@o123456.ingest.sentry.io/project
```

### Optional: Uptime Monitoring

Use [UptimeRobot](https://uptimerobot.com) (free) to ping `GET /` every 5 minutes.
This also prevents Render free-tier cold starts during active hours.

---

## 🔒 Security

### Implemented Protections

| Threat | Mitigation |
|--------|-----------|
| Password brute force | bcrypt (cost 12) — slow by design |
| Token forgery | HS256 JWT with 64-char secret |
| CORS attacks | Strict `ALLOWED_ORIGIN` whitelist |
| File upload abuse | MIME-type validation, filename UUID prefix |
| SQL injection | SQLAlchemy parameterized queries throughout |
| XSS | React DOM escaping (never `dangerouslySetInnerHTML`) |
| CSRF | Stateless JWT — no cookies used |
| Malicious files | Extension + MIME double-check via `python-magic` |

### File Upload Security

```python
# backend/main.py — upload endpoint
ALLOWED_MIME_TYPES = {
    "video/mp4", "video/quicktime", "video/x-msvideo",
    "image/jpeg", "image/png", "image/webp",
    "audio/mpeg", "audio/wav", "audio/aac", "audio/ogg"
}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB
```

### JWT Configuration

```python
# backend/auth.py
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7   # 7 days

def create_access_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({**data, "exp": expire}, settings.JWT_SECRET, algorithm=ALGORITHM)
```

### CORS Configuration

```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGIN.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Production Hardening Checklist

```
☐ Set DEBUG=false
☐ Set JWT_SECRET to 64+ char random string
☐ Restrict ALLOWED_ORIGIN to exact Vercel domain
☐ Enable HTTPS everywhere (automatic on Render + Vercel)
☐ Store secrets in Render environment dashboard, not .env files
☐ Rotate JWT_SECRET every 90 days
☐ Add Sentry for error visibility
☐ Set up UptimeRobot health monitoring
```

---

## 📈 Performance Optimization

### Backend

| Optimization | Implementation |
|-------------|---------------|
| Chunked upload | 1 MB streaming chunks — no full-file RAM load |
| Background encoding | `threading.Thread` — non-blocking API |
| Connection pooling | SQLAlchemy `pool_size=5, max_overflow=10` |
| Cloudinary CDN | Global edge cache for file delivery |
| FFmpeg preset selection | `ultrafast` for preview, `medium`/`slow` for final |
| Progress parsing | Regex on FFmpeg stderr — real-time updates |

### Frontend

| Optimization | Implementation |
|-------------|---------------|
| Concurrent ops | `Promise.all([upload, thumbnail])` — no sequential blocking |
| Axios config | `timeout: 0, maxBodyLength: Infinity` — large file support |
| Vite tree shaking | Dead code elimination at build time |
| Lazy loading | Dynamic imports for heavy components |
| Thumbnail generation | Canvas API — no server round-trip |
| Polling backoff | 1.5s interval with exponential backoff on errors |

### FFmpeg Quality Presets

| Preset | CRF | Speed | Audio | Use Case |
|--------|-----|-------|-------|---------|
| `light` | 28 | `veryfast` | 96k | Quick share, WhatsApp |
| `balanced` | 23 | `medium` | 128k | General social media |
| `best` | 18 | `slow` | 192k | Professional quality |

---

## 🗂️ Project Structure

```
media-compressor/
│
├── backend/
│   ├── __init__.py
│   ├── main.py                   # FastAPI app + all 20 routes
│   ├── models.py                 # Pydantic v2 models (ordered: CropParams → EditParams → StartJobRequest)
│   ├── encoding.py               # FFmpeg pipeline + edit filter builder
│   ├── jobs.py                   # SQLAlchemy job CRUD + background orchestration
│   ├── layout.py                 # Smart crop region + safe-area hints
│   ├── detection.py              # MediaPipe face + YOLOv8 object detection
│   ├── storage.py                # File path helpers + Cloudinary client
│   ├── auth.py                   # JWT, bcrypt, Google token verify
│   ├── database.py               # SQLAlchemy engine + ORM models + session
│   ├── schemas.py                # Platform preset JSON loader
│   ├── requirements.txt          # All Python dependencies
│   └── presets/
│       ├── video/
│       │   ├── instagram_reels.json
│       │   ├── instagram_post.json
│       │   ├── instagram_story.json
│       │   ├── tiktok.json
│       │   ├── youtube_shorts.json
│       │   ├── facebook_reel.json
│       │   ├── x_twitter.json
│       │   └── linkedin.json
│       ├── image/
│       │   ├── instagram_post.json
│       │   ├── instagram_story.json
│       │   ├── facebook_post.json
│       │   └── twitter_post.json
│       └── audio/
│           ├── podcast.json
│           └── social_post.json
│
├── web/                          # React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx               # Root — 5-step state machine + auth routing
│   │   ├── main.tsx              # React DOM mount + Google OAuth provider
│   │   ├── index.css             # All global styles, CSS vars, animations
│   │   ├── components/
│   │   │   ├── UploadScreen.tsx           # Step 1 — drag-drop, queue, thumbnails
│   │   │   ├── PlatformAndLayoutStep.tsx  # Step 2 — platform picker, canvas preview
│   │   │   ├── EditStep.tsx               # Step 3 — crop/rotate/flip + 5s preview
│   │   │   ├── QualityStep.tsx            # Step 4 — quality tier + advanced options
│   │   │   ├── PreviewAndCompressStep.tsx # Step 5 — summary, compress, download
│   │   │   ├── LoginScreen.tsx            # Email/password + Google Sign-In
│   │   │   ├── HistoryPage.tsx            # Per-user job history + ZIP
│   │   │   ├── JobProgress.tsx            # Animated progress bar with ETA
│   │   │   ├── PresetSelector.tsx         # Platform preset dropdown/grid
│   │   │   └── ProtectedRoute.tsx         # Auth guard component
│   │   └── api/
│   │       ├── client.ts         # All API calls (Axios, timeout=0)
│   │       ├── auth.ts           # Auth calls, JWT localStorage helpers
│   │       └── types.ts          # TypeScript interfaces (Job, MediaMetadata, etc.)
│   ├── .env.local                # Git-ignored local env vars
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── mobile/                       # React Native app (future)
├── frontend/                     # Legacy (unused)
├── venv/                         # Python virtual environment (git-ignored)
├── dev.db                        # SQLite dev database (git-ignored)
├── yolov8s.pt                    # YOLOv8 model weights
├── .env                          # Backend env vars (git-ignored)
├── .gitignore
├── render.yaml                   # Render deployment config
└── Readme.md
```

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

### Getting Started

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/media-compressor.git
cd media-compressor

# 3. Create a feature branch
git checkout -b feature/your-feature-name

# 4. Install all dependencies
python -m venv venv && .\venv\Scripts\activate
pip install -r backend/requirements.txt
cd web && npm install

# 5. Make your changes and test
pytest backend/tests/ -v
npm run test

# 6. Commit with conventional commit style
git add .
git commit -m "feat: add subtitle/caption overlay support"

# 7. Push and open a Pull Request
git push origin feature/your-feature-name
```

### Commit Message Convention

```
feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Formatting, no logic change
refactor: Code restructure, no feature/fix
perf:     Performance improvement
test:     Adding tests
chore:    Tooling, dependencies, config
```

### Code Style

```bash
# Backend — Black formatter
pip install black
black backend/

# Frontend — Prettier
npm run format

# Type checking
npm run tsc                # TypeScript
mypy backend/ --ignore-missing-imports   # Python
```

### Pull Request Guidelines

- Describe what the PR does and why
- Include screenshots for UI changes
- Add or update tests for new functionality
- Keep PRs focused — one feature or fix per PR
- Ensure all CI checks pass before requesting review

### Reporting Issues

Use GitHub Issues with:
- **Bug template:** Steps to reproduce, expected vs actual behaviour, OS + browser
- **Feature template:** Problem you're solving, proposed solution, alternatives considered

---

## 🛣️ Roadmap

```
✅ Phase 1 — Core Compression
   Video (H.264/H.265/AV1) · Image (WebP/JPEG) · Audio (MP3/Opus)
   Platform presets · Quality tiers · Real-time progress

✅ Phase 2 — Smart Editing
   Crop · Rotate · Flip · Auto-orientation · Trim · Watermark
   5-second edit preview · Safe-area canvas overlay

✅ Phase 3 — User Accounts
   Email/password auth · Google OAuth · JWT
   Compression history · Saved presets · Batch ZIP download

✅ Phase 4 — Premium UI
   Glassmorphism dark/light theme · 60fps CSS animations
   5-step wizard · Mobile-responsive

✅ Phase 5 — Production Deployment
   Render (backend) · Vercel (frontend) · PostgreSQL · Cloudinary

🔜 Phase 6 — Advanced AI
   Live YOLOv8 smart crop (currently falls back to center)
   Scene-aware layout selection

🔜 Phase 7 — Mobile App
   React Native (iOS + Android)
   Native camera roll access

🔜 Phase 8 — Collaboration
   Team workspaces · Shared presets · Brand kit
   Multi-user project management

🔜 Phase 9 — API Access
   Public REST API with API keys
   Webhook notifications on job completion
   SDK (Python + Node.js)
```

---

## 🆓 Free Tier Summary

Everything runs on permanently free tiers:

| Service | Free Allowance | Our Usage |
|---------|---------------|-----------|
| Render Web Service | 750 hrs/mo (always-on with 1 service) | Backend |
| Render PostgreSQL | 1 GB storage, 90 days | Auth + jobs DB |
| Vercel | 100 GB bandwidth, unlimited sites | Frontend |
| Cloudinary | 25 GB storage, 25 GB bandwidth | File storage |
| Google OAuth | Unlimited requests | Sign-In |
| SQLite | Unlimited | Local dev |

**Total monthly cost: $0**

> Paid upgrade recommended for production: Render Starter ($7/mo) eliminates cold starts
> and gives persistent disk. Cloudinary paid plan ($89/mo) for >25 GB storage.

---

## 📄 License

```
MIT License

Copyright (c) 2026 Media Compressor Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgements

| Tool | Purpose |
|------|---------|
| [FFmpeg](https://ffmpeg.org) | The backbone of all video/audio processing |
| [FastAPI](https://fastapi.tiangolo.com) | Blazing fast Python API framework |
| [MediaPipe](https://mediapipe.dev) | Face detection for smart crop |
| [Ultralytics YOLOv8](https://ultralytics.com) | Object detection |
| [Pillow](https://python-pillow.org) | Python image processing |
| [Cloudinary](https://cloudinary.com) | Generous 25 GB free storage |
| [Render](https://render.com) | Simple, free backend hosting |
| [Vercel](https://vercel.com) | The best free frontend hosting |
| [@react-oauth/google](https://github.com/MomenSherif/react-oauth) | Google Sign-In for React |

---

<div align="center">

**Built with ❤️ — 100% Free, No Watermarks, No Limits**

[⭐ Star this repo](https://github.com/yourusername/media-compressor) · [🐛 Report a Bug](https://github.com/yourusername/media-compressor/issues) · [💡 Request a Feature](https://github.com/yourusername/media-compressor/issues)

</div>
