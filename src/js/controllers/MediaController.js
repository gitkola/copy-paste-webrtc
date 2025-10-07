/**
 * MediaController - Manages video layout and display
 *
 * @pattern Controller
 * @purpose Handles video layout modes and stream display
 */

import store from '../store/index.js';
import { VIDEO_MODES } from '../config/constants.js';
import logger from '../lib/Logger.js';

export default class MediaController {
  constructor() {
    this.localVideoElement = null;
    this.remoteVideoElement = null;
    this.videoGridElement = null;
  }

  /**
   * Set video elements
   */
  setVideoElements(localVideo, remoteVideo, videoGrid) {
    this.localVideoElement = localVideo;
    this.remoteVideoElement = remoteVideo;
    this.videoGridElement = videoGrid;
  }

  /**
   * Attach local stream to video element
   */
  attachLocalStream(stream) {
    if (this.localVideoElement) {
      this.localVideoElement.srcObject = stream;
      logger.debug('Local stream attached to video element');
    }
  }

  /**
   * Attach remote stream to video element
   */
  attachRemoteStream(stream) {
    if (this.remoteVideoElement) {
      this.remoteVideoElement.srcObject = stream;
      this.remoteVideoElement.classList.remove('hidden');
      logger.debug('Remote stream attached to video element');
    }
  }

  /**
   * Update video layout based on current mode
   */
  updateVideoLayout() {
    const mode = store.state.videoMode;
    const isConnected = store.state.connectionState === 'connected';

    if (!this.videoGridElement || !this.localVideoElement || !this.remoteVideoElement) {
      logger.warn('Video elements not set');
      return;
    }

    // Reset all classes
    this.videoGridElement.className = '';
    this.localVideoElement.className = '';
    this.remoteVideoElement.className = '';

    // Re-apply base styles
    this.localVideoElement.classList.add('local-video');

    if (!isConnected) {
      // Before connection: hide remote video
      this.remoteVideoElement.classList.add('hidden');
      return;
    }

    // Apply layout mode
    if (mode === VIDEO_MODES.SPLIT) {
      // Check orientation for split direction
      const isLandscape = window.innerWidth > window.innerHeight;
      this.videoGridElement.classList.add(isLandscape ? 'mode-split-h' : 'mode-split-v');
    } else {
      // Full screen mode
      this.videoGridElement.classList.add('mode-full');

      if (mode === VIDEO_MODES.LOCAL_FULL) {
        this.localVideoElement.classList.add('full');
        this.remoteVideoElement.classList.add('thumbnail');
      } else if (mode === VIDEO_MODES.REMOTE_FULL) {
        this.remoteVideoElement.classList.add('full');
        this.localVideoElement.classList.add('thumbnail');
      }
    }

    logger.debug(`Video layout updated: ${mode}`);
  }

  /**
   * Enable/disable local video click handler
   */
  setLocalVideoClickable(enabled) {
    if (this.localVideoElement) {
      if (enabled) {
        this.localVideoElement.classList.remove('no-click');
      } else {
        this.localVideoElement.classList.add('no-click');
      }
    }
  }

  /**
   * Get current video mode
   */
  getCurrentMode() {
    return store.state.videoMode;
  }

  /**
   * Subscribe to state changes for automatic layout updates
   */
  subscribeToStateChanges() {
    store.subscribe((state, change) => {
      if (change.key === 'videoMode' || change.key === 'connectionState') {
        this.updateVideoLayout();
      }

      if (change.key === 'localStream' && change.value) {
        this.attachLocalStream(change.value);
      }

      if (change.key === 'remoteStream' && change.value) {
        this.attachRemoteStream(change.value);
        this.setLocalVideoClickable(true); // Enable video clicking after connection
      }
    });

    logger.debug('MediaController subscribed to state changes');
  }
}
