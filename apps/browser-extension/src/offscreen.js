let mediaRecorder = null;
let chunks = [];
let capturedStream = null;

function start() {
  try {
    // Use tabCapture from background via message, but offscreen can itself capture?
    // In many cases, offscreen cannot call tabCapture; instead background should have created the doc during a user gesture.
    chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
      const err = chrome.runtime.lastError?.message;
      if (err) {
        chrome.runtime.sendMessage({ type: 'OFFSCREEN_ERROR', error: err });
        return;
      }
      if (!stream) {
        chrome.runtime.sendMessage({ type: 'OFFSCREEN_ERROR', error: 'No stream' });
        return;
      }

      capturedStream = stream;
      chunks = [];

      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      } catch (e) {
        chrome.runtime.sendMessage({ type: 'OFFSCREEN_ERROR', error: String(e) });
        return;
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        try {
          const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result || '').toString().split(',')[1];
            chrome.runtime.sendMessage({ type: 'OFFSCREEN_AUDIO_READY', success: true, audioData: base64, size: blob.size, mimeType: 'audio/webm;codecs=opus' });
            cleanup();
          };
          reader.readAsDataURL(blob);
        } catch (e) {
          chrome.runtime.sendMessage({ type: 'OFFSCREEN_ERROR', error: String(e) });
          cleanup();
        }
      };

      mediaRecorder.start(1000);
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_STARTED', success: true });
    });
  } catch (e) {
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_ERROR', error: String(e) });
  }
}

function stop() {
  try {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    } else {
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_ERROR', error: 'Not recording' });
    }
  } catch (e) {
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_ERROR', error: String(e) });
  }
}

function cleanup() {
  try {
    if (capturedStream) {
      capturedStream.getTracks().forEach((t) => t.stop());
      capturedStream = null;
    }
    chunks = [];
    mediaRecorder = null;
  } catch {}
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'OFFSCREEN_START_RECORDING') {
    start();
    sendResponse({ success: true });
    return true;
  }
  if (msg?.type === 'OFFSCREEN_STOP_RECORDING') {
    stop();
    sendResponse({ success: true });
    return true;
  }
});
