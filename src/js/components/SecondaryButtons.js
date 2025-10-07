/**
 * SecondaryButtons - Secondary action buttons (Show QR, Paste QR)
 *
 * @pattern Component (Presentation Layer)
 * @purpose Manages secondary buttons in button group container
 */

import store from '../store/index.js';

export default class SecondaryButtons {
  constructor(modalManager) {
    this.modal = modalManager;

    // Create secondary buttons dynamically or get existing ones
    this.setupButtons();
  }

  /**
   * Setup secondary buttons
   */
  setupButtons() {
    // Get or create container
    let container = document.getElementById('button-group-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'button-group-container';
      document.getElementById('controls-overlay').appendChild(container);
    }

    // Show QR button
    this.showQRBtn = this.createButton('qr-show-btn', 'Show QR', () => {
      this.modal.openQRDisplayModal();
    });

    // Paste QR Offer button (always visible initially)
    this.pasteQROfferBtn = this.createButton(
      'initial-qr-paste-btn',
      'Paste QR Offer',
      () => {
        store.commit('setQRPasteContext', 'offer');
        this.modal.openQRPasteModal();
      }
    );
    this.pasteQROfferBtn.style.position = 'absolute';
    this.pasteQROfferBtn.style.bottom = '20px';
    this.pasteQROfferBtn.style.left = '50%';
    this.pasteQROfferBtn.style.transform = 'translateX(-50%)';

    // Paste QR Answer button (shown when waiting for answer)
    this.pasteQRAnswerBtn = this.createButton(
      'qr-paste-btn',
      'Paste QR Answer',
      () => {
        store.commit('setQRPasteContext', 'answer');
        this.modal.openQRPasteModal();
      }
    );

    container.appendChild(this.showQRBtn);
    container.appendChild(this.pasteQRAnswerBtn);
    document.getElementById('controls-overlay').appendChild(this.pasteQROfferBtn);

    this.subscribeToState();
    this.updateVisibility();
  }

  /**
   * Create button element
   */
  createButton(id, text, onClick) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'secondary-btn';
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
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
    const state = store.state.buttonState;

    // Show QR button: visible when there's offer or answer to show
    const showQR =
      state === 'initiator-share' ||
      state === 'initiator-wait-answer' ||
      state === 'responder-share';
    this.showQRBtn.classList.toggle('hidden', !showQR);

    // Paste QR Offer button: visible on initial screen
    const showPasteOffer = state === 'initial';
    this.pasteQROfferBtn.classList.toggle('hidden', !showPasteOffer);

    // Paste QR Answer button: visible when waiting for answer
    const showPasteAnswer = state === 'initiator-wait-answer';
    this.pasteQRAnswerBtn.classList.toggle('hidden', !showPasteAnswer);
  }
}
