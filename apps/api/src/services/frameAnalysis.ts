import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// Set the ffmpeg path to use the static binary
ffmpeg.setFfmpegPath(ffmpegStatic!);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface FrameAnalysisResult {
  success: boolean;
  frameExtracted: boolean;
  framePath?: string;
  analysis?: string;
  error?: string;
}

export const extractFirstFrameAndAnalyze = async (
  videoPath: string,
  outputDir: string = path.dirname(videoPath)
): Promise<FrameAnalysisResult> => {
  // Extract first 10 frames to a temporary folder
  const frameFolder = path.join(
    outputDir,
    `frames-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  try {
    console.log('=== EXTRACTING FIRST 10 FRAMES ===');
    console.log('Video:', videoPath);
    console.log('Frames output folder:', frameFolder);

    // Ensure folder exists
    fs.mkdirSync(frameFolder, { recursive: true });

    // Extract 10 frames (1..10 seconds)
    const framePaths = await extractMultipleFrames(videoPath, frameFolder, 10);
    console.log(`✅ Extracted ${framePaths.length} frame(s)`);

    // Analyze frames using the existing model via Responses API
    console.log('=== ANALYZING 10 FRAMES WITH MODEL ===');
    const analysis = await analyzeFramesWithOpenAI(framePaths);
    console.log('✅ Analysis complete');

    // Cleanup frames
    try {
      for (const p of framePaths) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
      if (fs.existsSync(frameFolder)) {
        // Use rmSync to remove dir even if any residual files remain
        // Node 14+/18+: rmSync supports recursive removal
        (fs as any).rmSync ? (fs as any).rmSync(frameFolder, { recursive: true, force: true }) : fs.rmdirSync(frameFolder);
      }
      console.log('✅ Temporary frame files cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup frame files:', cleanupError);
    }

    return {
      success: true,
      frameExtracted: true,
      framePath: frameFolder,
      analysis,
    };
  } catch (error) {
    console.error('❌ Frame extraction/analysis failed:', error);

    // Attempt cleanup on failure
    try {
      if (fs.existsSync(frameFolder)) {
        if ((fs as any).rmSync) {
          (fs as any).rmSync(frameFolder, { recursive: true, force: true });
        } else {
          for (const name of fs.readdirSync(frameFolder)) {
            const p = path.join(frameFolder, name);
            if (fs.existsSync(p)) fs.unlinkSync(p);
          }
          fs.rmdirSync(frameFolder);
        }
      }
    } catch (_) {}

    return {
      success: false,
      frameExtracted: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error during frame analysis',
    };
  }
};

const extractMultipleFrames = (
  videoPath: string,
  outputFolder: string,
  frameCount: number
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    // Generate timestamps 00:00:01 .. 00:00:10
    const timestamps = Array.from({ length: frameCount }, (_, i) =>
      `00:00:${String(i + 1).padStart(2, '0')}`
    );

    const created: string[] = [];

    ffmpeg(videoPath)
      .on('filenames', (filenames: string[]) => {
        for (const f of filenames) created.push(path.join(outputFolder, f));
      })
      .on('end', () => {
        console.log('Multiple frame extraction completed');
        // Prefer to read what was actually written to disk to avoid ENOENT
        let framePaths: string[] = [];
        try {
          framePaths = fs
            .readdirSync(outputFolder)
            .filter((name) => /^frame-\d+\.jpg$/.test(name) || /^frame-\d{2,}\.jpg$/.test(name) || /^frame-\d{3}\.jpg$/.test(name))
            .sort((a, b) => {
              const na = parseInt(a.match(/(\d+)/)?.[1] || '0', 10);
              const nb = parseInt(b.match(/(\d+)/)?.[1] || '0', 10);
              return na - nb;
            })
            .map((name) => path.join(outputFolder, name));
        } catch (e) {
          console.warn('Could not enumerate extracted frames, falling back to planned names:', e);
        }

        // If directory listing failed or empty, fall back to the names we planned
        if (framePaths.length === 0) {
          framePaths = (created.length ? created : Array.from({ length: frameCount }, (_, i) => path.join(outputFolder, `frame-${String(i + 1).padStart(3, '0')}.jpg`)));
        }

        // Filter only files that actually exist
        framePaths = framePaths.filter((p) => {
          try { return fs.existsSync(p); } catch { return false; }
        });

        resolve(framePaths);
      })
      .on('error', err => {
        console.error('FFmpeg error (multi-frame):', err);
        reject(err);
      })
      .screenshots({
        timestamps,
        filename: 'frame-%i.jpg',
        folder: outputFolder,
        size: '640x480',
      });
  });
};

const analyzeFramesWithOpenAI = async (framePaths: string[]): Promise<string> => {
  try {
    console.log(`Sending ${Math.min(framePaths.length, 10)} frames to model for analysis...`);

    // Keep only frames that actually exist and are non-empty
    const existing = framePaths.filter((p) => {
      try { return fs.existsSync(p) && fs.statSync(p).size > 0; } catch { return false; }
    });

    if (existing.length === 0) {
      throw new Error('No frames extracted from video for analysis');
    }

    // Build content array with up to 10 frames
    const framesContent = existing.slice(0, 10).map((fp, idx) => {
      const b64 = fs.readFileSync(fp).toString('base64');
      return {
        type: 'input_image' as const,
        image_url: `data:image/jpeg;base64,${b64}`,
        detail: 'low' as const,
      };
    });

    const resp = await client.responses.create({
      model: 'gpt-5', // keep existing model
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text' as const,
              text:
                "Analyze if this video looks AI-generated. For each frame, give JSON with fields: frame, ai_likelihood (0–1), artifacts_detected, rationale.",
            },
            ...framesContent,
          ],
        },
      ],
    });

    console.log('Model Analysis Result:', resp.output_text);
    return resp.output_text;
  } catch (error) {
    console.error('Responses API error:', error);
    if (error instanceof Error && error.message.includes('billing')) {
      return 'Unable to analyze frames: OpenAI API billing issue. Please check your account.';
    }
    throw new Error(
      `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
