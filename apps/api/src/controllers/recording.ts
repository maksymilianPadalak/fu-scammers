import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

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

const RECORDING_ANALYSIS_PROMPT = `You are a forensic AI content analyst. Analyze the provided screenshot frames and tell me what you see and whether the content appears to be AI-generated.

Follow these analysis rules:
- Look for WATERMARK: if the watermark is from AI company then you can stop research and return 1 for likelihood
- Look for FRAME-LEVEL ARTIFACTS:
  • extra or missing fingers, warped hands
  - extra limbs
  - not natural environment 
  • irregular teeth, asymmetrical or glassy eyes
  • gibberish or warped text/logos
  • inconsistent lighting, shadows, reflections
  • waxy or overly smooth skin, warped backgrounds
- Look for TEMPORAL ARTIFACTS across frames:
  • flickering textures, inconsistent details
  • facial features that morph or jitter
  • continuity errors (hair, beards, accessories popping in/out)
  • unnatural or robotic motion
  • inconsistent or missing motion blur
- Look for AUDIO ARTIFACTS (if applicable):
  • flat or robotic prosody
  • missing breaths or unnatural pauses
  • overly clear or stilted pronunciation
  • mismatched background ambience
  • digital glitches or looping noise
- Be CONSERVATIVE: only assign a high AI likelihood if multiple strong signs are present across modalities
- If evidence is weak or ambiguous, return a low likelihood and explain why it seems authentic
- Always return STRICT JSON, no prose outside it

IMPORTANT: You must respond with ONLY valid JSON. No markdown, no explanations, just the JSON object.

Return your analysis as strict JSON with this exact schema:
{
  "username": "string - if you can identify a username or handle in the content, otherwise unknown",
  "whatYouSee": "string - describe what you observe in the screenshots",
  "reasoning": "string - explain your analysis and what evidence you found",
  "aiGeneratedLikelihood": float with 0.01 step
}

aiGeneratedLikelihood should be a number between 0.0 and 1.0 based on the strength of evidence found.`;

async function analyzeFramesWithOpenAI(frames: string[]): Promise<{
  username: string;
  whatYouSee: string;
  reasoning: string;
  aiGeneratedLikelihood: number;
}> {
  try {
    // Take up to 3 frames for analysis to avoid token limits
    const framesToAnalyze = frames.slice(0, 3);

    const imageContent = framesToAnalyze.map(frameBase64 => ({
      type: 'image_url' as const,
      image_url: {
        url: frameBase64,
        detail: 'high' as const,
      },
    }));

    const response = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: RECORDING_ANALYSIS_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please analyze these ${framesToAnalyze.length} screenshot frames:`,
            },
            ...imageContent,
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error('No analysis received from OpenAI');
    }

    console.log('OpenAI raw response:', analysisText);

    // Try to extract JSON from the response (sometimes it's wrapped in markdown)
    let cleanedText = analysisText.trim();

    // Remove markdown code blocks if present
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    try {
      const analysis = JSON.parse(cleanedText);
      console.log('Parsed analysis:', analysis);

      return {
        username: analysis.username || 'unknown',
        whatYouSee: analysis.whatYouSee || 'Unable to analyze content',
        reasoning: analysis.reasoning || 'No reasoning provided',
        aiGeneratedLikelihood: Math.max(
          0,
          Math.min(1, parseFloat(analysis.aiGeneratedLikelihood) || 0)
        ),
      };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', cleanedText);
      console.error('Parse error:', parseError);

      // Try to extract information manually if JSON parsing fails
      const fallbackAnalysis = {
        username: 'unknown',
        whatYouSee:
          analysisText.length > 200
            ? analysisText.substring(0, 200) + '...'
            : analysisText,
        reasoning: 'JSON parsing failed, using fallback analysis',
        aiGeneratedLikelihood: 0,
      };

      console.log('Using fallback analysis:', fallbackAnalysis);
      return fallbackAnalysis;
    }
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    return {
      username: 'unknown',
      whatYouSee: 'Analysis failed due to API error',
      reasoning: 'OpenAI API call failed',
      aiGeneratedLikelihood: 0,
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
      fps: fps || 2,
      duration: frames.length / (fps || 2),
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
        reasoning: analysis.reasoning,
        aiGeneratedLikelihood: analysis.aiGeneratedLikelihood,
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
