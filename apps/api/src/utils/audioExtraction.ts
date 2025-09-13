import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

// Ensure ffmpeg uses the static binary
ffmpeg.setFfmpegPath(ffmpegStatic!);

export interface ExtractAudioOptions {
  startTime?: number; // seconds to start extraction from
  duration?: number; // seconds to extract
  format?: 'wav' | 'mp3'; // output audio format (default: wav)
  sampleRate?: number; // sample rate in Hz (default: 44100)
  channels?: number; // number of audio channels (default: 2)
  outputDir?: string; // custom output directory
}

export interface ExtractAudioResult {
  audioPath: string; // absolute path to the audio file
  folder: string; // absolute path to the folder containing the audio
}

/**
 * Extract audio from a video file.
 * Defaults to WAV format with 44.1kHz sample rate.
 */
export async function extractAudio(
  videoPath: string,
  options: ExtractAudioOptions = {}
): Promise<ExtractAudioResult> {
  const {
    startTime,
    duration,
    format = 'wav',
    sampleRate = 44100,
    channels = 2,
    outputDir,
  } = options;

  const baseDir = outputDir || path.dirname(videoPath);
  const folder = path.join(
    baseDir,
    `audio-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );

  // Ensure output folder exists
  fs.mkdirSync(folder, { recursive: true });

  const audioFileName = `audio.${format}`;
  const audioPath = path.join(folder, audioFileName);

  await new Promise<void>((resolve, reject) => {
    let cmd = ffmpeg(videoPath)
      .noVideo() // Remove video stream
      .audioFrequency(sampleRate)
      .audioChannels(channels)
      .output(audioPath);

    if (typeof startTime === 'number' && startTime >= 0) {
      cmd = cmd.seekInput(startTime);
    }
    if (typeof duration === 'number' && duration > 0) {
      cmd = cmd.duration(duration);
    }

    cmd
      .on('start', (commandLine) => {
        console.log('Audio extraction started:', commandLine);
      })
      .on('progress', (progress) => {
        console.log('Audio extraction progress:', Math.round(progress.percent || 0) + '%');
      })
      .on('end', () => {
        console.log('Audio extraction completed');
        resolve();
      })
      .on('error', (err) => {
        console.error('Audio extraction error:', err);
        reject(err);
      })
      .run();
  });

  return { audioPath, folder };
}