import * as fs from 'fs';
import * as path from 'path';
import { FORENSIC_SYSTEM_PROMPT } from './utils/prompts';

/*
  Script: generate-training-json.ts
  Purpose: Create training_data.jsonl from all images in uploads/frames-for-fine-tuning
  Behavior: For each image, create a training example where the assistant returns
            STRICT JSON with aiGeneratedLikelihood = 1.

  Run:
    pnpm --filter @turbo-browser-extension/api exec tsx src/generate-training-json.ts
*/

function buildAssistantJson() {
  return {
    aiGeneratedLikelihood: 1,
    artifactsDetected: [],
    rationale: [
      'Training example: label set to 1 for aiGeneratedLikelihood per requirements.'
    ],
    whatIsIt: [],
    howToBehave: [
      'Always be cautious. This dataset marks frames as AI-generated for training purposes.'
    ]
  };
}

async function main() {
  const projectRoot = path.join(__dirname, '..');
  const framesDir = path.join(projectRoot, 'uploads', 'frames-for-fine-tuning');
  const outPath = path.join(projectRoot, 'training_data.jsonl');

  if (!fs.existsSync(framesDir)) {
    console.error(`❌ Frames directory not found: ${framesDir}`);
    process.exit(1);
  }

  const imageFiles = fs
    .readdirSync(framesDir)
    .filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png'))
    .sort((a, b) => {
      const aNum = parseInt(path.basename(a, path.extname(a)));
      const bNum = parseInt(path.basename(b, path.extname(b)));
      const aVal = isNaN(aNum) ? Number.MAX_SAFE_INTEGER : aNum;
      const bVal = isNaN(bNum) ? Number.MAX_SAFE_INTEGER : bNum;
      return aVal - bVal;
    });

  if (imageFiles.length === 0) {
    console.error(`❌ No images found in ${framesDir}`);
    process.exit(1);
  }

  const records = imageFiles.map((fileName) => {
    const assistantJson = buildAssistantJson();
    return {
      messages: [
        { role: 'system', content: FORENSIC_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze frame ${fileName}. Return STRICT JSON only matching the schema.`,
        },
        { role: 'assistant', content: JSON.stringify(assistantJson) },
      ],
    };
  });

  const jsonl = records.map(r => JSON.stringify(r)).join('\n');
  fs.writeFileSync(outPath, jsonl, 'utf8');

  console.log(`✅ Wrote ${records.length} examples to ${outPath}`);
}

main().catch(err => {
  console.error('❌ Failed to generate training JSONL:', err);
  process.exit(1);
});