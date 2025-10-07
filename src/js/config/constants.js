/**
 * Application Constants
 * Enums, button states, error messages, and UI constants
 */

/**
 * UI Button States (state machine)
 */
export const BUTTON_STATES = {
  INITIAL: 'initial',                        // Initial state - show Share/Paste Offer
  INITIATOR_SHARE: 'initiator-share',        // Initiator - show Share Offer Link/QR
  INITIATOR_WAIT_ANSWER: 'initiator-wait-answer', // Initiator - waiting for answer
  RESPONDER_SHARE: 'responder-share',        // Responder - show Share Answer Code/QR
  CONNECTED: 'connected',                    // Connection established
};

/**
 * Video Layout Modes
 */
export const VIDEO_MODES = {
  SPLIT: 'split',           // 50/50 split view
  LOCAL_FULL: 'local-full', // Local video full screen, remote thumbnail
  REMOTE_FULL: 'remote-full', // Remote video full screen, local thumbnail
};

/**
 * Peer Roles
 */
export const PEER_ROLES = {
  INITIATOR: 'initiator',
  RESPONDER: 'responder',
};

/**
 * QR Paste Context (what type of QR code expected)
 */
export const QR_CONTEXTS = {
  OFFER: 'offer',
  ANSWER: 'answer',
};

/**
 * Connection States
 */
export const CONNECTION_STATES = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  FAILED: 'failed',
  DISCONNECTED: 'disconnected',
};

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  CAMERA_DENIED: '❌ Camera access denied',
  CAMERA_NOT_FOUND: '❌ No camera/microphone found',
  CAMERA_IN_USE: '❌ Device is already in use',
  NO_OFFER_URL: '❌ No offer URL available',
  NO_ANSWER_CODE: '❌ No answer code available',
  INVALID_OFFER: '❌ Invalid offer data',
  INVALID_ANSWER: '❌ Invalid answer code',
  INVALID_QR: '❌ No QR code found in image',
  QR_WRONG_TYPE_OFFER: "❌ This doesn't look like an offer QR code",
  QR_WRONG_TYPE_ANSWER: '❌ This looks like an offer, not an answer',
  CONNECTION_FAILED: '❌ Connection failed',
  QR_LIBRARY_NOT_LOADED: '❌ QR Code library not loaded',
};

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  OFFER_SHARED: '✅ Offer shared',
  OFFER_COPIED: '✅ Offer link copied to clipboard',
  ANSWER_SHARED: '✅ Answer shared',
  ANSWER_COPIED: '✅ Answer code copied to clipboard',
  QR_SHARED: '✅ QR code shared',
  QR_COPIED: '✅ QR Code copied to clipboard',
  QR_DOWNLOADED: '✅ QR Code downloaded',
  QR_GENERATED: '✅ QR Code generated',
  OFFER_RECEIVED: '✅ Offer received',
  ANSWER_RECEIVED: '✅ Answer received',
  ANSWER_READY: '✅ Answer ready to share',
  CONNECTED: '🎉 Connected!',
  RESET: '✅ Reset to initial state',
};

/**
 * Loading Messages
 */
export const LOADING_MESSAGES = {
  GENERATING_OFFER: 'Generating offer',
  PROCESSING_OFFER: 'Processing offer',
  CONNECTING: '⏳ Connecting...',
  GENERATING_QR: '🔄 Generating QR code...',
  DECODING_QR: '🔍 Decoding QR code...',
};

/**
 * SVG Icons (inline for performance)
 */
export const ICONS = {
  close: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  micOn: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  micOff: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  cameraOn: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`,
  cameraOff: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><path d="m2 2 20 20"/></svg>`,
  reload: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>`,
  share: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-share-icon lucide-share"><path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/></svg>`,
  paste: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download-icon lucide-download"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>`,
};
