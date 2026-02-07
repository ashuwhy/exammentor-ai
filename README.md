# ExamMentor AI

**Whole-Syllabus Reasoning Engine** – An autonomous learning system powered by Gemini 3 Pro that teaches, tests, and self-corrects in real-time.

> _"Not a prompt wrapper. A true Action Era AI that teaches itself."_

![Gemini 3 Pro](https://img.shields.io/badge/Gemini%203-Pro%20%26%20Flash-blue)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-green)

## Action Era Features

| Feature | Description |
|---------|-------------|
| **Autopilot Mode** | 30-minute autonomous learning sessions. AI selects topics, teaches micro-lessons, quizzes, and adapts. |
| **Self-Correcting Plans** | Watch the AI verify and fix its own study plans in real-time. |
| **Diagram Quiz** | Upload diagrams – get spatial questions like "the top-left section shows..." |

## Architecture

```
├── backend/                    # FastAPI + Python
│   ├── agents/                # 6 specialized AI agents
│   │   ├── plan_agent.py     # Self-correcting study plans
│   │   ├── tutor_agent.py    # Feynman-style explanations
│   │   ├── quiz_agent.py     # Adaptive quizzes
│   │   ├── evaluator_agent.py# Performance analysis
│   │   ├── misconception_agent.py
│   │   └── autopilot_agent.py# Marathon sessions
│   └── main.py               # FastAPI endpoints
│
└── frontend/                  # Next.js 15
    ├── app/                   # App router pages
    └── components/            # React components
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Gemini API Key

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "GEMINI_API_KEY=your_key_here" > .env
echo "GEMINI_MODEL=gemini-3-pro-preview" >> .env

# Run server
python main.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/plan/generate-verified` | POST | Generate self-correcting study plan |
| `/api/tutor/stream` | POST | Stream explanations (Feynman technique) |
| `/api/quiz/generate` | POST | Generate adaptive quiz |
| `/api/autopilot/start` | POST | Start autonomous learning session |
| `/api/analyze/performance` | POST | Analyze quiz performance |

## Testing

```bash
cd backend
python -m tests.test_setup     # Environment + import checks
python -m tests.test_gemini    # Basic Gemini connectivity
```

## License

MIT
