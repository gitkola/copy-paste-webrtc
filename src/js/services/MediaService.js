/**
 * MediaService - Manages media streams (camera/microphone)
 *
 * @pattern Service Layer
 * @purpose Abstraction over getUserMedia API with track management
 */

import { getMediaConstraints } from '../config/webrtc.js';
import { ERROR_MESSAGES } from '../config/constants.js';
import logger from '../lib/Logger.js';

export default class MediaService {
  constructor() {
    this.localStream = null;
    this.micEnabled = true;
    this.cameraEnabled = true;
  }

  /**
   * Request user's camera and microphone
   * @param {MediaStreamConstraints} constraints - Optional constraint overrides
   * @returns {Promise<MediaStream>}
   */
  async getUserMedia(constraints = {}) {
    try {
      logger.info('Requesting user media...');
      this.localStream = await navigator.mediaDevices.getUserMedia(
        getMediaConstraints(constraints)
      );
      logger.info('User media granted');
      return this.localStream;
    } catch (error) {
      logger.error('Failed to get user media:', error);
      throw this.handleMediaError(error);
    }
  }

  /**
   * Toggle microphone on/off
   * @param {boolean} enabled - Enable or disable
   */
  toggleAudio(enabled) {
    this.micEnabled = enabled;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      logger.debug(`Audio ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Toggle camera on/off
   * @param {boolean} enabled - Enable or disable
   */
  toggleVideo(enabled) {
    this.cameraEnabled = enabled;
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      logger.debug(`Video ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Stop all tracks and release media devices
   */
  stopAllTracks() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        logger.debug(`Track stopped: ${track.kind}`);
      });
      this.localStream = null;
    }
  }

  /**
   * Get current local stream
   * @returns {MediaStream|null}
   */
  getLocalStream() {
    return this.localStream;
  }

  /**
   * Check if audio is enabled
   * @returns {boolean}
   */
  isAudioEnabled() {
    return this.micEnabled;
  }

  /**
   * Check if video is enabled
   * @returns {boolean}
   */
  isVideoEnabled() {
    return this.cameraEnabled;
  }

  /**
   * Handle media errors with user-friendly messages
   * @private
   * @param {Error} error - Media error from getUserMedia
   * @returns {Error} Formatted error
   */
  handleMediaError(error) {
    const errorMap = {
      'NotAllowedError': ERROR_MESSAGES.CAMERA_DENIED,
      'NotFoundError': ERROR_MESSAGES.CAMERA_NOT_FOUND,
      'NotReadableError': ERROR_MESSAGES.CAMERA_IN_USE,
      'OverconstrainedError': ERROR_MESSAGES.CAMERA_IN_USE,
    };

    const message = errorMap[error.name] || error.message;
    return new Error(message);
  }
}
