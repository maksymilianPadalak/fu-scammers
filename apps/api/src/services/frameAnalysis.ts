import fs from 'fs';
import path from 'path';
import { extractFrames } from '../utils/frameExtraction';
import { extractAudio } from '../utils/audioExtraction';
import { analyzeFrameWithOpenAI } from '../utils/aiAnalysis';
import { safeRemoveFolder } from '../utils/fileUtils';

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

    // Sample up to 10 frames evenly across the video to avoid huge payloads
    const MAX_FRAMES = 10;
    const sampledFrames = frames.length <= MAX_FRAMES
      ? frames
      : Array.from({ length: MAX_FRAMES }, (_, i) => frames[Math.floor((i * frames.length) / MAX_FRAMES)]);

    const analysis = await analyzeFrameWithOpenAI(sampledFrames, audioPath);

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
    safeRemoveFolder(audioFolder);
  }
};

