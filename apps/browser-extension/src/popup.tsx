import React from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

const Popup: React.FC = () => {
  const [status, setStatus] = React.useState<string>('Ready');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isRecording, setIsRecording] = React.useState<boolean>(false);
  const [recordedFrames, setRecordedFrames] = React.useState<string[]>([]);
  const [recordingInterval, setRecordingInterval] = React.useState<NodeJS.Timeout | null>(null);
  const [analysisResult, setAnalysisResult] = React.useState<{
    username: string,
    whatYouSee: string,
    synthetic_likelihood: number,
    decision: string,
    artifacts: {
      temporal_inconsistency: boolean;
      edge_halos_or_seams: boolean;
      finger_or_teeth_anomalies: boolean;
      texture_or_pore_smoothing: boolean;
      lighting_or_reflection_mismatch: boolean;
      weird_text_or_logos: boolean;
      motion_wobble_or_jelly_faces: boolean;
    },
    notes: string
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState<boolean>(false);
  const [weaviateStatus, setWeaviateStatus] = React.useState<{stored: boolean, reason: string} | null>(null);


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
      setWeaviateStatus(null);
      setIsRecording(true);
      
      // Capture first frame immediately
      const firstFrame = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
        quality: 90
      });
      setRecordedFrames([firstFrame]);
      
      // Set up interval to capture frames at 10 FPS (every 100ms)
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
      }, 100); // 10 FPS = 100ms interval
      
      setRecordingInterval(interval);
      setStatus('🎬 Recording started! Capturing at 10 FPS...');
      
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
          fps: 10,
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
        
        // Store Weaviate status if available
        if (data.weaviate) {
          setWeaviateStatus(data.weaviate);
        }
        
        let statusMessage = `✅ Recording analyzed! AI detected: ${Math.round(data.analysis.synthetic_likelihood * 100)}% likelihood`;
        
        // Add Weaviate storage information if available
        if (data.weaviate) {
          if (data.weaviate.stored) {
            statusMessage += ` 🚨 Username flagged and stored in database!`;
          } else if (data.analysis.synthetic_likelihood > 0.5) {
            statusMessage += ` ⚠️ Above threshold but username unknown`;
          }
        }
        
        setStatus(statusMessage);
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
        <h3>🤖 AI Detection Lab</h3>
      </div>

      {!isRecording ? (
        <button
          className="button"
          onClick={startScreenRecording}
          disabled={isLoading}
        >
          Start Recording 🎬 (10 FPS)
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
            <strong>Decision:</strong> 
            <span className={`decision-badge decision-${analysisResult.decision}`}>
              {analysisResult.decision.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="analysis-item">
            <strong>AI Generated Likelihood:</strong> 
            <span className={`likelihood-score likelihood-${Math.round(analysisResult.synthetic_likelihood * 100) > 50 ? 'high' : 'low'}`}>
              {Math.round(analysisResult.synthetic_likelihood * 100)}%
            </span>
          </div>
          <div className="analysis-item">
            <strong>Detected Artifacts:</strong>
            <div className="artifacts-grid">
              {Object.entries(analysisResult.artifacts).map(([key, value]) => (
                <div key={key} className={`artifact-item ${value ? 'detected' : 'not-detected'}`}>
                  {value ? '✓' : '✗'} {key.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          </div>
          <div className="analysis-item">
            <strong>Notes:</strong> {analysisResult.notes}
          </div>
          
          {weaviateStatus && (
            <div className="analysis-item">
              <strong>Database Status:</strong>
              <span className={`weaviate-status ${weaviateStatus.stored ? 'flagged' : 'not-flagged'}`}>
                {weaviateStatus.stored ? '🚨 FLAGGED & STORED' : `⚠️ ${weaviateStatus.reason.toUpperCase()}`}
              </span>
            </div>
          )}
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
