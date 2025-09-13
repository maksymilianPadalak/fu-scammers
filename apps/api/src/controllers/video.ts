import type { Request, Response } from 'express';
import { processVideoUpload } from '../services/video';
import { extractFirstFrameAndAnalyze } from '../services/frameAnalysis';
import fs from 'fs';

interface VideoUploadRequest extends Request {
  file?: Express.Multer.File;
  body: {
    description?: string;
    tags?: string;
    [key: string]: any;
  };
}

export const uploadVideo = async (req: VideoUploadRequest, res: Response) => {
  console.log('=== VIDEO UPLOAD ENDPOINT CALLED ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log(
    'File:',
    req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        }
      : 'No file'
  );

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error:
          'No video file provided. Make sure to include a file with the key "video" in your form data.',
      });
    }

    // Get additional info from request body
    const additionalInfo = req.body.description || req.body.info || null;

    // Process the video upload
    const result = await processVideoUpload(req.file, additionalInfo);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    // Extract first frame and analyze for AI-generated content
    console.log('Starting AI-generated video detection...')
    const frameAnalysis = await extractFirstFrameAndAnalyze(req.file.path)
    
    // Prepare successful response with frame analysis
    const responseData = {
      success: true,
      message: 'Video uploaded, processed, and analyzed successfully',
      data: {
        metadata: result.metadata,
        uploadedAt: new Date().toISOString(),
        filePath: req.file.path,
        frameAnalysis: {
          success: frameAnalysis.success,
          analysis: frameAnalysis.analysis,
          error: frameAnalysis.error
        }
      },
    };

    // Send the response first
    res.status(200).json(responseData)

    // Clean up the video file after successful response
    try {
      if (fs.existsSync(req.file!.path)) {
        fs.unlinkSync(req.file!.path)
        console.log('✅ Video file cleaned up:', req.file!.path)
      }
    } catch (error) {
      console.error('❌ Failed to cleanup video file:', req.file!.path, error)
    }
  } catch (error) {
    console.error('Error in video upload controller:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error during video upload',
    });
  }
};
