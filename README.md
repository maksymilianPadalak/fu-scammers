# Turbo Browser Extension

A powerful AI-powered scam detection system with browser extension, web app, and Express API built with Turbo repo and pnpm.

## Project Structure

```
turbo-browser-extension/
├── apps/
│   ├── api/                 # Express API server (Port 3001)
│   │   ├── src/
│   │   │   ├── controllers/ # API controllers
│   │   │   ├── services/    # Business logic
│   │   │   ├── routes/      # API routes
│   │   │   ├── utils/       # AI analysis utilities
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── web/                 # React web app (Port 8080)
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   ├── pages/       # App pages
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── browser-extension/   # Chrome extension
│       ├── src/
│       │   ├── manifest.json
│       │   ├── popup.tsx    # Extension popup
│       │   ├── content.ts   # Content script
│       │   └── background.ts # Service worker
│       ├── vite.config.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm (install with `npm install -g pnpm`)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Start all development servers:
```bash
pnpm dev
```

This will start:
- **API server** on http://localhost:3001
- **Web app** on http://localhost:8080  
- **Browser extension** build watcher

### Usage

#### API Endpoints
- `GET /api/health` - Health check
- `POST /api/upload-video` - Upload video for AI analysis
- `POST /api/recording` - Browser extension frame analysis
- `GET /api/scammers` - Get potential scammers from database

#### Web App (http://localhost:8080)
- **Video Upload**: Upload videos with scammer info for AI analysis
- **AI Detection Results**: View detailed analysis with likelihood scores
- **Potential Scammers**: Database of flagged content with AI likelihood > 50%

#### Browser Extension

1. Build the extension:
```bash
cd apps/browser-extension
pnpm build
```

2. **Manual Installation** in Chrome/Edge:
   - Open `chrome://extensions/`
   - Enable "Developer mode" 
   - Click "Load unpacked"
   - Select the `apps/browser-extension/dist` folder

3. The extension provides:
   - **Screen Recording**: Capture frames at 10 FPS from any webpage
   - **AI Analysis**: Send captured frames to API for deepfake detection
   - **Real-time Results**: View AI likelihood scores and artifact detection

## Development

### Available Scripts

- `pnpm dev` - Start all development servers in parallel
- `pnpm build` - Build all apps  
- `pnpm lint` - Lint all apps
- `pnpm type-check` - Type check all apps

### API Development (Port 3001)
- Express.js server with hot reload enabled
- OpenAI integration for AI analysis
- Weaviate vector database for scammer storage
- Audio transcription with Whisper

### Web App Development (Port 8080) 
- React + TypeScript + Vite
- Brutal design system with Tailwind CSS
- Real-time frame streaming during analysis
- AI detection results visualization

### Extension Development
- TypeScript + Vite + @crxjs/vite-plugin
- **Manual upload required** after build to browser
- Chrome extension APIs for screen capture
- Real-time AI analysis integration

## Key Features

### 🤖 AI-Powered Detection
- **Video Analysis**: Upload videos for comprehensive AI analysis
- **Screen Recording**: Browser extension captures frames in real-time
- **Audio Transcription**: Automatic speech-to-text with Whisper
- **Artifact Detection**: Identifies temporal inconsistencies, edge halos, anatomical anomalies

### 🗄️ Scammer Database  
- **Automatic Storage**: AI likelihood > 50% automatically saved to Weaviate
- **Potential Scammers Page**: View all flagged content with metadata
- **Audio Transcriptions**: Preserved and displayed for context

### ⚠️ Smart Disclaimers
- **Low Risk Warning**: Automatic disclaimer for scores < 50%
- **VEO 3 Awareness**: Specific warnings about latest AI video models
- **User Education**: Guidance on manual verification and police contact

## Tech Stack

- **Monorepo**: Turbo + pnpm workspaces
- **API**: Express.js + TypeScript + OpenAI + Weaviate
- **Web**: React + TypeScript + Vite + Tailwind CSS
- **Extension**: TypeScript + Vite + @crxjs/vite-plugin + Chrome APIs
- **AI**: OpenAI GPT-4o + Whisper + Custom forensic prompts
- **Database**: Weaviate vector database
- **Build**: Turbo for orchestration

## Environment Setup

Create `.env` file in `apps/api/`:
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Weaviate Configuration  
WEAVIATE_API_KEY=your_weaviate_api_key_here
WEAVIATE_URL=https://your-cluster.weaviate.network

# Server Configuration
PORT=3001
WS_PORT=3789
```