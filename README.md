# TruthLens — News Credibility Explorer

A React and FastAPI application for exploring the credibility of article URLs, text, and images. It combines source information, fact-check lookup, optional web evidence, and model-generated analysis in an interactive interface.

[Open the demo](https://fakenewsdetector-two.vercel.app)

## Features

- Analyze article URLs or pasted text.
- Submit an image for analysis with optional context.
- Follow verification progress through streamed events.
- Inspect reasoning and supporting evidence.
- Ask follow-up questions about an analysis.

Results are research aids. Model-generated verdicts and scores can be wrong and do not establish that a claim is true or false.

## Stack

React, Vite, FastAPI, Python, a MiniMax integration through the OpenAI client library, optional Brave Search, and optional Google Fact Check Tools.

## Run locally

Install Python, Node.js, and npm.

```bash
git clone https://github.com/muhammadfirdous/fakenewsdetector.git
cd fakenewsdetector
python3 -m venv .venv
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -r fake_news_detector/requirements.txt
cd fake_news_detector
cp .env.example .env
```

Set your own values in `.env`:

| Variable | Purpose |
| --- | --- |
| `MINIMAX_API_KEY` | Model-backed analysis and follow-up chat |
| `BRAVE_SEARCH_API_KEY` | Optional web corroboration for verification |
| `GOOGLE_API_KEY` | Optional legacy article fact-check lookup |

Keep keys in your local environment. Missing services limit the available evidence or functionality; do not interpret fallback output as a completed live verification.

Start the backend on port 8001 to match the frontend's development default:

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

In a second terminal, from the repository root:

```bash
cd fake-news-frontend
npm ci
npm run dev
```

Open the URL printed by Vite. Set `VITE_API_URL` in the frontend environment if using another backend address. Interactive API documentation is at `http://127.0.0.1:8001/docs`.

## Repository map

| Path | Purpose |
| --- | --- |
| `fake-news-frontend/` | React application |
| `fake_news_detector/` | Analysis, scraping, verification, and FastAPI routes |
| `api/index.py` | Hosted API entry point |
| `vercel.json` | Vercel deployment configuration |
| Root HTML and extracted JSX files | Earlier interface prototypes |

The root guide reflects the current environment variables and local port configuration; the backend's older README describes an earlier integration.

## Frontend production build

```bash
cd fake-news-frontend
npm run build
```

A hosted deployment also needs server-side API keys and the Python API configured. The frontend build alone does not provide verification services.
