import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const handleScreenshot = async (req: Request, res: Response) => {
  console.log('=== SCREENSHOT ENDPOINT CALLED ===');
  console.log('Method:', req.method);
  console.log('Body keys:', Object.keys(req.body || {}));

  try {
    const { image, timestamp, source } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'No image data provided'
      });
    }

    // Extract base64 data from data URL
    const base64Data = image.replace(/^data:image\/png;base64,/, '');
    
    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `screenshot-${Date.now()}-${Math.round(Math.random() * 1000)}.png`;
    const filepath = path.join(screenshotsDir, filename);

    // Save the image
    fs.writeFileSync(filepath, base64Data, 'base64');

    console.log(`Screenshot saved: ${filepath}`);

    const response = {
      success: true,
      message: 'Screenshot received and saved',
      filename,
      timestamp: timestamp || new Date().toISOString(),
      source: source || 'unknown',
      size: base64Data.length
    };

    console.log('Sending response:', response);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in screenshot controller:', error);

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    };

    console.log('Sending error response:', errorResponse);
    return res.status(500).json(errorResponse);
  }
};