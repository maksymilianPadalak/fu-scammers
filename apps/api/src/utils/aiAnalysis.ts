import fs from 'fs';
import OpenAI from 'openai';
// Hardcoded model configuration
import { FORENSIC_SYSTEM_PROMPT } from './prompts';

// Initialize OpenAI client once per process
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const IMAGE_DETAIL = 'high' as const;

/**
 * Analyze one or more frames using OpenAI Responses API and return raw output text.
 * Accepts a single image path or an array of image paths and sends them as
 * multiple input_image items in one request.
 */
export async function analyzeFrameWithOpenAI(
  framePathOrPaths: string | string[],
  audioPath: string
): Promise<{ analysis: string; transcription: string }> {
  const paths = Array.isArray(framePathOrPaths)
    ? framePathOrPaths
    : [framePathOrPaths];
  if (paths.length === 0) throw new Error('No frame paths provided');

  // Validate and build images content
  const imagesContent = paths.map(p => {
    if (!fs.existsSync(p)) throw new Error(`Frame file does not exist: ${p}`);
    const stat = fs.statSync(p);
    if (stat.size === 0) throw new Error(`Frame file is empty: ${p}`);
    const base64 = fs.readFileSync(p).toString('base64');
    return {
      type: 'input_image' as const,
      image_url: `data:image/jpeg;base64,${base64}`,
      detail: IMAGE_DETAIL,
    };
  });

  // Validate and build audio content
  if (!fs.existsSync(audioPath))
    throw new Error(`Audio file does not exist: ${audioPath}`);
  const audioStat = fs.statSync(audioPath);
  if (audioStat.size === 0)
    throw new Error(`Audio file is empty: ${audioPath}`);

  const audioResponse = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    response_format: 'json',
    file: fs.createReadStream(audioPath),
  });

  const resp = await openai.responses.create({
    model: 'gpt-4o',
    input: [
      {
        role: 'system',
        content: [
          { type: 'input_text' as const, text: FORENSIC_SYSTEM_PROMPT },
        ],
      },

      {
        role: 'user',
        content: [
          ...imagesContent,
          { type: 'input_text', text: 'Transcription: ' + audioResponse.text },
        ],
      },
    ],
  });

  return {
    analysis: resp.output_text,
    transcription: audioResponse.text
  };
}
