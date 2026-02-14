# 🎓 Tren Wisuda - Graduation Participant Analytics

[![Docker Build](https://img.shields.io/badge/docker-ready-blue?logo=docker)](https://www.docker.com/)
[![Next.js](https://img.shields.io/badge/next.js-14-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/fastapi-ready-teal?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-15-blue?logo=postgresql)](https://www.postgresql.org/)

Applications for analyzing historical data of graduation participants with interactive visualization and comprehensive REST API.

## 📋 Features

### 🐳 Full Docker Support
- **Containerized**: Backend, Frontend, and Database are fully containerized.
- **Easy Setup**: Run consistently across environments with Docker Compose.

### 🚀 Backend (FastAPI)
- **RESTful API**: Automatically documented with Swagger UI.
- **Data Processing**: Supports raw and normalized data modes.
- **Analytics Engine**: Endpoints for various analysis dimensions (faculty, study program, gender, predicate).
- **Automated Data Loading**: Script to ingest XLSX files automatically.

### 💻 Frontend (Next.js)
- **Modern UI**: Built with React, TypeScript, and Next.js 14 (App Router).
- **Interactive Dashboards**: Data visualization for trends and statistics.
- **Recursive Search**: Filter and search through thousands of records instantly.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | Next.js 14 | React Framework with App Router & TypeScript |
| **Backend** | FastAPI | High-performance Python web framework |
| **Database** | PostgreSQL 15 | Robust relational database |
| **Infrastructure** | Docker | Containerization and orchestration |

---

## 🚀 Quick Start (Docker)

The easiest way to run the application is using Docker Compose.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 1. Clone Repository
```bash
git clone https://github.com/andanupurwo/tren_wisuda.git
cd tren_wisuda
```

### 2. Prepare Data (Optional)
Look for the `history_peserta_wisuda` folder. If you have graduation data in `.xlsx` format, place them here.
```bash
# Example structure
tren_wisuda/
├── history_peserta_wisuda/
│   ├── Periode 90.xlsx
│   └── Periode 91.xlsx
```

### 3. Run Application
```bash
docker-compose up -d --build
```
Everything will be set up automatically:
- Database will be created.
- Schema will be applied.
- Backend and Frontend will start.

### 4. Load Data
If you added files to `history_peserta_wisuda`, run the potential loader script inside the container:
```bash
docker-compose exec backend python load_xlsx.py
```

### 5. Access
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Database**: Port `5432`

---

## 📂 Project Structure

```
tren_wisuda/
├── backend/                 # FastAPI Application
│   ├── load_xlsx.py         # Data ingestion script
│   ├── main.py              # API Entrypoint
│   └── schema.sql           # Database Schema
├── frontend/                # Next.js Application
│   ├── app/                 # App Router pages
│   └── Dockerfile           # Optimized Next.js Dockerfile
├── history_peserta_wisuda/  # Data directory (ignored in git)
├── trash/                   # Deprecated/Old files
├── docker-compose.yml       # Orchestration file
└── README.md                # This file
```

## 🔐 Environment Variables

The project comes with default `.env.example` files for both backend and frontend. Docker Compose handles these automatically, but you can override them if needed.

**Backend (.env)**
```env
PGHOST=db
PGPORT=5432
PGDATABASE=db_tren_wisuda
PGUSER=postgres
PGPASSWORD=postgres_password
CORS_ORIGINS=http://localhost:3000
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

Private Project. All rights reserved.
