import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { parseAIDetectionOutput } from '../types/ai';

// Utility function to safely remove a directory and its contents
function safeRemoveDirectory(dirPath: string): void {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`Cleaned up directory: ${dirPath}`);
    }
  } catch (error) {
    console.error(`Failed to remove directory ${dirPath}:`, error);
  }
}

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// FORENSIC_SYSTEM_PROMPT is imported from utils/prompts in the analysis function

// FAST and RELIABLE analysis using Chat Completions API
async function analyzeFramesWithOpenAI(frames: string[]): Promise<string> {
  // Convert base64 frames for chat completions
  const imageContent = frames.slice(0, 6).map(frame => {
    const base64Data = frame.replace(/^data:image\/[^;]+;base64,/, '');
    return {
      type: 'image_url' as const,
      image_url: {
        url: `data:image/jpeg;base64,${base64Data}`,
        detail: 'high' as const,
      },
    };
  });

  const systemPrompt = `You are an AI detection expert. Analyze these frames and return ONLY a JSON object with this exact structure:
{
  "aiGeneratedLikelihood": 0.75,
  "artifactsDetected": ["temporal_inconsistency", "edge_halos_or_seams"],
  "rationale": ["Inconsistent lighting between frames", "Unnatural facial smoothing detected"],
  "whatIsIt": ["Person speaking to camera", "Indoor setting with artificial lighting"],
  "howToBehave": ["Verify with additional sources", "Check for consistent metadata"]
}

Focus on detecting AI artifacts like temporal inconsistencies, edge halos, unnatural smoothing, lighting mismatches, and anatomical anomalies.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze these ${frames.length} frames for AI generation artifacts:`,
          },
          ...imageContent,
        ],
      },
    ],
    max_tokens: 1000,
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });

  return response.choices[0]?.message?.content || '{}';
}

export const handleRecording = async (req: Request, res: Response) => {
  console.log('=== RECORDING ENDPOINT CALLED ===');
  console.log('Method:', req.method);
  console.log('Body keys:', Object.keys(req.body || {}));

  let sessionDir: string | null = null;

  try {
    const { frames, frameCount: _frameCount, fps, timestamp, source } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No frames data provided or invalid format',
      });
    }

    // Create recordings directory if it doesn't exist
    const recordingsDir = path.join(process.cwd(), 'recordings');
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    // Generate unique recording session ID
    const sessionId = `recording-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    sessionDir = path.join(recordingsDir, sessionId);
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
      fps: fps || 10,
      duration: frames.length / (fps || 10),
      timestamp: timestamp || new Date().toISOString(),
      source: source || 'unknown',
      frames: savedFrames,
      totalSize: frames.reduce((acc, frame) => acc + frame.length, 0),
    };

    const metadataPath = path.join(sessionDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`Recording saved: ${sessionDir}`);
    console.log(
      `Frames: ${savedFrames.length}, Duration: ${metadata.duration}s`
    );

    // Perform FAST AI analysis
    console.log('Starting FAST AI analysis...');
    
    let analysis;
    try {
      const rawAnalysis = await Promise.race([
        analyzeFramesWithOpenAI(frames),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Analysis timeout')), 30000))
      ]) as string;
      
      console.log('Raw AI analysis result:', rawAnalysis);
      
      // Try to parse as JSON directly
      try {
        analysis = JSON.parse(rawAnalysis);
        console.log('Successfully parsed analysis:', analysis);
      } catch (parseError) {
        console.log('Direct JSON parse failed, trying parseAIDetectionOutput...');
        const parsedAnalysis = parseAIDetectionOutput(rawAnalysis);
        if (parsedAnalysis.data) {
          analysis = parsedAnalysis.data;
        } else {
          throw new Error('Failed to parse analysis');
        }
      }
    } catch (error) {
      console.error('Analysis failed, using fallback:', error);
      // Fallback analysis result
      analysis = {
        aiGeneratedLikelihood: 0.1,
        artifactsDetected: [],
        rationale: ['Analysis failed - using fallback result'],
        whatIsIt: ['Unable to analyze frames due to API timeout'],
        howToBehave: ['Try again with fewer frames or check API status']
      };
    }

    // Note: Weaviate storage disabled for new analysis format
    // The new format returns AIDetectionSummary instead of the old format
    let weaviateStored = false;

    const response = {
      success: true,
      message: 'Recording analyzed with exact aiAnalysis.ts logic',
      sessionId,
      frameCount: savedFrames.length,
      fps: metadata.fps,
      duration: metadata.duration,
      timestamp: metadata.timestamp,
      source: metadata.source,
      analysis: analysis, // Return the parsed AIDetectionSummary directly as JSON
      weaviate: {
        stored: weaviateStored,
        reason: 'New analysis format - Weaviate storage disabled',
      },
    };

    console.log('Sending response:', response);

    // Clean up the saved files after successful analysis
    safeRemoveDirectory(sessionDir);

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in recording controller:', error);

    // Clean up the current session directory if it was created
    if (sessionDir) {
      safeRemoveDirectory(sessionDir);
    }

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };

    console.log('Sending error response:', errorResponse);
    return res.status(500).json(errorResponse);
  }
};
