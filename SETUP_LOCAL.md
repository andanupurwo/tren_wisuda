# Local Setup Guide (XLSX Loader)

Purpose: set up the project on a laptop and reload data from XLSX files.

## 1) Clone the repo
Clone the private repo on the laptop.

## 2) Prepare PostgreSQL
- Install PostgreSQL.
- Create a user and password.
- **IMPORTANT**: Create database with **UTF8 encoding** to support special characters:
  ```sql
  CREATE DATABASE db_tren_wisuda ENCODING 'UTF8' LC_COLLATE='C' LC_CTYPE='C' TEMPLATE=template0;
  ```
- If database already exists with wrong encoding (WIN1252), you must drop and recreate it with UTF8.

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

### Windows Users: Fix PowerShell Execution Policy (if needed)
If you get an error about scripts being disabled, run this first:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

### Backend
```bash
# Use one of these commands (depending on your Python installation):
pip install -r backend/requirements.txt
# OR
python -m pip install -r backend/requirements.txt
```

### Frontend
```bash
cd frontend
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
```bash
# Run from project root directory
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

## 9) Verify
- Backend Health: http://localhost:8000/health
- Backend API Docs: http://localhost:8000/docs (FastAPI automatic documentation)
- Frontend: http://localhost:3000

## Notes
- `.env` files and `history_peserta_wisuda` are ignored by git.
- You must recreate `.env` files and copy `history_peserta_wisuda` manually on the laptop.
- `node_modules/` and build outputs are not committed and will be rebuilt by `npm install`.
- If PostgreSQL uses a different port, update `PGPORT`.

## Troubleshooting

### Database Encoding Error
If you get error like `character with byte sequence 0xc2 0x9d in encoding "UTF8" has no equivalent in encoding "WIN1252"`:
- Your database was created with wrong encoding (WIN1252 instead of UTF8)
- Solution: Drop and recreate database with UTF8 encoding (see step 2)

### Python/pip not found
- Try using `python -m pip` instead of `pip`
- Make sure Python is added to PATH during installation

### PowerShell Script Execution Error
- Run: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force`

### Backend won't start with `python backend/main.py`
- Use uvicorn command instead: `python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000`
