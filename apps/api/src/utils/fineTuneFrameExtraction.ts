import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

// Ensure ffmpeg uses the static binary
ffmpeg.setFfmpegPath(ffmpegStatic!);

export interface FineTuneFrameExtractionOptions {
  fps?: number; // frames per second to extract (default: 1)
  size?: string; // output frame size, e.g. '640x480'
  format?: 'jpg' | 'png'; // output image format
  maxFrames?: number; // limit total frames extracted
  startTime?: number; // seconds to start extraction from
  duration?: number; // seconds to extract
}

export interface FineTuneFrameExtractionResult {
  frames: string[]; // absolute paths to frame images
  folder: string; // absolute path to the frames-for-fine-tuning folder
  frameCount: number; // total number of frames extracted
}

/**
 * Extract frames from video for fine-tuning with indexed naming (0, 1, 2, etc.)
 */
export async function extractFramesForFineTuning(
  videoPath: string,
  options: FineTuneFrameExtractionOptions = {}
): Promise<FineTuneFrameExtractionResult> {
  const {
    fps = 1,
    size = '-1:1080', // Scale to 1080p height, preserve aspect ratio
    format = 'jpg',
    maxFrames,
    startTime,
    duration,
  } = options

  // Create frames-for-fine-tuning directory in the same location as the video
  const videoDir = path.dirname(videoPath);
  const framesDir = path.join(videoDir, 'frames-for-fine-tuning');

  // Ensure output folder exists (create or clear it)
  if (fs.existsSync(framesDir)) {
    // Clear existing frames
    const existingFiles = fs.readdirSync(framesDir);
    for (const file of existingFiles) {
      if (file.endsWith(`.${format}`)) {
        fs.unlinkSync(path.join(framesDir, file));
      }
    }
  } else {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  // Use indexed naming pattern: 0.jpg, 1.jpg, 2.jpg, etc.
  const outputPattern = path.join(framesDir, `%d.${format}`);

  await new Promise<void>((resolve, reject) => {
    let cmd = ffmpeg(videoPath)
      .fps(fps)
      .outputOptions([
        '-vf', `scale=${size}`, // Use scale filter for size
        '-q:v', '2' // High quality (1-31, lower = better quality)
      ])
      .output(outputPattern);

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
      .on('start', commandLine => {
        console.log('Frame extraction started:', commandLine);
      })
      .on('progress', progress => {
        console.log(
          'Frame extraction progress:',
          Math.round(progress.percent || 0) + '%'
        );
      })
      .on('end', () => {
        console.log('Frame extraction completed');
        resolve();
      })
      .on('error', err => {
        console.error('Frame extraction error:', err);
        reject(err);
      })
      .run();
  });

  // Enumerate frames that were created
  const frameFiles = fs
    .readdirSync(framesDir)
    .filter(f => f.endsWith(`.${format}`))
    .sort((a, b) => {
      // Sort numerically (0.jpg, 1.jpg, 2.jpg, etc.)
      const aNum = parseInt(path.basename(a, `.${format}`));
      const bNum = parseInt(path.basename(b, `.${format}`));
      return aNum - bNum;
    });

  const frames = frameFiles.map(f => path.join(framesDir, f));

  console.log(`Successfully extracted ${frames.length} frames to ${framesDir}`);

  return {
    frames,
    folder: framesDir,
    frameCount: frames.length,
  };
}
