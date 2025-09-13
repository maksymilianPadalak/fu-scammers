import type { Request, Response } from 'express';
import { processVideoUpload } from '../services/video';
import { extractAndAnalyze } from '../services/frameAnalysis';
import { parseAIDetectionOutput } from '../types/ai';
import { triggerFrameStreaming, broadcastAnalysisStatus, stopFrameStreaming } from '../ws';
import fs from 'fs';
import path from 'path';

interface VideoUploadRequest extends Request {
  file?: Express.Multer.File;
  body: {
    description?: string;
    tags?: string;
    [key: string]: any;
  };
}

/**
 * Handle video upload, processing, and AI-generated content analysis
 * Processes one frame from the uploaded video and analyzes it using GPT-5
 */
export const uploadVideo = async (req: VideoUploadRequest, res: Response) => {
  logRequestDetails(req);

  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error:
          'No video file provided. Make sure to include a file with the key "video" in your form data.',
      });
    }

    const additionalInfo = req.body.description || req.body.info || null;

    // Step 1: Process and validate the video upload
    console.log('🎦 Processing video upload...');
    const uploadResult = await processVideoUpload(req.file, additionalInfo);

    if (!uploadResult.success) {
      return res.status(400).json({
        success: false,
        error: uploadResult.error,
      });
    }

    // Step 1.5: Trigger frame streaming immediately for loading animation
    console.log('🎥 Starting frame streaming for live preview...');
    triggerFrameStreaming(req.file.path);
    broadcastAnalysisStatus('starting', 'Analyzing video for AI-generated content...');

    // Step 2: Extract first frame and analyze for AI-generated content
    console.log('🔍 Starting AI-generated content detection...');
    broadcastAnalysisStatus('processing', 'Running AI detection algorithms...');
    const frameAnalysis = await extractAndAnalyze(req.file.path);

    if (!frameAnalysis.success || !frameAnalysis.analysis) {
      broadcastAnalysisStatus('error', frameAnalysis.error || 'AI analysis failed');
      
      // Clean up files even on analysis failure
      stopFrameStreaming(req.file.path);
      await cleanupVideoFile(req.file.path);
      await cleanupExtractedFrames(req.file.path);
      
      return res.status(502).json({
        success: false,
        error: frameAnalysis.error || 'AI analysis failed',
      });
    }

    // Step 3: Parse and structure the AI analysis results
    console.log('📊 Parsing AI analysis results...');
    const parsedAnalysis = parseAIDetectionOutput(frameAnalysis.analysis);

    // Step 4: Prepare and send successful response
    const responseData = buildSuccessResponse(
      uploadResult.metadata!,
      req.file.path,
      frameAnalysis.analysis,
      parsedAnalysis
    );

    broadcastAnalysisStatus('completed', 'Analysis completed successfully!');
    
    // Stop frame streaming since analysis is complete
    stopFrameStreaming(req.file.path);
    
    res.status(200).json(responseData);
    console.log('✅ Video upload and analysis completed successfully');

    // Step 5: Clean up uploaded video file and extracted frames (after response sent)
    await cleanupVideoFile(req.file.path);
    await cleanupExtractedFrames(req.file.path);
  } catch (error) {
    console.error('❌ Error in video upload controller:', error);
    
    // Clean up files even on server error
    if (req.file) {
      try {
        stopFrameStreaming(req.file.path);
        await cleanupVideoFile(req.file.path);
        await cleanupExtractedFrames(req.file.path);
      } catch (cleanupError) {
        console.error('⚠️ Failed to cleanup files after error:', cleanupError);
      }
    }
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error during video upload',
    });
  }
};

/**
 * Log incoming request details for debugging
 */
const logRequestDetails = (req: VideoUploadRequest): void => {
  console.log('\n=== VIDEO UPLOAD REQUEST ===');
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body:', req.body);
  console.log(
    'File:',
    req.file
      ? {
          name: req.file.originalname,
          type: req.file.mimetype,
          size: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
        }
      : 'No file uploaded'
  );
  console.log('============================\n');
};

/**
 * Build the success response object with structured data
 */
const buildSuccessResponse = (
  metadata: any,
  filePath: string,
  rawAnalysis: string,
  parsedAnalysis: any
) => {
  return {
    success: true,
    message: 'Video uploaded and analyzed successfully',
    data: {
      video: {
        metadata,
        uploadedAt: new Date().toISOString(),
        filePath,
      },
      analysis: {
        success: true,
        raw: rawAnalysis,
        parsed: parsedAnalysis.data,
        parseError: parsedAnalysis.error,
        // Backward compatibility fields
        frames: Array.isArray(parsedAnalysis.data)
          ? parsedAnalysis.data
          : undefined,
        summary: !Array.isArray(parsedAnalysis.data)
          ? parsedAnalysis.data
          : undefined,
      },
    },
  };
};

/**
 * Safely clean up the uploaded video file
 */
const cleanupVideoFile = async (filePath: string): Promise<void> => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🧡 Video file cleaned up:', filePath);
    }
  } catch (error) {
    console.error('⚠️ Failed to cleanup video file:', filePath, error);
  }
};

/**
 * Clean up extracted frame files and folders
 */
const cleanupExtractedFrames = async (videoPath: string): Promise<void> => {
  try {
    const videoDir = path.dirname(videoPath);
    
    // Find and delete frame folders (they have pattern like frames-1234567-abc123)
    const items = fs.readdirSync(videoDir);
    let deletedFolders = 0;
    let deletedFiles = 0;
    
    for (const item of items) {
      const itemPath = path.join(videoDir, item);
      const stat = fs.lstatSync(itemPath);
      
      // Delete frame folders created by extractFrames
      if (stat.isDirectory() && item.startsWith('frames-')) {
        try {
          // Delete all files in the folder first
          const frameFiles = fs.readdirSync(itemPath);
          for (const frameFile of frameFiles) {
            const frameFilePath = path.join(itemPath, frameFile);
            fs.unlinkSync(frameFilePath);
            deletedFiles++;
          }
          // Then delete the folder
          fs.rmdirSync(itemPath);
          deletedFolders++;
        } catch (err) {
          console.error('⚠️ Failed to delete frame folder:', itemPath, err);
        }
      }
      // Also clean up any loose frame files that might exist
      else if (stat.isFile() && (item.startsWith('frame-') || item.includes('frame_')) && (item.endsWith('.jpg') || item.endsWith('.png'))) {
        try {
          fs.unlinkSync(itemPath);
          deletedFiles++;
        } catch (err) {
          console.error('⚠️ Failed to delete frame file:', itemPath, err);
        }
      }
    }
    
    if (deletedFolders > 0 || deletedFiles > 0) {
      console.log(`🧡 Cleaned up ${deletedFolders} frame folders and ${deletedFiles} frame files`);
    }
  } catch (error) {
    console.error('⚠️ Failed to cleanup extracted frames:', error);
  }
};
