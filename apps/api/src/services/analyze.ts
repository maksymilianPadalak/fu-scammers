import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const analyzeWithOpenAI = async (): Promise<string> => {
  try {
    const response = await client.responses.create({
      model: 'gpt-5',
      input: 'Write a one-sentence bedtime story about Berlin.',
    });

    console.log(response.output_text);
    return response.output_text;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to analyze with OpenAI');
  }
};
