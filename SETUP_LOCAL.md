# Local Setup Guide (XLSX Loader)

Purpose: set up the project on a laptop and reload data from XLSX files.

## 1) Clone the repo
Clone the private repo on the laptop.

## 2) Prepare PostgreSQL
- Install PostgreSQL.
- Create a user and password.
- Create a new database (example: `db_peserta_wisuda`).

## 3) Configure env

### backend/.env
```
PGHOST=localhost
PGPORT=5432
PGDATABASE=db_peserta_wisuda
PGUSER=postgres
PGPASSWORD=your_password
CORS_ORIGINS=http://localhost:3000
```

### frontend/.env.local
```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## 4) Prepare XLSX data
Copy the `history_peserta_wisuda` folder to the project root (same level as `backend/` and `frontend/`).

## 5) Install dependencies

### Backend
```
pip install -r backend/requirements.txt
```

### Frontend
```
npm install
```

## 6) Create the database schema
```
python backend/setup_db.py
```

## 7) Load XLSX data
```
python backend/load_xlsx.py
```

## 8) Run the app

### Backend
```
python backend/main.py
```

### Frontend
```
npm run dev
```

## 9) Verify
- Backend: http://localhost:8000/health
- Frontend: http://localhost:3000

## Notes
- `.env` files and `history_peserta_wisuda` are ignored by git.
- You must recreate `.env` files and copy `history_peserta_wisuda` manually on the laptop.
- `node_modules/` and build outputs are not committed and will be rebuilt by `npm install`.
- If PostgreSQL uses a different port, update `PGPORT`.
