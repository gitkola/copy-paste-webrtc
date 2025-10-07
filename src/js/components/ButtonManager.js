/**
 * ButtonManager - Manages main action buttons
 *
 * @pattern Component (Presentation Layer)
 * @purpose Controls visibility and actions of main buttons (share/paste)
 */

import store from '../store/index.js';
import logger from '../lib/Logger.js';

export default class ButtonManager {
  constructor(uiController, toast) {
    this.ui = uiController;
    this.toast = toast;

    // Get all button elements
    this.buttons = {
      shareOffer: document.getElementById('share-offer-btn'),
      pasteOffer: document.getElementById('paste-offer-btn'),
      shareOfferLink: document.getElementById('share-offer-link-btn'),
      shareOfferQR: document.getElementById('share-offer-qr-btn'),
      pasteAnswer: document.getElementById('paste-answer-btn'),
      shareAnswerCode: document.getElementById('share-answer-code-btn'),
      shareAnswerQR: document.getElementById('share-answer-qr-btn'),
    };

    this.setupEventListeners();
    this.subscribeToState();
  }

  /**
   * Setup event listeners for all buttons
   */
  setupEventListeners() {
    // Initial state buttons
    this.buttons.shareOffer.addEventListener('click', async () => {
      await this.handleAction(async () => {
        await this.ui.handleShareOfferClick();
      });
    });

    this.buttons.pasteOffer.addEventListener('click', async () => {
      this.ui.handlePasteOfferClick();
      // Modal will be opened by ModalManager
    });

    // Initiator share buttons
    this.buttons.shareOfferLink.addEventListener('click', async () => {
      await this.handleAction(async () => {
        const message = await this.ui.handleShareOfferLinkClick();
        this.toast.show(message);
      });
    });

    this.buttons.shareOfferQR.addEventListener('click', async () => {
      await this.handleAction(async () => {
        const message = await this.ui.handleShareOfferQRClick();
        this.toast.show(message);
      });
    });

    // Initiator paste answer button
    this.buttons.pasteAnswer.addEventListener('click', () => {
      this.ui.handlePasteAnswerClick();
      // Modal will be opened by ModalManager
    });

    // Responder share buttons
    this.buttons.shareAnswerCode.addEventListener('click', async () => {
      await this.handleAction(async () => {
        const message = await this.ui.handleShareAnswerCodeClick();
        this.toast.show(message);
      });
    });

    this.buttons.shareAnswerQR.addEventListener('click', async () => {
      await this.handleAction(async () => {
        const message = await this.ui.handleShareAnswerQRClick();
        this.toast.show(message);
      });
    });
  }

  /**
   * Handle button action with error handling
   */
  async handleAction(action) {
    try {
      await action();
    } catch (error) {
      logger.error('Button action failed:', error);
      this.toast.show(error.message);
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribeToState() {
    store.subscribe((state, change) => {
      if (change.key === 'buttonState') {
        this.updateButtonVisibility();
      }
    });

    // Initial update
    this.updateButtonVisibility();
  }

  /**
   * Update button visibility based on current state
   */
  updateButtonVisibility() {
    Object.keys(this.buttons).forEach((key) => {
      const buttonElement = this.buttons[key];
      const buttonId = buttonElement.id;
      const visible = this.ui.isButtonVisible(buttonId);

      buttonElement.classList.toggle('hidden', !visible);
    });
  }
}
