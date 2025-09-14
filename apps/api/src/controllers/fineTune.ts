import type { Request, Response } from 'express';
import { extractFramesForFineTuning } from '../utils/fineTuneFrameExtraction';
import fs from 'fs';
import path from 'path';

interface VideoUploadRequest extends Request {
  file?: Express.Multer.File
  body: {
    fps?: string
    maxFrames?: string
    format?: 'jpg' | 'png'
    size?: string
  }
}

/**
 * Process uploaded video for fine-tuning by extracting indexed frames
 */
export const processFineTuneVideo = async (
  req: VideoUploadRequest,
  res: Response
) => {
  console.log('🎯 Fine-tune video processing started');
  console.log('Request headers:', req.headers);
  console.log('Request body keys:', Object.keys(req.body));
  console.log('Request file:', req.file ? 'present' : 'missing');
  
  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error:
          'No video file provided. Make sure to include a file with the key "video" in your form data.',
      });
    }

    console.log('🎯 Processing video for fine-tuning...');
    console.log('File:', {
      name: req.file.originalname,
      size: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
      path: req.file.path,
    });

    const fps = parseInt(req.body.fps || '1')
    const maxFrames = req.body.maxFrames
      ? parseInt(req.body.maxFrames)
      : undefined
    const format = req.body.format || 'jpg'
    const size = req.body.size || '-1:1080'

    // Extract frames for fine-tuning
    const extractionResult = await extractFramesForFineTuning(req.file.path, {
      fps,
      maxFrames,
      format: format as 'jpg' | 'png',
      size // User-selected size that preserves aspect ratio
    });


    // Prepare response
    const responseData = {
      success: true,
      message: 'Video processed successfully for fine-tuning',
      data: {
        video: {
          originalName: req.file.originalname,
          processedAt: new Date().toISOString(),
        },
        extraction: {
          frameCount: extractionResult.frameCount,
          framesFolder: extractionResult.folder,
          frameFiles: extractionResult.frames.map(framePath => ({
            name: path.basename(framePath),
            path: framePath,
          })),
          settings: {
            fps,
            maxFrames,
            format,
            size,
          },
        },
      },
    };

    console.log('Sending response:', JSON.stringify(responseData, null, 2));
    res.status(200).json(responseData);
    console.log(
      `✅ Fine-tuning processing completed: ${extractionResult.frameCount} frames extracted`
    );
  } catch (error) {
    console.error('❌ Error in fine-tune video processing:', error);


    return res.status(500).json({
      success: false,
      error: 'Internal server error during fine-tune video processing',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
