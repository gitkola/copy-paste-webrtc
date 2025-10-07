/**
 * WebRTC Configuration
 * All magic numbers and configurations centralized
 */

export const CONFIG = {
  // Timeouts (milliseconds)
  TOAST_DURATION: 2000,
  AUTO_PASTE_DELAY: 100,
  MEDIA_NEGOTIATION_DELAY: 500,
  ICE_GATHERING_TIMEOUT: 5000,

  // Video settings
  VIDEO_WIDTH: 640,
  VIDEO_HEIGHT: 480,
  VIDEO_FRAMERATE: 30,

  // Audio settings
  AUDIO_ECHO_CANCELLATION: true,
  AUDIO_NOISE_SUPPRESSION: true,
  AUDIO_AUTO_GAIN: true,

  // QR Code settings
  QR_SIZE: 800,
  QR_ERROR_CORRECTION: 'H', // High error correction (30%) for better reliability
  QR_MARGIN: 2,

  // WebRTC settings
  ICE_CANDIDATE_POOL_SIZE: 10,

  // ICE servers (STUN only - no TURN servers)
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

/**
 * Get media constraints for getUserMedia
 * @param {Object} overrides - Optional constraint overrides
 * @returns {MediaStreamConstraints}
 */
export function getMediaConstraints(overrides = {}) {
  return {
    audio: {
      echoCancellation: CONFIG.AUDIO_ECHO_CANCELLATION,
      noiseSuppression: CONFIG.AUDIO_NOISE_SUPPRESSION,
      autoGainControl: CONFIG.AUDIO_AUTO_GAIN,
      ...overrides.audio,
    },
    video: {
      width: { ideal: CONFIG.VIDEO_WIDTH },
      height: { ideal: CONFIG.VIDEO_HEIGHT },
      frameRate: { ideal: CONFIG.VIDEO_FRAMERATE },
      ...overrides.video,
    },
  };
}

/**
 * Get RTCConfiguration for peer connections
 * @returns {RTCConfiguration}
 */
export function getRTCConfiguration() {
  return {
    iceServers: CONFIG.ICE_SERVERS,
    iceCandidatePoolSize: CONFIG.ICE_CANDIDATE_POOL_SIZE,
  };
}
