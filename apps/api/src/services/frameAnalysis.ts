import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { extractFrames } from '../utils/frameExtraction';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Minimal, strict system prompt
const AI_DETECTION_SYSTEM_PROMPT = `You are a forensic video analyst AI.
Return JSON only with keys: ai_generated_likelihood (0..1), label (ai|human|uncertain), artifacts_detected [string], rationale [string].`;

export interface FrameAnalysisResult {
  success: boolean;
  frameExtracted: boolean;
  framePath?: string;
  analysis?: string;
  error?: string;
}

// Analyze only the first extracted frame (keep a single OpenAI request)
export const extractFirstFrameAndAnalyze = async (
  videoPath: string,
  outputDir: string = path.dirname(videoPath)
): Promise<FrameAnalysisResult> => {
  const { frames, folder } = await extractFrames(videoPath, {
    fps: 10,        // default 10 fps as requested
    maxFrames: 1,   // extract only one frame for analysis
    outputDir,
  });

  const framePath = frames[0];

  try {
    if (!framePath) throw new Error('No frame extracted to analyze');

    const analysis = await analyzeSingleFrameWithOpenAI(framePath);

    return {
      success: true,
      frameExtracted: true,
      framePath,
      analysis,
    };
  } catch (error) {
    return {
      success: false,
      frameExtracted: false,
      error: error instanceof Error ? error.message : 'Unknown error during frame analysis',
    };
  } finally {
    // Always cleanup temp frames folder
    safeRemoveFolder(folder);
  }
};

// Send a single image to GPT-5
const analyzeSingleFrameWithOpenAI = async (framePath: string): Promise<string> => {
  if (!fs.existsSync(framePath)) throw new Error('Frame file does not exist');
  const stat = fs.statSync(framePath);
  if (stat.size === 0) throw new Error('Frame file is empty');

  const base64 = fs.readFileSync(framePath).toString('base64');

  const resp = await openai.responses.create({
    model: 'gpt-5',
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text' as const, text: AI_DETECTION_SYSTEM_PROMPT }],
      },
      {
        role: 'user',
        content: [
          { type: 'input_image' as const, image_url: `data:image/jpeg;base64,${base64}`, detail: 'low' as const },
        ],
      },
    ],
  });

  return resp.output_text;
};

// Recursively remove a folder and its contents
const safeRemoveFolder = (folderPath: string): void => {
  try {
    if (!fs.existsSync(folderPath)) return;
    for (const entry of fs.readdirSync(folderPath)) {
      const p = path.join(folderPath, entry);
      const s = fs.statSync(p);
      if (s.isDirectory()) safeRemoveFolder(p); else fs.unlinkSync(p);
    }
    fs.rmdirSync(folderPath);
  } catch (err) {
    // Best-effort cleanup
  }
};
