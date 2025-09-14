import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import {
  ensureVideosClass,
  storeAIDetectedUsername,
} from '../services/weaviate';

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

const FORENSIC_SYSTEM_PROMPT = `You are a forensic AI content analyst. Analyze the provided screenshot frames for signs of AI generation or camera capture.

Focus on these specific artifacts:
- TEMPORAL_INCONSISTENCY: Flickering textures, facial features that morph between frames, continuity errors
- EDGE_HALOS_OR_SEAMS: Unnatural edges, halos around objects, visible seams from compositing
- FINGER_OR_TEETH_ANOMALIES: Extra/missing fingers, warped hands, irregular teeth, asymmetrical eyes
- TEXTURE_OR_PORE_SMOOTHING: Waxy skin, overly smooth textures, missing skin pores
- LIGHTING_OR_REFLECTION_MISMATCH: Inconsistent lighting, impossible shadows, wrong reflections
- WEIRD_TEXT_OR_LOGOS: Gibberish text, warped logos, impossible writing
- MOTION_WOBBLE_OR_JELLY_FACES: Unnatural facial motion, wobbling features, jelly-like deformation

Be conservative - only flag as AI-generated with high confidence if multiple strong artifacts are present.`;

async function analyzeFramesWithOpenAI(frames: string[]): Promise<{
  username: string;
  whatYouSee: string;
  synthetic_likelihood: number;
  decision: string;
  artifacts: {
    temporal_inconsistency: boolean;
    edge_halos_or_seams: boolean;
    finger_or_teeth_anomalies: boolean;
    texture_or_pore_smoothing: boolean;
    lighting_or_reflection_mismatch: boolean;
    weird_text_or_logos: boolean;
    motion_wobble_or_jelly_faces: boolean;
  };
  notes: string;
}> {
  try {
    // Randomly select up to 10 frames from the entire array for analysis
    const framesToAnalyze =
      frames.length <= 6
        ? frames
        : frames
            .map((frame, index) => ({ frame, index, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .slice(0, 6)
            .map(item => item.frame);

    const imageContent = framesToAnalyze.map(frameBase64 => ({
      type: 'image_url' as const,
      image_url: {
        url: frameBase64,
        detail: 'high' as const,
      },
    }));

    const systemPrompt = FORENSIC_SYSTEM_PROMPT + `\n\nReturn your analysis as strict JSON with this exact schema:
{
  "username": "string - Username or handle visible in content, or 'unknown'",
  "whatYouSee": "string - Description of what is observed in the frames",
  "synthetic_likelihood": "number - Likelihood of AI generation (0.0 - 1.0)",
  "decision": "string - One of: ai_generated, camera_captured, uncertain",
  "artifacts": {
    "temporal_inconsistency": boolean,
    "edge_halos_or_seams": boolean,
    "finger_or_teeth_anomalies": boolean,
    "texture_or_pore_smoothing": boolean,
    "lighting_or_reflection_mismatch": boolean,
    "weird_text_or_logos": boolean,
    "motion_wobble_or_jelly_faces": boolean
  },
  "notes": "string - Brief notes on the analysis (max 200 chars)"
}`;

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
              text: `Analyze these ${framesToAnalyze.length} screenshot frames for AI artifacts:`,
            },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error('No analysis received from OpenAI');
    }

    console.log('OpenAI response:', analysisText);
    const analysisResult = JSON.parse(analysisText);

    return {
      username: analysisResult.username || 'unknown',
      whatYouSee: analysisResult.whatYouSee || 'Unable to analyze content',
      synthetic_likelihood: Math.max(
        0,
        Math.min(1, analysisResult.synthetic_likelihood || 0)
      ),
      decision: analysisResult.decision || 'uncertain',
      artifacts: {
        temporal_inconsistency:
          analysisResult.artifacts?.temporal_inconsistency || false,
        edge_halos_or_seams:
          analysisResult.artifacts?.edge_halos_or_seams || false,
        finger_or_teeth_anomalies:
          analysisResult.artifacts?.finger_or_teeth_anomalies || false,
        texture_or_pore_smoothing:
          analysisResult.artifacts?.texture_or_pore_smoothing || false,
        lighting_or_reflection_mismatch:
          analysisResult.artifacts?.lighting_or_reflection_mismatch || false,
        weird_text_or_logos:
          analysisResult.artifacts?.weird_text_or_logos || false,
        motion_wobble_or_jelly_faces:
          analysisResult.artifacts?.motion_wobble_or_jelly_faces || false,
      },
      notes: analysisResult.notes || 'No additional notes',
    };
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    return {
      username: 'unknown',
      whatYouSee: 'Analysis failed due to API error',
      synthetic_likelihood: 0,
      decision: 'uncertain',
      artifacts: {
        temporal_inconsistency: false,
        edge_halos_or_seams: false,
        finger_or_teeth_anomalies: false,
        texture_or_pore_smoothing: false,
        lighting_or_reflection_mismatch: false,
        weird_text_or_logos: false,
        motion_wobble_or_jelly_faces: false,
      },
      notes: 'OpenAI API call failed',
    };
  }
}

export const handleRecording = async (req: Request, res: Response) => {
  console.log('=== RECORDING ENDPOINT CALLED ===');
  console.log('Method:', req.method);
  console.log('Body keys:', Object.keys(req.body || {}));

  let sessionDir: string | null = null;

  try {
    const { frames, frameCount, fps, timestamp, source } = req.body;

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

    // Perform AI analysis on the frames
    console.log('Starting AI analysis...');
    const analysis = await analyzeFramesWithOpenAI(frames);
    console.log('AI analysis completed:', analysis);

    // Store in Weaviate if AI likelihood > 50% and username is not 'unknown'
    let weaviateStored = false;
    if (
      analysis.synthetic_likelihood > 0.5 &&
      analysis.username !== 'unknown'
    ) {
      console.log(
        `AI likelihood above threshold detected (${Math.round(analysis.synthetic_likelihood * 100)}%), storing in Weaviate...`
      );

      try {
        // Ensure the Videos class exists
        await ensureVideosClass();

        // Store the detection
        const weaviateResult = await storeAIDetectedUsername({
          username: analysis.username,
          aiGeneratedLikelihood: analysis.synthetic_likelihood,
          whatYouSee: analysis.whatYouSee,
          reasoning: analysis.notes,
          sessionId,
          timestamp: metadata.timestamp,
        });

        if (weaviateResult.success) {
          weaviateStored = true;
          console.log('Successfully stored flagged username in Weaviate');
        } else {
          console.error('Failed to store in Weaviate:', weaviateResult.error);
        }
      } catch (weaviateError) {
        console.error('Error during Weaviate storage:', weaviateError);
      }
    }

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
        synthetic_likelihood: analysis.synthetic_likelihood,
        decision: analysis.decision,
        artifacts: analysis.artifacts,
        notes: analysis.notes,
      },
      weaviate: {
        stored: weaviateStored,
        reason: weaviateStored
          ? 'AI likelihood above threshold detected'
          : analysis.synthetic_likelihood > 0.5
            ? 'Username unknown'
            : 'Low AI likelihood',
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
