// Content script - runs on web pages
console.log('🚀 Turbo Extension content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'highlight') {
    highlightPageElements();
    sendResponse({ success: true });
  }
});

function highlightPageElements() {
  // Remove existing highlights
  const existingHighlights = document.querySelectorAll('.turbo-extension-pink-p');
  existingHighlights.forEach(el => {
    el.classList.remove('turbo-extension-pink-p');
  });

  // Add CSS for pink p styling if it doesn't exist
  if (!document.getElementById('turbo-extension-styles')) {
    const style = document.createElement('style');
    style.id = 'turbo-extension-styles';
    style.textContent = `
      .turbo-extension-pink-p {
        color: #ff69b4 !important;
        transition: color 0.3s ease !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Change all p tags to pink
  const pElements = document.querySelectorAll('p');
  pElements.forEach(el => {
    el.classList.add('turbo-extension-pink-p');
  });

  console.log(`🎨 Changed ${pElements.length} p tags to pink!`);
}
