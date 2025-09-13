import type { Request, Response } from 'express';
import { analyzeWithOpenAI } from '../services/analyze';

export const analyze = async (req: Request, res: Response) => {
  console.log('=== ANALYZE ENDPOINT CALLED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Request Body:', req.body);

  try {
    console.log('START ANALYZING');

    // Get the input from request body, fallback to default
    const input = req.body?.input;
    console.log('Input prompt:', input);

    const output = await analyzeWithOpenAI();
    console.log('ANALYSIS COMPLETE');

    const response = {
      success: true,
      output_text: output,
      timestamp: new Date().toISOString(),
    };

    console.log('Sending response:', response);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in analyze controller:', error);

    const errorResponse = {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Internal server error during analysis',
    };

    console.log('Sending error response:', errorResponse);
    return res.status(500).json(errorResponse);
  }
};
