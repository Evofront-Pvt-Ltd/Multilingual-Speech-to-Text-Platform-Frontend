# VoiceBridge AI — Frontend

Enterprise Next.js client for the VoiceBridge AI multilingual speech-to-text and translation platform.

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Platform overview and activity metrics |
| Voice Recorder | `/recorder` | Capture audio with source language selection |
| Transcript Viewer | `/transcript` | Review speech-to-text output |
| Translation | `/translate` | Convert content between languages |
| History | `/history` | Archive of all transcripts and translations |

## Quick Start (Windows)

```powershell
cd "Multilingual-Speech-to-Text-Platform-Frontend"
.\start.ps1
```

Open **http://localhost:3000** (backend must be running on port 3001).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API base URL |

## User Flow

1. Select source language
2. Record voice in the browser
3. Audio is sent to the backend for transcription
4. Review the generated transcript
5. Select target language and translate
6. Access records in History
