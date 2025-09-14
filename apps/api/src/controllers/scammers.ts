import type { Request, Response } from 'express';
import { getPotentialScammers } from '../services/weaviate';

/**
 * Get all potential scammers from Weaviate database
 */
export const getScammers = async (req: Request, res: Response) => {
  console.log('=== GET SCAMMERS ENDPOINT CALLED ===');
  
  try {
    const result = await getPotentialScammers();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch scammers',
        data: []
      });
    }
    
    console.log(`✅ Retrieved ${result.data?.length || 0} potential scammers from Weaviate`);
    
    return res.status(200).json({
      success: true,
      message: `Found ${result.data?.length || 0} potential scammers`,
      data: result.data || []
    });
    
  } catch (error) {
    console.error('❌ Error in get scammers controller:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      data: []
    });
  }
};
