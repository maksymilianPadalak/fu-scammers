import React from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

const Popup: React.FC = () => {
  const [status, setStatus] = React.useState<string>('Ready');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [screenshot, setScreenshot] = React.useState<string | null>(null);
  const [isRecording, setIsRecording] = React.useState<boolean>(false);
  const [recordedFrames, setRecordedFrames] = React.useState<string[]>([]);
  const [recordingInterval, setRecordingInterval] = React.useState<NodeJS.Timeout | null>(null);
  const [analysisResult, setAnalysisResult] = React.useState<{username: string, whatYouSee: string, aiGeneratedLikelihood: number} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState<boolean>(false);

  const fetchApiData = async () => {
    try {
      setIsLoading(true);
      setStatus('Fetching data...');

      const response = await fetch('http://localhost:3001/api/data');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStatus(`API Response: ${data.message} - Items: ${data.data.length}`);
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const makeParagraphsPink = async () => {
    try {
      setIsLoading(true);
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, { action: 'highlight' });
        setStatus('💖 Paragraphs are now pink!');
      }
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('Pink paragraph error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const captureScreenshot = async () => {
    try {
      setIsLoading(true);
      setStatus('Capturing screenshot...');
      
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Capture visible tab content
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
        quality: 90
      });

      setScreenshot(dataUrl);
      setStatus('📸 Screenshot captured! You can now send it to your API.');
      
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('Screenshot error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendScreenshotToApi = async () => {
    if (!screenshot) {
      setStatus('No screenshot to send. Please capture one first.');
      return;
    }

    try {
      setIsLoading(true);
      setStatus('Sending screenshot to API...');

      const response = await fetch('http://localhost:3001/api/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: screenshot,
          timestamp: new Date().toISOString(),
          source: 'browser_extension'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStatus(`✅ Screenshot sent to API successfully! Response: ${JSON.stringify(data)}`);
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('API send error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startScreenRecording = async () => {
    try {
      setIsLoading(true);
      setStatus('Starting screen recording...');
      
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Clear any existing frames and analysis
      setRecordedFrames([]);
      setAnalysisResult(null);
      setIsRecording(true);
      
      // Capture first frame immediately
      const firstFrame = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
        quality: 90
      });
      setRecordedFrames([firstFrame]);
      
      // Set up interval to capture frames at 2 FPS (every 500ms)
      const interval = setInterval(async () => {
        try {
          const frameData = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png',
            quality: 90
          });
          
          setRecordedFrames(prev => [...prev, frameData]);
        } catch (error) {
          console.error('Error capturing frame:', error);
        }
      }, 500); // 2 FPS = 500ms interval
      
      setRecordingInterval(interval);
      setStatus('🎬 Recording started! Capturing at 2 FPS...');
      
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('Recording start error:', error);
      setIsRecording(false);
    } finally {
      setIsLoading(false);
    }
  };

  const stopScreenRecording = () => {
    try {
      setIsLoading(true);
      setStatus('Stopping screen recording...');
      
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      
      setIsRecording(false);
      setStatus(`🎬 Recording stopped! Captured ${recordedFrames.length} frames.`);
      
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('Recording stop error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendRecordingToApi = async () => {
    if (recordedFrames.length === 0) {
      setStatus('No recording to send. Please record something first.');
      return;
    }

    try {
      setIsLoading(true);
      setIsAnalyzing(true);
      setStatus('Sending recording to API and analyzing with AI...');

      const response = await fetch('http://localhost:3001/api/recording', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frames: recordedFrames,
          frameCount: recordedFrames.length,
          fps: 2,
          timestamp: new Date().toISOString(),
          source: 'browser_extension'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Store the analysis result if available
      if (data.analysis) {
        setAnalysisResult(data.analysis);
        setStatus(`✅ Recording analyzed! AI detected: ${Math.round(data.analysis.aiGeneratedLikelihood * 100)}% likelihood`);
      } else {
        setStatus(`✅ Recording sent successfully! Session ID: ${data.sessionId}`);
      }
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('API send error:', error);
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };

  // Cleanup interval on component unmount
  React.useEffect(() => {
    return () => {
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
    };
  }, [recordingInterval]);


  return (
    <div className="popup-container">
      <div className="header">
        <h3>🚀 Turbo Extension TECH EUROPE</h3>
      </div>

      <button className="button" onClick={fetchApiData} disabled={isLoading}>
        Fetch API Data
      </button>

      <button
        className="button"
        onClick={makeParagraphsPink}
        disabled={isLoading}
      >
        Make Paragraphs Pink 💖
      </button>

      <button
        className="button"
        onClick={captureScreenshot}
        disabled={isLoading || isRecording}
      >
        Capture Screenshot 📸
      </button>

      {!isRecording ? (
        <button
          className="button"
          onClick={startScreenRecording}
          disabled={isLoading}
        >
          Start Recording 🎬 (2 FPS)
        </button>
      ) : (
        <button
          className="button recording-stop"
          onClick={stopScreenRecording}
          disabled={isLoading}
        >
          Stop Recording ⏹️ ({recordedFrames.length} frames)
        </button>
      )}

      {screenshot && (
        <button
          className="button"
          onClick={sendScreenshotToApi}
          disabled={isLoading}
        >
          Send Screenshot to API 🚀
        </button>
      )}

      {recordedFrames.length > 0 && !isRecording && (
        <button
          className="button"
          onClick={sendRecordingToApi}
          disabled={isLoading}
        >
          {isAnalyzing ? (
            <>🤖 Analyzing with AI... ({recordedFrames.length} frames)</>
          ) : (
            <>Send Recording to API 🎥 ({recordedFrames.length} frames)</>
          )}
        </button>
      )}

      {recordedFrames.length > 0 && (
        <div className="recording-preview">
          <h4>Recording Preview ({recordedFrames.length} frames):</h4>
          <div className="frames-grid">
            {recordedFrames.slice(-12).map((frame, index) => (
              <img 
                key={`${recordedFrames.length - 12 + index}`}
                src={frame} 
                alt={`Frame ${recordedFrames.length - 12 + index + 1}`}
                className="frame-thumbnail"
                title={`Frame ${recordedFrames.length - 12 + index + 1}`}
              />
            ))}
          </div>
          {recordedFrames.length > 12 && (
            <p style={{ fontSize: '12px', color: '#666', margin: '8px 0 0 0' }}>
              Showing last 12 frames
            </p>
          )}
        </div>
      )}

      {screenshot && (
        <div className="screenshot-preview">
          <h4>Screenshot Preview:</h4>
          <img 
            src={screenshot} 
            alt="Captured screenshot" 
            style={{
              maxWidth: '100%',
              maxHeight: '200px',
              border: '2px solid #667eea',
              borderRadius: '8px',
              marginTop: '10px'
            }}
          />
        </div>
      )}

      {analysisResult && (
        <div className="analysis-results">
          <h4>AI Analysis Results:</h4>
          <div className="analysis-item">
            <strong>Username:</strong> {analysisResult.username}
          </div>
          <div className="analysis-item">
            <strong>What I See:</strong> {analysisResult.whatYouSee}
          </div>
          <div className="analysis-item">
            <strong>AI Generated Likelihood:</strong> 
            <span className={`likelihood-score likelihood-${Math.round(analysisResult.aiGeneratedLikelihood * 100) > 50 ? 'high' : 'low'}`}>
              {Math.round(analysisResult.aiGeneratedLikelihood * 100)}%
            </span>
          </div>
        </div>
      )}

      <div className="status">{status}</div>
    </div>
  );
};

// Render the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
