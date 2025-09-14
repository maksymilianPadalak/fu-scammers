import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const handleRecording = async (req: Request, res: Response) => {
  console.log('=== RECORDING ENDPOINT CALLED ===');
  console.log('Method:', req.method);
  console.log('Body keys:', Object.keys(req.body || {}));

  try {
    const { frames, frameCount, fps, timestamp, source } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No frames data provided or invalid format'
      });
    }

    // Create recordings directory if it doesn't exist
    const recordingsDir = path.join(process.cwd(), 'recordings');
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    // Generate unique recording session ID
    const sessionId = `recording-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    const sessionDir = path.join(recordingsDir, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    console.log(`Processing ${frames.length} frames for session ${sessionId}`);

    // Save each frame as a separate PNG file
    const savedFrames: string[] = [];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      
      // Extract base64 data from data URL
      const base64Data = frame.replace(/^data:image\/png;base64,/, '');
      
      // Generate frame filename with zero-padded index
      const frameNumber = String(i + 1).padStart(4, '0');
      const filename = `frame-${frameNumber}.png`;
      const filepath = path.join(sessionDir, filename);
      
      // Save the frame
      fs.writeFileSync(filepath, base64Data, 'base64');
      savedFrames.push(filename);
    }

    // Create a metadata file for the recording session
    const metadata = {
      sessionId,
      frameCount: frames.length,
      fps: fps || 2,
      duration: frames.length / (fps || 2),
      timestamp: timestamp || new Date().toISOString(),
      source: source || 'unknown',
      frames: savedFrames,
      totalSize: frames.reduce((acc, frame) => acc + frame.length, 0)
    };

    const metadataPath = path.join(sessionDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`Recording saved: ${sessionDir}`);
    console.log(`Frames: ${savedFrames.length}, Duration: ${metadata.duration}s`);

    const response = {
      success: true,
      message: 'Recording received and saved',
      sessionId,
      frameCount: savedFrames.length,
      fps: metadata.fps,
      duration: metadata.duration,
      timestamp: metadata.timestamp,
      source: metadata.source
    };

    console.log('Sending response:', response);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in recording controller:', error);

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    };

    console.log('Sending error response:', errorResponse);
    return res.status(500).json(errorResponse);
  }
};