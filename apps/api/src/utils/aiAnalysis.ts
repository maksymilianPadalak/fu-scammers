import fs from 'fs';
import OpenAI from 'openai';

// Initialize OpenAI client once per process
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Hardcoded model configuration
const SYSTEM_PROMPT = `You are a forensic video analyst AI.
Return JSON only with keys: ai_generated_likelihood (0..1), label (ai|human|uncertain), artifacts_detected [string], rationale [string].`;
const IMAGE_DETAIL = 'low' as const;

/**
 * Analyze one or more frames using OpenAI Responses API and return raw output text.
 * Accepts a single image path or an array of image paths and sends them as
 * multiple input_image items in one request.
 */
export async function analyzeFrameWithOpenAI(
  framePathOrPaths: string | string[]
): Promise<string> {
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

  const resp = await openai.responses.create({
    model: 'gpt-5',
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text' as const, text: SYSTEM_PROMPT }],
      },
      {
        role: 'user',
        content: imagesContent,
      },
    ],
  });

  return resp.output_text;
}
