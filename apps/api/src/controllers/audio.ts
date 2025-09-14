import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const handleAudio = async (req: Request, res: Response) => {
  console.log('=== AUDIO ENDPOINT CALLED ===');
  console.log('Method:', req.method);
  console.log('Body keys:', Object.keys(req.body || {}));
  console.log('Audio size:', req.body?.size || 'unknown');

  try {
    const { audio, mimeType, timestamp, source, size } = req.body;

    if (!audio) {
      return res.status(400).json({
        success: false,
        error: 'No audio data provided'
      });
    }

    // Create audio directory if it doesn't exist
    const audioDir = path.join(process.cwd(), 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Determine file extension based on mime type
    let extension = '.webm';
    if (mimeType?.includes('mp3')) extension = '.mp3';
    else if (mimeType?.includes('wav')) extension = '.wav';
    else if (mimeType?.includes('ogg')) extension = '.ogg';

    // Generate unique filename
    const filename = `audio-${Date.now()}-${Math.round(Math.random() * 1000)}${extension}`;
    const filepath = path.join(audioDir, filename);

    // Save the audio file
    fs.writeFileSync(filepath, audio, 'base64');

    console.log(`Audio saved: ${filepath}`);
    console.log(`File size: ${fs.statSync(filepath).size} bytes`);

    const response = {
      success: true,
      message: 'Audio received and saved',
      filename,
      mimeType: mimeType || 'unknown',
      timestamp: timestamp || new Date().toISOString(),
      source: source || 'unknown',
      originalSize: size || 0,
      savedSize: fs.statSync(filepath).size
    };

    console.log('Sending response:', response);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in audio controller:', error);

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    };

    console.log('Sending error response:', errorResponse);
    return res.status(500).json(errorResponse);
  }
};