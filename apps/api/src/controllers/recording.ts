import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const RECORDING_ANALYSIS_PROMPT = `You are an AI content analyst. Analyze the provided screenshot frames and tell me what you see and whether the content appears to be AI-generated.

Return your analysis as strict JSON with this schema:
{
  "username": "string - if you can identify a username or handle in the content, otherwise 'unknown'",
  "whatYouSee": "string - describe what you observe in the screenshots",
  "aiGeneratedLikelihood": "number between 0 and 1 - likelihood that the content is AI-generated"
}

Look for signs of AI generation like:
- Unnatural text or artifacts
- Inconsistent visual elements
- Too-perfect or synthetic appearance
- Watermarks from AI tools
- Unusual visual artifacts

Be conservative in your assessment.`;

async function analyzeFramesWithOpenAI(frames: string[]): Promise<{username: string, whatYouSee: string, aiGeneratedLikelihood: number}> {
  try {
    // Take up to 3 frames for analysis to avoid token limits
    const framesToAnalyze = frames.slice(0, 3);
    
    const imageContent = framesToAnalyze.map(frameBase64 => ({
      type: 'image_url' as const,
      image_url: {
        url: frameBase64,
        detail: 'high' as const
      }
    }));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: RECORDING_ANALYSIS_PROMPT
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Please analyze these ${framesToAnalyze.length} screenshot frames:` },
            ...imageContent
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error('No analysis received from OpenAI');
    }

    // Parse the JSON response
    try {
      const analysis = JSON.parse(analysisText);
      return {
        username: analysis.username || 'unknown',
        whatYouSee: analysis.whatYouSee || 'Unable to analyze content',
        aiGeneratedLikelihood: Math.max(0, Math.min(1, analysis.aiGeneratedLikelihood || 0))
      };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', analysisText);
      return {
        username: 'unknown',
        whatYouSee: 'Analysis completed but format parsing failed',
        aiGeneratedLikelihood: 0
      };
    }
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    return {
      username: 'unknown',
      whatYouSee: 'Analysis failed due to API error',
      aiGeneratedLikelihood: 0
    };
  }
}

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

    // Perform AI analysis on the frames
    console.log('Starting AI analysis...');
    const analysis = await analyzeFramesWithOpenAI(frames);
    console.log('AI analysis completed:', analysis);

    const response = {
      success: true,
      message: 'Recording received, saved, and analyzed',
      sessionId,
      frameCount: savedFrames.length,
      fps: metadata.fps,
      duration: metadata.duration,
      timestamp: metadata.timestamp,
      source: metadata.source,
      analysis: {
        username: analysis.username,
        whatYouSee: analysis.whatYouSee,
        aiGeneratedLikelihood: analysis.aiGeneratedLikelihood
      }
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