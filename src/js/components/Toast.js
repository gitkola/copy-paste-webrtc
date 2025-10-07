/**
 * Toast - Notification component
 *
 * @pattern Component (Presentation Layer)
 * @purpose Display temporary notifications to users
 */

import { CONFIG } from '../config/webrtc.js';

export default class Toast {
  constructor(element) {
    this.element = element;
  }

  /**
   * Show toast message
   * @param {string} message - Message to display
   * @param {number} duration - Duration in ms (default: CONFIG.TOAST_DURATION)
   */
  show(message, duration = CONFIG.TOAST_DURATION) {
    this.element.textContent = message;
    this.element.classList.add('show');

    setTimeout(() => {
      this.hide();
    }, duration);
  }

  /**
   * Hide toast
   */
  hide() {
    this.element.classList.remove('show');
  }
}
