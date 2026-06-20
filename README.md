# MedPilot 🏥
An AI-powered clinical documentation assistant that automatically transcribes doctor-patient consultations, generates SOAP notes, suggests possible conditions and tests, and tracks pending reports with critical alerts.

## Features
- 🎙 Upload consultation audio — transcribed instantly via Deepgram
- ✏️ Edit transcript before analysis — fix errors before generating notes
- 🧠 AI-generated SOAP notes — structured clinical documentation in seconds
- 🔬 Condition suggestions — 3 possible diagnoses with likelihood and recommended tests
- 📋 Report tracker — track pending tests per patient
- ⚠️ Critical flag — alert doctors immediately when a result is critical

## Tech stack
- **Backend** — FastAPI, Python
- **Transcription** — Deepgram Nova-2
- **AI** — OpenAI GPT-4o-mini
- **Database** — SQLite
- **Frontend** — HTML, CSS, JavaScript, Bootstrap 5

## How to run locally

### 1. Clone the repo
```bash
git clone https://github.com/asj327/medpilot.git
cd medpilot
```

### 2. Create and activate virtual environment
```bash
python -m venv venv
venv\Scripts\activate
```   
 
### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Add API keys
```bash
Create a `.env` file in the root folder:
DEEPGRAM_API_KEY=your_deepgram_key_here
OPENAI_API_KEY=your_openai_key_here
```
### 5. Start the server
```bash
uvicorn main:app --reload
```

### 6. Open in browser
```bash
http://127.0.0.1:8000/static/index.html
```
## Project structure
medpilot/

├── static/

│   ├── index.html       # New consultation page

│   ├── reports.html     # Report tracker page

│   ├── main.js          # Consultation page logic

│   ├── reports.js       # Report tracker logic

│   └── style.css        # Shared styles

├── main.py              # FastAPI backend

├── requirements.txt     # Python dependencies

└── .env                 # API keys (not committed)

## API routes
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/transcribe` | Upload audio → get transcript |
| POST | `/analyse` | Transcript → SOAP note + conditions |
| POST | `/reports` | Save suggested tests to database |
| GET | `/reports` | Fetch all pending reports |
| PATCH | `/reports/{id}/critical` | Flag a report as critical |