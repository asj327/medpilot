# MedPilot 🏥
An AI-powered clinical documentation assistant that automatically transcribes 
doctor-patient consultations, generates SOAP notes, suggests possible conditions 
and tests, tracks pending reports, analyses lab report PDFs, and alerts doctors 
about critical findings — reducing paperwork and improving patient safety.

## Features
- 🎙 **Consultation transcription** — upload audio, transcribed instantly via Deepgram Nova-2
- 👥 **Auto speaker detection** — automatically identifies Doctor and Patient speech using AI role mapping
- ⇄ **Swap speakers** — one click to correct speaker labels if misidentified
- ✏️ **Editable transcript** — review and fix transcript before analysis
- 🧠 **AI SOAP notes** — structured clinical documentation generated in under 3 seconds
- 🔬 **Condition suggestions** — 3 possible diagnoses with likelihood ratings and recommended tests
- ✍️ **Sign & Order** — checkbox-based test ordering with single click confirmation
- 📋 **Report tracker** — track pending tests per patient with status updates
- ⚠️ **Critical flag** — instant alert when a test result is flagged as critical
- 📄 **PDF report analysis** — upload lab report PDFs, auto-extract findings, flag abnormal values


## Tech stack
- **Backend** — FastAPI, Python
- **Transcription** — Deepgram Nova-2
- **AI** — OpenAI GPT-4o-mini
- **Database** — SQLite
- **Frontend** — HTML, CSS, JavaScript
- **PDF parsing** — PyMuPDF

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
Create a .env file in the root folder:
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
## How It Works

### Consultation flow
1. Doctor enters patient name and uploads a `.mp3` / `.wav` / `.m4a` recording
2. Deepgram Nova-2 transcribes the audio with speaker diarization
3. GPT-4o-mini auto-detects which speaker is the Doctor and which is the Patient
4. Doctor reviews the labelled transcript, edits if needed, confirms
5. GPT-4o-mini generates a structured SOAP note and 3 condition suggestions
6. Doctor selects tests using checkboxes and clicks Sign & Order
7. Ordered tests are saved to the report tracker

### Report tracker flow
1. All pending tests visible per patient
2. Doctor ticks critical checkbox when an abnormal result arrives
3. Row turns red, critical alert banner appears at top
4. Doctor uploads lab report PDF — MedPilot extracts text and analyses findings
5. Abnormal values flagged automatically with clinical recommendations


## Project structure
```bash
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
```

## API routes
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/transcribe` | Upload audio → get transcript |
| POST | `/analyse` | Transcript → SOAP note + conditions |
| POST | `/reports` | Save suggested tests to database |
| GET | `/reports` | Fetch all pending reports |
| PATCH | `/reports/{id}/critical` | Flag a report as critical |
