import fs from 'fs';
import path from 'path';
import { extractFrames } from '../utils/frameExtraction';
import { extractAudio } from '../utils/audioExtraction';
import { analyzeFrameWithOpenAI } from '../utils/aiAnalysis';

export interface FrameAnalysisResult {
  success: boolean;
  frameExtracted: boolean;
  frames?: string[];
  analysis?: string;
  error?: string;
}

// Analyze only the first extracted frame (keep a single OpenAI request)
export const extractAndAnalyze = async (
  videoPath: string,
  outputDir: string = path.dirname(videoPath)
): Promise<FrameAnalysisResult> => {
  const { frames, folder } = await extractFrames(videoPath, {
    fps: 10,
    outputDir,
  });

  // Extract audio from the video
  const { audioPath, folder: audioFolder } = await extractAudio(videoPath, {
    duration: 30, // Extract first 30 seconds
    format: 'wav', // WAV format
    sampleRate: 16000, // 16kHz good for speech
    channels: 1, // Mono
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
    // Always cleanup temp frames and audio folders
    safeRemoveFolder(folder);
    // safeRemoveFolder(audioFolder);
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
