
# 🛠️ Setup Manual (Tanpa Docker)

Jika Anda ingin menjalankan aplikasi secara manual tanpa Docker, ikuti panduan berikut.

## Prasyarat

- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL 15+**

## 1. Setup Database

Buat database di PostgreSQL:
```sql
CREATE DATABASE history_peserta_wisuda;
```

## 2. Setup Backend

Masuk ke folder backend:
```bash
cd backend
```

Buat virtual environment dan install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # atau venv\Scripts\activate di Windows
pip install -r requirements.txt
```

Salin konfigurasi env:
```bash
cp .env.example .env
# Edit .env sesuaikan dengan kredensial database Anda
```

Jalan setup database:
```bash
python setup_db.py
```

Jalankan server:
```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 3. Setup Frontend

Masuk ke folder frontend:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Salin konfigurasi env:
```bash
cp .env.example .env.local
```

Jalankan server development:
```bash
npm run dev
```

Akses aplikasi di http://localhost:3000
