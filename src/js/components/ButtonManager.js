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
      await this.handlePasteOfferWithClipboard();
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

    // Initiator paste answer button - Direct clipboard paste
    this.buttons.pasteAnswer.addEventListener('click', async () => {
      await this.handlePasteAnswerWithClipboard();
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
   * Handle paste offer with direct clipboard reading
   */
  async handlePasteOfferWithClipboard() {
    try {
      // Try to read from clipboard
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        // Clipboard API not available, fall back to modal
        logger.warn('Clipboard API not available, using modal');
        this.ui.handlePasteOfferClick();
        return;
      }

      this.toast.show('📋 Reading from clipboard...');

      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText || clipboardText.trim().length === 0) {
        // Clipboard empty, open modal for QR paste
        logger.info('Clipboard empty, opening QR paste modal');
        this.toast.show('📝 Clipboard empty, paste URL or QR');
        this.ui.handlePasteOfferClick();
        return;
      }

      // Check if it looks like an offer URL/code
      const text = clipboardText.trim();
      if (!text.includes('://') && text.length < 100) {
        // Doesn't look like valid offer, might be wrong data
        logger.info(
          'Clipboard content does not look like offer, opening modal'
        );
        this.toast.show('📝 Please paste offer URL or upload QR');
        this.ui.handlePasteOfferClick();
        return;
      }

      // Process offer directly
      this.toast.show('⏳ Processing offer...');
      await this.ui.handleOfferSubmit(text);
    } catch (error) {
      // Handle permission denied or other errors
      if (error.name === 'NotAllowedError') {
        logger.warn('Clipboard permission denied, using modal');
        this.toast.show('📝 Clipboard access denied, paste manually');
      } else {
        logger.error('Paste offer failed:', error);
        this.toast.show(error.message);
      }

      // Fall back to modal
      this.ui.handlePasteOfferClick();
    }
  }

  /**
   * Handle paste answer with direct clipboard reading
   */
  async handlePasteAnswerWithClipboard() {
    try {
      // Try to read from clipboard
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        // Clipboard API not available, fall back to modal
        logger.warn('Clipboard API not available, using modal');
        this.ui.handlePasteAnswerClick();
        return;
      }

      this.toast.show('📋 Reading from clipboard...');

      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText || clipboardText.trim().length === 0) {
        // Clipboard empty, open modal for manual paste
        logger.info('Clipboard empty, opening modal');
        this.toast.show('📝 Clipboard empty, paste manually');
        this.ui.handlePasteAnswerClick();
        return;
      }

      // Process answer directly
      this.toast.show('⏳ Processing answer...');
      await this.ui.handleAnswerSubmit(clipboardText.trim());
    } catch (error) {
      // Handle permission denied or other errors
      if (error.name === 'NotAllowedError') {
        logger.warn('Clipboard permission denied, using modal');
        this.toast.show('📝 Clipboard access denied, paste manually');
      } else {
        logger.error('Paste answer failed:', error);
        this.toast.show(error.message);
      }

      // Fall back to modal
      this.ui.handlePasteAnswerClick();
    }
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

      if (change.key === 'isProcessing') {
        this.updateButtonsDisabledState(change.value);
      }
    });

    // Initial update
    this.updateButtonVisibility();
    this.updateButtonsDisabledState(store.state.isProcessing);
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

  /**
   * Update buttons disabled state
   */
  updateButtonsDisabledState(isProcessing) {
    Object.keys(this.buttons).forEach((key) => {
      const buttonElement = this.buttons[key];
      buttonElement.disabled = isProcessing;
      buttonElement.classList.toggle('processing', isProcessing);
    });
  }
}
