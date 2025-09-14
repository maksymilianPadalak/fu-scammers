#!/usr/bin/env tsx
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { FORENSIC_SYSTEM_PROMPT } from './utils/prompts';

// Simple fine-tuning script for GPT-4.1-2025-04-14
// Usage: OPENAI_API_KEY=your_key tsx src/finetune.ts

async function createFineTuning() {
  // Get API key from environment variable
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ Please set your OPENAI_API_KEY environment variable');
    console.log('Usage: OPENAI_API_KEY=your_key tsx src/finetune.ts');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  try {
    console.log('🚀 Starting fine-tuning process...');

    // Build dataset entries for ALL frames with simple logic: always aiGeneratedLikelihood = 1
    const framesDir = path.join(
      __dirname,
      '..',
      'uploads',
      'frames-for-fine-tuning'
    );
    const imageFiles = fs
      .readdirSync(framesDir)
      .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
      .sort((a, b) => {
        const aNum = parseInt(path.basename(a, path.extname(a)));
        const bNum = parseInt(path.basename(b, path.extname(b)));
        return (isNaN(aNum) ? 0 : aNum) - (isNaN(bNum) ? 0 : bNum);
      });

    if (imageFiles.length === 0) {
      throw new Error('No images found in frames-for-fine-tuning folder');
    }

    // Create training data: one example per image
    const trainingData = imageFiles.map(fileName => {
      const assistantJson = {
        aiGeneratedLikelihood: 1,
      };

      return {
        messages: [
          { role: 'system', content: FORENSIC_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analyze frame ${fileName}. Return STRICT JSON only matching the schema.`,
          },
          { role: 'assistant', content: JSON.stringify(assistantJson) },
        ],
      } as const;
    });

    // Create training file
    const trainingFileName = 'training_data.jsonl';
    const trainingFilePath = path.join(__dirname, '..', trainingFileName);

    const jsonlContent = trainingData
      .map(item => JSON.stringify(item))
      .join('\n');

    // Print a small preview to the console
    console.log(`📄 Prepared ${trainingData.length} training examples`);

    fs.writeFileSync(trainingFilePath, jsonlContent);
    console.log(`📝 Created training file: ${trainingFileName}`);

    // Upload training file
    console.log('📤 Uploading training data...');
    const file = await openai.files.create({
      file: fs.createReadStream(trainingFilePath),
      purpose: 'fine-tune',
    });

    console.log(`✅ File uploaded successfully. ID: ${file.id}`);

    // Create fine-tuning job
    console.log('🔧 Creating fine-tuning job...');
    const fineTune = await openai.fineTuning.jobs.create({
      training_file: file.id,
      model: 'gpt-4o-mini-2024-07-18', // Using available model for fine-tuning
      hyperparameters: {
        n_epochs: 3,
      },
    });

    console.log(`✅ Fine-tuning job created successfully!`);
    console.log(`Job ID: ${fineTune.id}`);
    console.log(`Status: ${fineTune.status}`);
    console.log(`Base model: ${fineTune.model}`);
    console.log(`fine_tuned_model (initial): ${fineTune.fine_tuned_model ?? '(pending)'}`);

    // Monitor the job status
    console.log('\n📊 Monitoring job status...');
    let jobStatus = fineTune.status;

    while (
      jobStatus === 'validating_files' ||
      jobStatus === 'queued' ||
      jobStatus === 'running'
    ) {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

      const job = await openai.fineTuning.jobs.retrieve(fineTune.id);
      jobStatus = job.status;

      const modelName = job.fine_tuned_model ?? '(pending)';
      console.log(`Status: ${jobStatus} | fine_tuned_model: ${modelName}`);

      if (job.trained_tokens) {
        console.log(`Trained tokens: ${job.trained_tokens}`);
      }
    }

    if (jobStatus === 'succeeded') {
      const completedJob = await openai.fineTuning.jobs.retrieve(fineTune.id);
      console.log(`\n🎉 Fine-tuning completed successfully!`);
      console.log(`Fine-tuned model: ${completedJob.fine_tuned_model}`);
    } else {
      const finalJob = await openai.fineTuning.jobs.retrieve(fineTune.id);
      console.log(`\n❌ Fine-tuning ended with status: ${jobStatus}`);
      console.log(`fine_tuned_model (final): ${finalJob.fine_tuned_model ?? '(none)'}`);
    }

    // Clean up training file
    fs.unlinkSync(trainingFilePath);
    console.log('🧹 Cleaned up temporary training file');
  } catch (error) {
    console.error('❌ Error during fine-tuning:', error);
  }
}

// Run the script
if (require.main === module) {
  createFineTuning().catch(console.error);
}

export { createFineTuning };
