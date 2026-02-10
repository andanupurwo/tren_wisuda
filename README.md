# 🎓 Tren Wisuda - Graduation Participant Analytics

Aplikasi web untuk menganalisis data historis peserta wisuda dengan visualisasi interaktif dan REST API yang komprehensif.

## 📋 Deskripsi

**Tren Wisuda** adalah sistem manajemen dan analitik data peserta wisuda yang memungkinkan:
- 📊 Visualisasi tren peserta wisuda dari berbagai periode
- 🔍 Pencarian dan filtering data peserta
- 📈 Analitik berdasarkan fakultas, prodi, gender, dan predikat kelulusan
- ✅ Tracking validasi dan approval dari berbagai unit (UPT, RC, DPK, BPC, DAAK)
- 📁 Import data dari file XLSX

## ✨ Fitur Utama

### Backend (FastAPI)
- **RESTful API** dengan dokumentasi otomatis (Swagger UI)
- **Multi-mode data**: Raw data dan normalized data
- **Analytics endpoints** untuk berbagai dimensi analisis
- **Pagination & Search** untuk performa optimal
- **CORS support** untuk integrasi frontend

### Frontend (Next.js)
- **Modern UI** dengan React dan TypeScript
- **Interactive dashboards** untuk visualisasi data
- **Responsive design** untuk berbagai ukuran layar
- **Real-time data fetching** dari backend API

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Database dengan encoding UTF8
- **pg8000** - Pure-Python PostgreSQL driver
- **python-dotenv** - Environment variable management

### Frontend
- **Next.js 14** - React framework dengan App Router
- **TypeScript** - Type-safe JavaScript
- **React** - UI library

## 📦 Struktur Proyek

```
tren_wisuda/
├── backend/
│   ├── main.py              # FastAPI application & API endpoints
│   ├── db.py                # Database connection & utilities
│   ├── setup_db.py          # Database schema setup
│   ├── load_xlsx.py         # XLSX data loader
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Backend configuration (not in git)
├── frontend/
│   ├── app/                 # Next.js app directory
│   ├── package.json         # Node dependencies
│   └── .env.local           # Frontend configuration (not in git)
├── recreate_db.py           # Utility: Recreate database with UTF8
├── run_load.py              # Utility: Load XLSX with error handling
└── SETUP_LOCAL.md           # Detailed setup guide
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** dengan pip
- **Node.js 16+** dengan npm
- **PostgreSQL 12+**
- **Git**

### 1. Clone Repository
```bash
git clone https://github.com/andanupurwo/tren_wisuda.git
cd tren_wisuda
```

### 2. Setup Database
```bash
# Create PostgreSQL database with UTF8 encoding
psql -U postgres
```
```sql
CREATE DATABASE db_tren_wisuda ENCODING 'UTF8' LC_COLLATE='C' LC_CTYPE='C' TEMPLATE=template0;
\q
```

### 3. Configure Environment

**backend/.env**
```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=db_tren_wisuda
PGUSER=postgres
PGPASSWORD=your_password
CORS_ORIGINS=http://localhost:3000
```

**frontend/.env.local**
```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### 4. Install Dependencies

**Backend**
```bash
pip install -r backend/requirements.txt
```

**Frontend**
```bash
cd frontend
npm install
cd ..
```

### 5. Setup Database Schema
```bash
python backend/setup_db.py
```

### 6. Load Data (Optional)
```bash
# Pastikan folder history_peserta_wisuda/ tersedia
python backend/load_xlsx.py
```

### 7. Run Application

**Backend** (Terminal 1)
```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend** (Terminal 2)
```bash
cd frontend
npm run dev
```

### 8. Access Application
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 📚 API Documentation

### Endpoints

#### Health Check
```
GET /health
```
Mengecek status backend server.

#### Get Periods
```
GET /api/periods?mode=raw
```
Mendapatkan daftar periode wisuda yang tersedia.

**Query Parameters:**
- `mode`: `raw` atau `normalized` (default: `raw`)

#### Get Participants
```
GET /api/peserta?periode=202401&limit=200&offset=0&q=search
```
Mendapatkan daftar peserta wisuda dengan pagination dan search.

**Query Parameters:**
- `periode` (required): Periode wisuda (contoh: 202401)
- `limit`: Jumlah data per halaman (1-1000, default: 200)
- `offset`: Offset untuk pagination (default: 0)
- `q`: Search query untuk nama atau NPM
- `mode`: `raw` atau `normalized` (default: `raw`)

#### Get Analytics
```
GET /api/analytics?periode=202401&mode=raw
```
Mendapatkan analitik lengkap untuk periode tertentu.

**Response includes:**
- Total peserta
- Valid/Invalid count
- Breakdown by Fakultas
- Breakdown by Prodi
- Breakdown by Gender
- Breakdown by Predikat
- Approval stats by Unit (UPT, RC, DPK, BPC, DAAK)

#### Get Trends
```
GET /api/trends?mode=raw
```
Mendapatkan tren jumlah peserta per periode.

#### Get Trends Detail
```
GET /api/trends/detail?mode=raw
```
Mendapatkan tren detail dengan breakdown valid/invalid per periode.

## 🔧 Utility Scripts

### recreate_db.py
Membuat ulang database dengan encoding UTF8 yang benar.
```bash
python recreate_db.py
```

### run_load.py
Wrapper untuk load_xlsx.py dengan error handling yang lebih baik.
```bash
python run_load.py
```

## 📖 Documentation

Untuk panduan setup lengkap, lihat [SETUP_LOCAL.md](SETUP_LOCAL.md)

## 🐛 Troubleshooting

### Database Encoding Error
Jika mendapat error encoding (WIN1252 vs UTF8):
```bash
python recreate_db.py
python backend/setup_db.py
python backend/load_xlsx.py
```

### Python/pip not found
```bash
# Gunakan python -m pip
python -m pip install -r backend/requirements.txt
```

### PowerShell Script Execution Error
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

### Backend won't start
```bash
# Gunakan uvicorn command, bukan python backend/main.py
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## 📝 Data Format

Aplikasi mendukung import data XLSX dengan kolom:
- NPM
- Nama
- Fakultas
- Prodi
- Jenis Kelamin
- Predikat
- Peserta Valid
- Approval fields (UPT, RC, DPK, BPC, DAAK)

## 🤝 Contributing

Contributions are welcome! Silakan buat issue atau pull request.

## 📄 License

This project is private. All rights reserved.

## 👤 Author

**Anda Nupurwo**
- GitHub: [@andanupurwo](https://github.com/andanupurwo)

## 🙏 Acknowledgments

- FastAPI untuk framework backend yang powerful
- Next.js untuk framework frontend yang modern
- PostgreSQL untuk database yang reliable
