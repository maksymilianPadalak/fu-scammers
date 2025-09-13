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
  const frameFileName = `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
  const framePath = path.join(outputDir, frameFileName);

  try {
    console.log('=== EXTRACTING FIRST FRAME ===');
    console.log('Video:', videoPath);
    console.log('Frame output:', framePath);

    // Extract first frame using ffmpeg
    await extractFirstFrame(videoPath, framePath);

    console.log('✅ Frame extracted successfully');

    // Send frame to OpenAI GPT-5 for AI-generated detection
    console.log('=== ANALYZING FRAME FOR AI-GENERATED CONTENT ===');
    const analysis = await analyzeFrameWithOpenAI(framePath);

    console.log('✅ AI-generated video detection completed');
    console.log('Detection Result:', analysis);

    // Clean up the extracted frame
    try {
      if (fs.existsSync(framePath)) {
        fs.unlinkSync(framePath);
        console.log('✅ Temporary frame file cleaned up');
      }
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup frame file:', cleanupError);
    }

    return {
      success: true,
      frameExtracted: true,
      framePath,
      analysis,
    };
  } catch (error) {
    console.error('❌ Frame extraction/analysis failed:', error);

    // Clean up frame file if it exists
    try {
      if (fs.existsSync(framePath)) {
        fs.unlinkSync(framePath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

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

const extractFirstFrame = (
  videoPath: string,
  outputPath: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'], // Extract frame at 1 second
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '640x480', // Resize for faster processing and lower OpenAI costs
      })
      .on('end', () => {
        console.log('Frame extraction completed');
        resolve();
      })
      .on('error', err => {
        console.error('FFmpeg error:', err);
        reject(err);
      });
  });
};

const analyzeFrameWithOpenAI = async (imagePath: string): Promise<string> => {
  try {
    // Read and encode image as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    console.log(
      'Sending frame to OpenAI GPT-4.1 for AI-generated video detection...'
    );

    const frames = [
      {
        type: 'input_image' as const,
        image_url: `data:image/jpeg;base64,${base64Image}`,
        detail: 'low' as const,
      },
    ];

    const resp = await client.responses.create({
      model: 'gpt-5',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text' as const,
              text: 'Analyze if this video looks AI-generated. For each frame say what you see.',
            },
            ...frames,
          ],
        },
      ],
    });

    console.log('GPT-4.1 Analysis Result:', resp.output_text);
    return resp.output_text;
  } catch (error) {
    console.error('OpenAI GPT-4.1 API error:', error);

    if (error instanceof Error && error.message.includes('billing')) {
      return 'Unable to analyze image: OpenAI API billing issue. Please check your account.';
    }

    if (error instanceof Error && error.message.includes('gpt-4.1')) {
      return 'GPT-4.1 model not available. Please check your API access or try again later.';
    }

    throw new Error(
      `GPT-4.1 analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
