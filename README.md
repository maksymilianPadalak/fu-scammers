# Turbo Browser Extension

A minimal browser extension and Express API built with Turbo repo and pnpm.

## Project Structure

```
turbo-browser-extension/
├── apps/
│   ├── api/                 # Express API server
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── browser-extension/   # Browser extension
│       ├── src/
│       │   ├── manifest.json
│       │   ├── popup.html
│       │   ├── popup.ts
│       │   ├── content.ts
│       │   └── background.ts
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

2. Start development servers:
```bash
npm run dev:fast
```

This will start:
- API server on http://localhost:3001
- Browser extension build watcher

### Usage

#### API Endpoints
- `GET /api/health` - Health check
- `GET /api/data` - Sample data endpoint

#### Browser Extension

1. Build the extension:
```bash
cd apps/browser-extension
pnpm build
```

2. Load the extension in Chrome/Edge:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `apps/browser-extension/dist` folder

3. The extension provides:
   - **Fetch API Data**: Calls the API and displays response
   - **Highlight Page**: Highlights headings and paragraphs on the current page

## Development

### Available Scripts

- `npm run dev:fast` - Start all development servers in parallel
- `npm run build` - Build all apps
- `npm run lint` - Lint all apps
- `npm run type-check` - Type check all apps

### API Development
The API runs on port 3001 with hot reload enabled.

### Extension Development
The extension uses Vite with TypeScript and the @crxjs/vite-plugin for Chrome extension development. Changes are automatically rebuilt when using `dev` mode.

## Extension Features

- **Popup UI**: Clean interface with buttons to interact with API and page
- **Content Script**: Highlights page elements when requested
- **Background Service Worker**: Handles extension lifecycle events
- **Chrome APIs**: Uses activeTab, storage permissions

## Tech Stack

- **Monorepo**: Turbo + pnpm workspaces
- **API**: Express.js + TypeScript
- **Extension**: TypeScript + Vite + @crxjs/vite-plugin + Chrome APIs
- **Build**: Turbo for orchestration