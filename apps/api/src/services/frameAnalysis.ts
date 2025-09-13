import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// Configure FFmpeg to use static binary
ffmpeg.setFfmpegPath(ffmpegStatic!);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AI_DETECTION_SYSTEM_PROMPT = `You are a forensic video analyst AI specialized in detecting AI-generated content.

Analyze the provided video frame to determine if it appears to be AI-generated or authentic.

Look for these AI artifacts:
- VISUAL ANOMALIES: extra/missing fingers, warped hands, irregular teeth, asymmetrical eyes
- TEXTURE ISSUES: waxy or overly smooth skin, unnatural lighting, impossible shadows
- TEXT PROBLEMS: gibberish text, warped logos, inconsistent fonts
- BACKGROUND INCONSISTENCIES: warped backgrounds, impossible perspectives

Be CONSERVATIVE in your assessment:
- If something catches your eye speak up!
- If evidence is weak or ambiguous say so, don't favor any direction
- Always return valid JSON format

Required JSON response format:
{
  "ai_generated_likelihood": 0.0 to 1.0,
  "label": "ai" | "human" | "uncertain",
  "artifacts_detected": ["list of specific artifacts found"],
  "rationale": ["detailed explanations for the assessment"]
}`;

export interface FrameAnalysisResult {
  success: boolean;
  frameExtracted: boolean;
  framePath?: string;
  analysis?: string;
  error?: string;
}

/**
 * Extract the first frame from a video and analyze it for AI-generated content
 * @param videoPath Path to the video file
 * @param outputDir Directory to temporarily store the extracted frame
 * @returns Promise containing analysis results
 */
export const extractFirstFrameAndAnalyze = async (
  videoPath: string,
  outputDir: string = path.dirname(videoPath)
): Promise<FrameAnalysisResult> => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  const framePath = path.join(outputDir, `frame-${timestamp}-${randomId}.jpg`);

  try {
    console.log('🎬 Extracting first frame from video...');
    console.log(`📁 Video: ${videoPath}`);
    console.log(`📸 Output: ${framePath}`);

    // Extract single frame at 0.5 seconds
    await extractSingleFrame(videoPath, framePath);
    console.log('✅ Frame extracted successfully');

    // Analyze the frame for AI-generated content
    console.log('🔍 Analyzing frame with AI detection model...');
    const analysis = await analyzeSingleFrameWithOpenAI(framePath);
    console.log('✅ Analysis completed');

    // Clean up the temporary frame file
    await cleanupFile(framePath);

    return {
      success: true,
      frameExtracted: true,
      framePath,
      analysis,
    };
  } catch (error) {
    console.error('❌ Frame extraction/analysis failed:', error);

    // Ensure cleanup on failure
    await cleanupFile(framePath);

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

/**
 * Extract a single frame from video at 0.5 seconds
 * @param videoPath Path to the input video file
 * @param outputPath Path where the frame image will be saved
 * @returns Promise that resolves when frame is extracted
 */
const extractSingleFrame = (
  videoPath: string,
  outputPath: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(0.5) // Extract frame at 0.5 seconds
      .frames(1) // Only extract 1 frame
      .size('640x480') // Consistent frame size
      .output(outputPath)
      .on('end', () => {
        console.log('📸 Single frame extraction completed');
        resolve();
      })
      .on('error', error => {
        console.error('❌ FFmpeg extraction error:', error);
        reject(new Error(`Frame extraction failed: ${error.message}`));
      })
      .run();
  });
};

/**
 * Analyze a single frame using OpenAI's GPT-5 model to detect AI-generated content
 * @param framePath Path to the frame image file
 * @returns Promise containing the analysis result as a string
 */
const analyzeSingleFrameWithOpenAI = async (
  framePath: string
): Promise<string> => {
  try {
    // Validate frame file exists and is not empty
    if (!fs.existsSync(framePath)) {
      throw new Error('Frame file does not exist');
    }

    const fileStats = fs.statSync(framePath);
    if (fileStats.size === 0) {
      throw new Error('Frame file is empty');
    }

    console.log(
      `🔍 Sending frame to GPT-5 for analysis (${fileStats.size} bytes)...`
    );

    // Convert frame to base64
    const frameBuffer = fs.readFileSync(framePath);
    const base64Frame = frameBuffer.toString('base64');

    // Send request to OpenAI
    const response = await openai.responses.create({
      model: 'gpt-5',
      input: [
        {
          role: 'system',
          content: [
            { type: 'input_text' as const, text: AI_DETECTION_SYSTEM_PROMPT },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text' as const,
              text: 'Analyze this video frame to determine if it appears to be AI-generated. Return your assessment in the specified JSON format.',
            },
            {
              type: 'input_image' as const,
              image_url: `data:image/jpeg;base64,${base64Frame}`,
              detail: 'low' as const,
            },
          ],
        },
      ],
    });

    console.log('✅ GPT-5 analysis completed');
    return response.output_text;
  } catch (error) {
    console.error('❌ OpenAI analysis failed:', error);

    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (
        error.message.includes('billing') ||
        error.message.includes('quota')
      ) {
        throw new Error(
          'OpenAI API billing issue. Please check your account and billing status.'
        );
      }
      if (error.message.includes('rate')) {
        throw new Error(
          'OpenAI API rate limit exceeded. Please try again later.'
        );
      }
    }

    throw new Error(
      `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Clean up temporary files safely
 * @param filePath Path to file to delete
 */
const cleanupFile = async (filePath: string): Promise<void> => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🧹 Cleaned up temporary file: ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.warn(`⚠️ Failed to cleanup file ${filePath}:`, error);
  }
};
