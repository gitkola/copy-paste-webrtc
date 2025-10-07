/**
 * Controls - Top control panel component
 *
 * @pattern Component (Presentation Layer)
 * @purpose Manages mic, camera, reload, and close buttons
 */

import { ICONS } from '../config/constants.js';
import store from '../store/index.js';

export default class Controls {
  constructor(uiController) {
    this.ui = uiController;

    // Get elements
    this.micToggle = document.getElementById('mic-toggle');
    this.cameraToggle = document.getElementById('camera-toggle');
    this.reloadBtn = document.getElementById('reload-btn');
    this.closeBtn = document.getElementById('close-btn');

    this.setupEventListeners();
    this.updateIcons();
    this.subscribeToState();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.micToggle.addEventListener('click', () => {
      const enabled = this.ui.handleMicToggle();
      this.updateMicIcon(enabled);
    });

    this.cameraToggle.addEventListener('click', () => {
      const enabled = this.ui.handleCameraToggle();
      this.updateCameraIcon(enabled);
    });

    this.reloadBtn.addEventListener('click', async () => {
      await this.ui.handleReloadClick();
    });

    this.closeBtn.addEventListener('click', () => {
      this.ui.handleCloseClick();
    });
  }

  /**
   * Update all icons
   */
  updateIcons() {
    this.micToggle.innerHTML = ICONS.micOn;
    this.cameraToggle.innerHTML = ICONS.cameraOn;
    this.reloadBtn.innerHTML = ICONS.reload;
    this.closeBtn.innerHTML = ICONS.close;
  }

  /**
   * Update mic icon based on state
   */
  updateMicIcon(enabled) {
    this.micToggle.innerHTML = enabled ? ICONS.micOn : ICONS.micOff;
    this.micToggle.classList.toggle('off', !enabled);
  }

  /**
   * Update camera icon based on state
   */
  updateCameraIcon(enabled) {
    this.cameraToggle.innerHTML = enabled ? ICONS.cameraOn : ICONS.cameraOff;
    this.cameraToggle.classList.toggle('off', !enabled);
  }

  /**
   * Subscribe to state changes
   */
  subscribeToState() {
    store.subscribe((state, change) => {
      if (change.key === 'buttonState') {
        this.updateVisibility();
      }
    });
  }

  /**
   * Update button visibility based on state
   */
  updateVisibility() {
    const showClose = this.ui.isButtonVisible('close-btn');
    this.closeBtn.classList.toggle('hidden', !showClose);
    this.reloadBtn.classList.toggle('hidden', showClose);
  }
}
