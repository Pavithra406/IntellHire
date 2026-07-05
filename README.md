# AI Interview Hiring Agent

Enterprise-level AI-powered recruitment platform that automates end-to-end hiring.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Tailwind CSS, Recharts |
| Backend | Python, FastAPI, SQLAlchemy |
| Database | PostgreSQL |
| AI/LLM | Google Gemini 1.5 Flash |
| Vector DB | ChromaDB |

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (running locally)
- Google Gemini API key from https://aistudio.google.com

## Quick Start

### 1. Clone and set up backend

```bash
cd ai-interview-hiring-agent/backend

python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt

copy .env.example .env         # Windows
# cp .env.example .env         # Mac/Linux
```

Edit `.env`:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/ai_hiring_db
GEMINI_API_KEY=your-gemini-api-key
SECRET_KEY=any-random-secret-string
```

### 2. Create the database

```sql
-- In psql or pgAdmin
CREATE DATABASE ai_hiring_db;
```

### 3. Run the backend

```bash
uvicorn main:app --reload
```

Backend: http://localhost:8000  
Swagger docs: http://localhost:8000/docs

### 4. Set up and run frontend

```bash
cd ai-interview-hiring-agent/frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## User Roles

### HR
- Register → Login → Create Company Profile → Create Job Openings
- Add candidates and assign them to jobs
- View resume analysis, assessment scores, interview recordings
- Shortlist / Reject / Hire candidates
- View AI-powered rankings

### Candidate
- Login with credentials provided by HR
- Upload resume (PDF/DOCX)
- Complete 3 assessment rounds: Aptitude → SQL → Coding
- Attend AI voice interview
- View status and results

## Recruitment Flow

```
Resume Upload → AI Screening → Aptitude → SQL → Coding → AI Interview → Ranking → HR Decision
```

## Project Structure

```
ai-interview-hiring-agent/
├── backend/
│   ├── app/
│   │   ├── agents/        # AI agents (screening, evaluation, ranking)
│   │   ├── api/routes/    # FastAPI route handlers
│   │   ├── core/          # Config, security, database
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── repositories/  # Data access layer
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # Business logic
│   ├── main.py
│   └── requirements.txt
└── frontend/
    └── src/
        ├── api/           # Axios client
        ├── components/    # Reusable UI components
        ├── context/       # Auth context
        ├── pages/
        │   ├── hr/        # HR dashboard, jobs, candidates, rankings
        │   └── candidate/ # Dashboard, resume, assessments, interview
        └── types/         # TypeScript interfaces
```
