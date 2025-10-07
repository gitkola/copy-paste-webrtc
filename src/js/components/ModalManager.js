/**
 * ModalManager - Manages modals (paste answer, QR display, QR paste)
 *
 * @pattern Component (Presentation Layer)
 * @purpose Controls modal display and handles modal interactions
 */

import store from '../store/index.js';
import logger from '../lib/Logger.js';

export default class ModalManager {
  constructor(uiController, toast) {
    this.ui = uiController;
    this.toast = toast;
    this.qrService = uiController.connection.getQRService();

    // Get modal elements
    this.pasteModal = document.getElementById('paste-modal');
    this.answerInput = document.getElementById('answer-input');
    this.pasteModalPasteQR = document.getElementById('paste-modal-paste-qr');
    this.pasteModalUploadQR = document.getElementById('paste-modal-upload-qr');
    this.pasteModalFileInput = document.getElementById('paste-modal-file-input');
    this.qrModal = document.getElementById('qr-modal');
    this.qrDisplay = document.getElementById('qr-display');
    this.qrPasteModal = document.getElementById('qr-paste-modal');
    this.qrFileInput = document.getElementById('qr-file-input');
    this.qrPasteArea = document.getElementById('qr-paste-area');

    this.setupEventListeners();
    this.subscribeToState();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Paste Answer Modal
    document.getElementById('modal-cancel').addEventListener('click', () => {
      this.hidePasteModal();
    });

    document.getElementById('modal-connect').addEventListener('click', async () => {
      await this.handleAnswerSubmit();
    });

    this.answerInput.addEventListener('paste', () => {
      setTimeout(() => this.handleAnswerSubmit(), 100);
    });

    // Paste Modal - Paste QR from clipboard
    if (this.pasteModalPasteQR) {
      this.pasteModalPasteQR.addEventListener('click', async () => {
        await this.handlePasteModalClipboardQR();
      });
    }

    // Paste Modal - Upload QR file
    if (this.pasteModalUploadQR) {
      this.pasteModalUploadQR.addEventListener('click', () => {
        this.pasteModalFileInput.click();
      });
    }

    if (this.pasteModalFileInput) {
      this.pasteModalFileInput.addEventListener('change', async (e) => {
        await this.handlePasteModalQRUpload(e);
      });
    }

    // Global paste listener for paste modal
    document.addEventListener('paste', async (e) => {
      if (!this.pasteModal.classList.contains('hidden')) {
        await this.handlePasteModalGlobalPaste(e);
      }
    });

    // QR Modal (display)
    document.getElementById('qr-share').addEventListener('click', async () => {
      await this.handleQRShare();
    });

    document.getElementById('qr-download').addEventListener('click', () => {
      this.handleQRDownload();
    });

    document.getElementById('qr-close').addEventListener('click', () => {
      this.hideQRModal();
    });

    // QR Paste Modal
    document.getElementById('qr-paste-cancel').addEventListener('click', () => {
      this.hideQRPasteModal();
    });

    document.getElementById('qr-upload-btn').addEventListener('click', () => {
      this.qrFileInput.click();
    });

    this.qrFileInput.addEventListener('change', async (e) => {
      await this.handleQRFileUpload(e);
    });

    // Global paste listener for QR paste modal
    document.addEventListener('paste', async (e) => {
      if (!this.qrPasteModal.classList.contains('hidden')) {
        await this.handleQRPaste(e);
      }
    });
  }

  /**
   * Show paste answer modal
   */
  showPasteModal() {
    this.pasteModal.classList.remove('hidden');
    this.answerInput.focus();
  }

  /**
   * Hide paste answer modal
   */
  hidePasteModal() {
    this.pasteModal.classList.add('hidden');
    this.answerInput.value = '';
  }

  /**
   * Handle answer code submission
   */
  async handleAnswerSubmit() {
    const input = this.answerInput.value.trim();
    if (!input) return;

    try {
      this.hidePasteModal();
      this.toast.show('⏳ Connecting...');

      await this.ui.handleAnswerSubmit(input);
    } catch (error) {
      logger.error('Answer submission failed:', error);
      this.toast.show(error.message);
    }
  }

  /**
   * Handle QR code upload from paste modal
   */
  async handlePasteModalQRUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      this.hidePasteModal();
      this.toast.show('🔍 Decoding QR code...');

      // Process QR code as answer
      const message = await this.ui.handleQRCodeUpload(file);
      this.toast.show(message);
    } catch (error) {
      logger.error('QR upload failed:', error);
      this.toast.show(error.message);
      // Re-show modal on error
      this.showPasteModal();
    } finally {
      // Reset file input
      this.pasteModalFileInput.value = '';
    }
  }

  /**
   * Handle paste QR from clipboard button click
   */
  async handlePasteModalClipboardQR() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        this.toast.show('❌ Clipboard API not available. Use Ctrl+V or Upload instead.');
        return;
      }

      this.toast.show('📋 Reading from clipboard...');

      const clipboardItems = await navigator.clipboard.read();

      for (const item of clipboardItems) {
        const imageTypes = item.types.filter(type => type.startsWith('image/'));

        if (imageTypes.length > 0) {
          const blob = await item.getType(imageTypes[0]);
          await this.processPasteModalQRBlob(blob);
          return;
        }
      }

      this.toast.show('❌ No image found in clipboard. Copy a QR code image first.');
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        this.toast.show('❌ Clipboard access denied. Use Ctrl+V or Upload instead.');
      } else {
        logger.error('Clipboard read failed:', error);
        this.toast.show('❌ Failed to read clipboard');
      }
    }
  }

  /**
   * Handle global paste event in paste modal
   */
  async handlePasteModalGlobalPaste(event) {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const blob = item.getAsFile();
        await this.processPasteModalQRBlob(blob);
        break;
      }
    }
  }

  /**
   * Process QR code blob from paste modal
   */
  async processPasteModalQRBlob(blob) {
    try {
      this.hidePasteModal();
      this.toast.show('🔍 Decoding QR code...');

      const message = await this.ui.handleQRCodeUpload(blob);
      this.toast.show(message);
    } catch (error) {
      logger.error('QR processing failed:', error);
      this.toast.show(error.message);
      // Re-show modal on error
      this.showPasteModal();
    }
  }

  /**
   * Show QR modal with generated QR code
   */
  async showQRModal() {
    try {
      this.toast.show('🔄 Generating QR code...');

      const canvas = await this.ui.handleShowQRClick();

      this.qrDisplay.innerHTML = '';
      this.qrDisplay.appendChild(canvas);

      this.qrModal.classList.remove('hidden');
      this.toast.show('✅ QR Code generated');
    } catch (error) {
      logger.error('Show QR failed:', error);
      this.toast.show(error.message);
    }
  }

  /**
   * Hide QR modal
   */
  hideQRModal() {
    this.qrModal.classList.add('hidden');
  }

  /**
   * Handle QR code share from modal
   */
  async handleQRShare() {
    try {
      const canvas = this.qrDisplay.querySelector('canvas');
      if (!canvas) {
        this.toast.show('❌ No QR code to share');
        return;
      }

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      const file = new File([blob], 'webrtc-connection.png', { type: 'image/png' });

      // Try native share
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'WebRTC Connection QR Code',
        });
        this.toast.show('✅ QR Code shared');
      } else if (navigator.clipboard && navigator.clipboard.write) {
        // Fallback to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        this.toast.show('✅ QR Code copied to clipboard');
      } else {
        this.toast.show('❌ Please use Download button');
      }
    } catch (error) {
      logger.error('QR share failed:', error);
      this.toast.show('❌ Share failed. Use Download button');
    }
  }

  /**
   * Handle QR code download from modal
   */
  handleQRDownload() {
    const canvas = this.qrDisplay.querySelector('canvas');
    if (!canvas) {
      this.toast.show('❌ No QR code to download');
      return;
    }

    this.qrService.downloadQRCode(canvas);
    this.toast.show('✅ QR Code downloaded');
  }

  /**
   * Show QR paste modal
   */
  showQRPasteModal() {
    const context = store.state.qrPasteContext;
    const titleEl = document.getElementById('qr-paste-modal-title');

    if (context === 'offer') {
      titleEl.textContent = 'Paste or Upload Offer QR Code';
    } else {
      titleEl.textContent = 'Paste or Upload Answer QR Code';
    }

    this.qrPasteModal.classList.remove('hidden');
  }

  /**
   * Hide QR paste modal
   */
  hideQRPasteModal() {
    this.qrPasteModal.classList.add('hidden');
  }

  /**
   * Handle QR code paste
   */
  async handleQRPaste(event) {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const blob = item.getAsFile();
        await this.processQRBlob(blob);
        break;
      }
    }
  }

  /**
   * Handle QR code file upload
   */
  async handleQRFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    await this.processQRBlob(file);
    this.qrFileInput.value = ''; // Reset input
  }

  /**
   * Process QR code blob
   */
  async processQRBlob(blob) {
    try {
      this.hideQRPasteModal();
      this.toast.show('🔍 Decoding QR code...');

      const message = await this.ui.handleQRCodeUpload(blob);
      this.toast.show(message);
    } catch (error) {
      logger.error('QR processing failed:', error);
      this.toast.show(error.message);
      this.showQRPasteModal(); // Re-show modal on error
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribeToState() {
    store.subscribe((state, change) => {
      // Auto-show paste modal when waiting for answer
      if (change.key === 'buttonState' && change.value === 'initiator-wait-answer') {
        // Don't auto-show - wait for user click
      }
    });
  }

  /**
   * Public method to show modals from outside
   */
  openPasteAnswerModal() {
    this.showPasteModal();
  }

  /**
   * Public method to show QR paste modal
   */
  openQRPasteModal() {
    this.showQRPasteModal();
  }

  /**
   * Public method to show QR display modal
   */
  openQRDisplayModal() {
    this.showQRModal();
  }
}
