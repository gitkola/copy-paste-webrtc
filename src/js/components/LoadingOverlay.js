/**
 * LoadingOverlay - Displays loading spinner and status messages
 *
 * @pattern Component (Presentation Layer)
 * @purpose Visual feedback during processing operations
 */

import store from '../store/index.js';

export default class LoadingOverlay {
  constructor() {
    this.overlay = document.getElementById('loading-overlay');
    this.message = document.getElementById('loading-message');

    if (!this.overlay || !this.message) {
      console.error('LoadingOverlay elements not found in DOM');
      return;
    }

    this.subscribeToState();
  }

  /**
   * Subscribe to state changes
   */
  subscribeToState() {
    store.subscribe((state, change) => {
      if (change.key === 'isLoading') {
        this.updateVisibility(change.value);
      }

      if (change.key === 'loadingMessage') {
        this.updateMessage(change.value);
      }
    });

    // Initial state
    this.updateVisibility(store.state.isLoading);
    this.updateMessage(store.state.loadingMessage);
  }

  /**
   * Update overlay visibility
   */
  updateVisibility(isLoading) {
    if (isLoading) {
      this.overlay.classList.remove('hidden');
    } else {
      this.overlay.classList.add('hidden');
    }
  }

  /**
   * Update loading message
   */
  updateMessage(message) {
    if (message) {
      this.message.textContent = message;
    }
  }
}
