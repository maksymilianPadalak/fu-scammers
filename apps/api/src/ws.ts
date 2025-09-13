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

// Store frame data for looping
interface FrameStreamData {
  frames: string[];
  isStreaming: boolean;
  intervalId?: NodeJS.Timeout;
}

const activeStreams = new Map<string, FrameStreamData>();

// Function to stream frames from a video file
async function streamFramesFromVideo(videoPath: string, send: (obj: unknown) => void) {
  send({ type: 'status', message: 'Extracting frames for preview…' });

  try {
    // Extract more frames for better animation (e.g., 15 frames)
    const { frames } = await extractFrames(videoPath, {
      fps: 1,
      maxFrames: 15,
      size: '640x360',
      outputDir: path.dirname(videoPath),
    });

    // Convert frames to base64 data URLs
    const frameDataUrls: string[] = [];
    for (const framePath of frames) {
      if (fs.existsSync(framePath)) {
        const buf = fs.readFileSync(framePath);
        const b64 = buf.toString('base64');
        frameDataUrls.push(`data:image/jpeg;base64,${b64}`);
      }
    }

    if (frameDataUrls.length === 0) {
      send({ type: 'error', message: 'No frames could be extracted' });
      return;
    }

    // Store frame data and start streaming
    const streamData: FrameStreamData = {
      frames: frameDataUrls,
      isStreaming: true
    };
    activeStreams.set(videoPath, streamData);

    send({ type: 'status', message: 'Starting frame preview…' });

    // Start streaming frames every 500ms with looping
    let currentIndex = 0;
    streamData.intervalId = setInterval(() => {
      if (!streamData.isStreaming) {
        clearInterval(streamData.intervalId!);
        return;
      }

      send({ 
        type: 'frame', 
        index: currentIndex, 
        total: frameDataUrls.length, 
        image: frameDataUrls[currentIndex] 
      });

      currentIndex = (currentIndex + 1) % frameDataUrls.length; // Loop back to start
    }, 500); // Send frame every 500ms

    send({ type: 'status', message: 'Frame preview active. Analysis in progress…' });
  } catch (err) {
    send({ type: 'error', message: err instanceof Error ? err.message : 'Frame extraction failed' });
  }
}

// Function to stop streaming for a specific video
export function stopFrameStreaming(videoPath: string) {
  const streamData = activeStreams.get(videoPath);
  if (streamData) {
    streamData.isStreaming = false;
    if (streamData.intervalId) {
      clearInterval(streamData.intervalId);
    }
    activeStreams.delete(videoPath);
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
