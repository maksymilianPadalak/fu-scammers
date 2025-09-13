// Background service worker
console.log('🚀 Turbo Extension background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings on first install
    chrome.storage.sync.set({
      extensionEnabled: true,
      apiUrl: 'http://localhost:3001'
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked for tab:', tab.url);
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  // Example: Handle different message types
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get(['extensionEnabled', 'apiUrl'], (result) => {
      sendResponse(result);
    });
    return true; // Keep message channel open for async response
  }
});