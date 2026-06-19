# VoiceBridge AI — Frontend

Next.js client for the VoiceBridge AI multilingual speech-to-text and translation PoC (Phase 1).

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Platform status, engine health, quick start |
| Voice Studio | `/recorder` | Live recording, waveform, real-time transcript preview |
| Transcript Viewer | `/transcript` | Review neural speech-to-text output |
| Translation | `/translate` | Manual source/target language translation |
| History | `/history` | Archive of transcripts and translations |

## Quick Start (Windows)

**Terminal 1 — Backend (required first):**
```powershell
cd "Multilingual-Speech-to-Text-Platform-backend"
.\start.ps1
```
Wait for `Whisper neural engine ready.`

**Terminal 2 — Frontend:**
```powershell
cd "Multilingual-Speech-to-Text-Platform-Frontend"
.\start.ps1
```

Open **http://localhost:3000**

## Phase 1 Demo Flow

1. Open **Voice Studio** (`/recorder`)
2. Select source language (e.g. English, Kannada, Hindi)
3. Press record — speak for **5+ seconds** — words appear live
4. Stop — neural engine finalizes transcript
5. Click **Translate** — pick target language — view translation
6. Check **History** for stored records

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API base URL |

## Browser Support

- **Chrome / Edge** — recommended (live speech preview + recording)
- **Firefox** — recording works; live preview may be limited
- **Safari** — recording works on HTTPS; test before client demo

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Red error on record | Restart backend with `.\start.ps1` in backend folder |
| Old demo text in history | Cleared in backend `data/transcripts.json` — record fresh |
| Sidebar shows "Engine Loading" | Wait 1–2 min for Whisper model on first run |
| Translation fails | Backend needs internet for Google translate client |
