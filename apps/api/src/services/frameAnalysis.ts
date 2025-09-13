import fs from 'fs';
import path from 'path';
import { extractFrames } from '../utils/frameExtraction';
import { analyzeFrameWithOpenAI } from '../utils/aiAnalysis';

export interface FrameAnalysisResult {
  success: boolean;
  frameExtracted: boolean;
  frames?: string[];
  analysis?: string;
  error?: string;
}

// Analyze only the first extracted frame (keep a single OpenAI request)
export const extractFirstFrameAndAnalyze = async (
  videoPath: string,
  outputDir: string = path.dirname(videoPath)
): Promise<FrameAnalysisResult> => {
  const { frames, folder } = await extractFrames(videoPath, {
    fps: 10,
    outputDir,
  });

  try {
    if (!frames) throw new Error('No frame extracted to analyze');

    const analysis = await analyzeFrameWithOpenAI(frames);

    return {
      success: true,
      frameExtracted: true,
      frames,
      analysis,
    };
  } catch (error) {
    return {
      success: false,
      frameExtracted: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error during frame analysis',
    };
  } finally {
    // Always cleanup temp frames folder
    safeRemoveFolder(folder);
  }
};

// Recursively remove a folder and its contents
const safeRemoveFolder = (folderPath: string): void => {
  try {
    if (!fs.existsSync(folderPath)) return;
    for (const entry of fs.readdirSync(folderPath)) {
      const p = path.join(folderPath, entry);
      const s = fs.statSync(p);
      if (s.isDirectory()) safeRemoveFolder(p);
      else fs.unlinkSync(p);
    }
    fs.rmdirSync(folderPath);
  } catch (err) {
    // Best-effort cleanup
  }
};
