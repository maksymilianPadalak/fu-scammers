import { Server as WSServer } from 'ws';
import type { Server as HTTPServer } from 'http';
import fs from 'fs';
import path from 'path';
import { extractFrames } from './utils/frameExtraction';

// Message protocol
// Client -> Server: { type: 'start', videoPath: string }
// Server -> Client:
//   { type: 'status', message: string }
//   { type: 'frame', index: number, total?: number, image: string } // image is data URL
//   { type: 'analysis_status', status: 'starting' | 'processing' | 'completed' | 'error', message?: string }
//   { type: 'done' }
//   { type: 'error', message: string }

let globalWSS: WSServer | null = null;

export function setupWebSocket(server: HTTPServer, opts?: { port?: number; path?: string }) {
  const wsPath = opts?.path ?? '/ws';

  // Either attach to the existing HTTP server or start on its own port
  const wss = opts?.port
    ? new WSServer({ port: opts.port, path: wsPath })
    : new WSServer({ server, path: wsPath });

  globalWSS = wss; // Store reference for broadcasting

  if (opts?.port) {
    console.log(`🔌 WebSocket server listening on ws://localhost:${opts.port}${wsPath}`);
  }

  wss.on('connection', (ws) => {
    const send = (obj: unknown) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(obj));

    send({ type: 'status', message: 'Connected. Ready to stream frames.' });

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg?.type === 'start' && typeof msg.videoPath === 'string') {
          const videoPath = msg.videoPath as string;
          if (!fs.existsSync(videoPath)) {
            send({ type: 'error', message: `File not found: ${videoPath}` });
            return;
          }

          await streamFramesFromVideo(videoPath, send);
        } else {
          send({ type: 'error', message: 'Unsupported message. Send {type:"start", videoPath}' });
        }
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
      }
    });
  });
}

// Function to stream frames from a video file
async function streamFramesFromVideo(videoPath: string, send: (obj: unknown) => void) {
  send({ type: 'status', message: 'Extracting frames…' });

  try {
    // Extract a quick set of frames for preview (e.g., 8 frames)
    const { frames } = await extractFrames(videoPath, {
      fps: 1.5,
      maxFrames: 8,
      size: '640x360',
      outputDir: path.dirname(videoPath),
    });

    // Stream frames as base64 data URLs with a slight delay for animation effect
    const total = frames.length;
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      if (fs.existsSync(f)) {
        const buf = fs.readFileSync(f);
        const b64 = buf.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${b64}`;
        send({ type: 'frame', index: i, total, image: dataUrl });
        await delay(300); // Slightly slower for better visual effect
      }
    }

    send({ type: 'status', message: 'Frame extraction complete. Analysis in progress…' });
  } catch (err) {
    send({ type: 'error', message: err instanceof Error ? err.message : 'Frame extraction failed' });
  }
}

// Function to broadcast analysis status to all connected clients
export function broadcastAnalysisStatus(status: 'starting' | 'processing' | 'completed' | 'error', message?: string) {
  if (!globalWSS) return;

  const payload = { type: 'analysis_status', status, message };
  globalWSS.clients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  });
}

// Function to trigger frame streaming for a video (called from upload endpoint)
export function triggerFrameStreaming(videoPath: string) {
  if (!globalWSS) return;

  globalWSS.clients.forEach(async (ws) => {
    if (ws.readyState === ws.OPEN) {
      const send = (obj: unknown) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(obj));
      await streamFramesFromVideo(videoPath, send);
    }
  });
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
