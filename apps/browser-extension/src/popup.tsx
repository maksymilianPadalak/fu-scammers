import React from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

const Popup: React.FC = () => {
  const [status, setStatus] = React.useState<string>('Ready');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

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
