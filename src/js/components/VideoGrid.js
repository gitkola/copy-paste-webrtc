/**
 * VideoGrid - Video display component
 *
 * @pattern Component (Presentation Layer)
 * @purpose Manages video elements and layout
 */

import store from '../store/index.js';
import logger from '../lib/Logger.js';

export default class VideoGrid {
  constructor(mediaController) {
    this.media = mediaController;

    // Get video elements
    this.localVideo = document.getElementById('local-video');
    this.remoteVideo = document.getElementById('remote-video');
    this.videoGrid = document.getElementById('video-grid-view');

    // Set video elements in media controller
    this.media.setVideoElements(this.localVideo, this.remoteVideo, this.videoGrid);

    this.setupEventListeners();
    this.subscribeToState();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Video click to toggle layout
    this.localVideo.addEventListener('click', () => {
      if (!this.localVideo.classList.contains('no-click')) {
        this.handleVideoClick();
      }
    });

    this.remoteVideo.addEventListener('click', () => {
      this.handleVideoClick();
    });

    // Handle orientation changes
    window.addEventListener('resize', () => {
      this.media.updateVideoLayout();
    });
  }

  /**
   * Handle video click (toggle layout mode)
   */
  handleVideoClick() {
    const currentMode = this.media.getCurrentMode();
    logger.debug(`Video clicked, current mode: ${currentMode}`);

    // Cycle through modes: split -> local-full -> remote-full -> split
    let nextMode;
    if (currentMode === 'split') {
      nextMode = 'local-full';
    } else if (currentMode === 'local-full') {
      nextMode = 'remote-full';
    } else {
      nextMode = 'split';
    }

    store.commit('setVideoMode', nextMode);
  }

  /**
   * Subscribe to state changes
   */
  subscribeToState() {
    // MediaController handles video layout updates via its own subscription
    // This component just manages click interactions

    store.subscribe((state, change) => {
      if (change.key === 'localStream' && change.value) {
        logger.debug('Local stream updated in VideoGrid');
      }

      if (change.key === 'remoteStream' && change.value) {
        logger.debug('Remote stream updated in VideoGrid');
      }
    });
  }
}
