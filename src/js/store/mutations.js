/**
 * State mutations (synchronous)
 * Pure functions that modify state
 */

export default {
  // Connection state
  setConnectionState(state, connectionState) {
    state.connectionState = connectionState;
  },

  setRole(state, role) {
    state.role = role;
  },

  // UI state
  setButtonState(state, buttonState) {
    state.buttonState = buttonState;
  },

  setVideoMode(state, videoMode) {
    state.videoMode = videoMode;
  },

  setQRPasteContext(state, context) {
    state.qrPasteContext = context;
  },

  // Media
  setLocalStream(state, stream) {
    state.localStream = stream;
  },

  setRemoteStream(state, stream) {
    state.remoteStream = stream;
  },

  setMicEnabled(state, enabled) {
    state.micEnabled = enabled;
  },

  setCameraEnabled(state, enabled) {
    state.cameraEnabled = enabled;
  },

  // Data
  setOfferUrl(state, url) {
    state.offerUrl = url;
  },

  setAnswerCode(state, code) {
    state.answerCode = code;
  },

  // Flags
  setProcessing(state, isProcessing) {
    state.isProcessing = isProcessing;
  },

  setLoading(state, isLoading) {
    state.isLoading = isLoading;
  },

  setLoadingMessage(state, message) {
    state.loadingMessage = message;
  },

  // Error handling
  setError(state, error) {
    state.error = error;
  },

  clearError(state) {
    state.error = null;
  },

  // Reset state
  reset(state) {
    state.connectionState = 'idle';
    state.role = null;
    state.buttonState = 'initial';
    state.videoMode = 'split';
    state.remoteStream = null;
    state.offerUrl = null;
    state.answerCode = null;
    state.isProcessing = false;
    state.isLoading = false;
    state.error = null;
  },
};
