import weaviate, { WeaviateClient } from 'weaviate-client';

let client: WeaviateClient | null = null;

// Initialize Weaviate client
const initializeWeaviateClient = async (): Promise<WeaviateClient | null> => {
  try {
    const apiKey = process.env.WEAVIATE_API_KEY;
    const url = process.env.WEAVIATE_URL;

    if (!apiKey || !url) {
      console.warn('Weaviate configuration missing. WEAVIATE_API_KEY and WEAVIATE_URL required.');
      return null;
    }

    if (url === 'your-cluster.weaviate.network') {
      console.warn('Weaviate URL is not configured properly. Please set WEAVIATE_URL to your actual cluster URL.');
      return null;
    }

    client = await weaviate.connectToWeaviateCloud(url, {
      authCredentials: new weaviate.ApiKey(apiKey),
    });

    console.log('Weaviate client initialized successfully');
    return client;
  } catch (error) {
    console.error('Failed to initialize Weaviate client:', error);
    return null;
  }
};

// Get or create Weaviate client
const getClient = async (): Promise<WeaviateClient | null> => {
  if (!client) {
    client = await initializeWeaviateClient();
  }
  return client;
};

// Store AI-detected username in Weaviate
export const storeAIDetectedUsername = async (data: {
  username: string;
  aiGeneratedLikelihood: number;
  whatYouSee: string;
  reasoning: string;
  sessionId: string;
  timestamp: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const weaviateClient = await getClient();
    
    if (!weaviateClient) {
      return {
        success: false,
        error: 'Weaviate client not available'
      };
    }

    // Get the Videos collection
    const videos = weaviateClient.collections.get('Videos');
    
    // Store the detected username and analysis data in the 'Videos' collection
    const result = await videos.data.insert({
      username: data.username,
      aiGeneratedLikelihood: data.aiGeneratedLikelihood,
      whatYouSee: data.whatYouSee,
      reasoning: data.reasoning,
      sessionId: data.sessionId,
      detectedAt: data.timestamp,
      source: 'browser_extension_recording',
        flagged: true, // Mark as flagged since likelihood > 50%
    });

    console.log('Successfully stored AI-detected username in Weaviate:', {
      username: data.username,
      likelihood: data.aiGeneratedLikelihood,
      weaviateId: result
    });

    return { success: true };
  } catch (error) {
    console.error('Error storing username in Weaviate:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Check if Videos class exists, create if not
export const ensureVideosClass = async (): Promise<void> => {
  try {
    const weaviateClient = await getClient();
    
    if (!weaviateClient) {
      console.warn('Cannot ensure Videos class - Weaviate client not available');
      return;
    }

    try {
      // Try to get the collection to see if it exists
      const videos = weaviateClient.collections.get('Videos');
      await videos.config.get();
      console.log('Videos collection already exists');
    } catch (error) {
      // Collection doesn't exist, create it
      console.log('Creating Videos collection in Weaviate...');
      
      await weaviateClient.collections.create({
        name: 'Videos',
        description: 'AI-detected potentially fake content from browser extension recordings',
        properties: [
          {
            name: 'username',
            dataType: 'text',
            description: 'Username detected in the content'
          },
          {
            name: 'aiGeneratedLikelihood',
            dataType: 'number',
            description: 'AI detection confidence score (0.0 - 1.0)'
          },
          {
            name: 'whatYouSee',
            dataType: 'text',
            description: 'Description of what was observed in the content'
          },
          {
            name: 'reasoning',
            dataType: 'text',
            description: 'AI reasoning for the detection decision'
          },
          {
            name: 'sessionId',
            dataType: 'text',
            description: 'Recording session identifier'
          },
          {
            name: 'detectedAt',
            dataType: 'date',
            description: 'When the content was analyzed'
          },
          {
            name: 'source',
            dataType: 'text',
            description: 'Source of the detection (browser_extension_recording)'
          },
          {
            name: 'flagged',
            dataType: 'boolean',
            description: 'Whether this content was flagged as potentially AI-generated'
          }
        ]
      });
      
      console.log('Videos collection created successfully');
    }
  } catch (error) {
    console.error('Error ensuring Videos collection:', error);
  }
};
