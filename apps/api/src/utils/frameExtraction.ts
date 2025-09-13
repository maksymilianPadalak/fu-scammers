import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

// Ensure ffmpeg uses the static binary
ffmpeg.setFfmpegPath(ffmpegStatic!);

export interface ExtractFramesOptions {
  fps?: number; // frames per second to extract (default: 10)
  size?: string; // output frame size, e.g. '640x480'
  format?: 'jpg' | 'png'; // output image format
  maxFrames?: number; // limit total frames extracted
  startTime?: number; // seconds to start extraction from
  duration?: number; // seconds to extract
  outputDir?: string; // custom output directory (will create a unique subdir)
}

export interface ExtractFramesResult {
  frames: string[]; // absolute paths to frame images
  folder: string; // absolute path to the folder that contains frames
}

/**
 * Extract frames from a video according to provided options.
 * Defaults to 10 fps and jpg format.
 */
export async function extractFrames(
  videoPath: string,
  options: ExtractFramesOptions = {}
): Promise<ExtractFramesResult> {
  const {
    fps = 10,
    size = '640x480',
    format = 'jpg',
    maxFrames,
    startTime,
    duration,
    outputDir,
  } = options;

  const baseDir = outputDir || path.dirname(videoPath);
  const folder = path.join(
    baseDir,
    `frames-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );

  // Ensure output folder exists
  fs.mkdirSync(folder, { recursive: true });

  const outputPattern = path.join(folder, `frame-%05d.${format}`);

  await new Promise<void>((resolve, reject) => {
    let cmd = ffmpeg(videoPath).fps(fps).size(size).output(outputPattern);

    if (typeof startTime === 'number' && startTime >= 0) {
      cmd = cmd.seekInput(startTime);
    }
    if (typeof duration === 'number' && duration > 0) {
      cmd = cmd.duration(duration);
    }
    if (typeof maxFrames === 'number' && maxFrames > 0) {
      cmd = cmd.frames(maxFrames);
    }

    cmd
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });

  // Enumerate frames written
  const frames = fs
    .readdirSync(folder)
    .filter((f) => f.startsWith('frame-') && f.endsWith(`.${format}`))
    .sort()
    .map((f) => path.join(folder, f));

  return { frames, folder };
}
