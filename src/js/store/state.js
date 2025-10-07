/**
 * Initial application state
 */

import { BUTTON_STATES, VIDEO_MODES, CONNECTION_STATES } from '../config/constants.js';

export default {
  // Connection state
  connectionState: CONNECTION_STATES.IDLE,
  role: null, // 'initiator' or 'responder'

  // UI state
  buttonState: BUTTON_STATES.INITIAL,
  videoMode: VIDEO_MODES.SPLIT,
  qrPasteContext: 'offer', // 'offer' or 'answer'

  // Media state
  localStream: null,
  remoteStream: null,
  micEnabled: true,
  cameraEnabled: true,

  // Data
  offerUrl: null,
  answerCode: null,

  // Flags
  isProcessing: false,
  isLoading: false,

  // Error handling
  error: null,
};
