/**
 * UIController - Manages UI state and interactions
 *
 * @pattern Controller
 * @purpose Coordinates UI components and handles user interactions
 */

import store from '../store/index.js';
import { BUTTON_STATES, VIDEO_MODES } from '../config/constants.js';
import logger from '../lib/Logger.js';

export default class UIController {
  constructor(connectionController) {
    this.connection = connectionController;
    this.mediaService = connectionController.getMediaService();
  }

  /**
   * Get current button state
   */
  getButtonState() {
    return store.state.buttonState;
  }

  /**
   * Handle "Share Offer" button click
   */
  async handleShareOfferClick() {
    try {
      await this.connection.startAsInitiator();
    } catch (error) {
      logger.error('Share offer failed:', error);
      throw error;
    }
  }

  /**
   * Handle "Paste Offer" button click
   */
  async handlePasteOfferClick() {
    // Set context for QR paste modal
    store.commit('setQRPasteContext', 'offer');
    // Modal will be opened by component
  }

  /**
   * Handle "Share Offer Link" button click
   */
  async handleShareOfferLinkClick() {
    try {
      const message = await this.connection.shareOfferUrl();
      return message;
    } catch (error) {
      logger.error('Share offer link failed:', error);
      throw error;
    }
  }

  /**
   * Handle "Share Offer QR" button click
   */
  async handleShareOfferQRClick() {
    try {
      const message = await this.connection.shareOfferQR();
      return message;
    } catch (error) {
      logger.error('Share offer QR failed:', error);
      throw error;
    }
  }

  /**
   * Handle "Paste Answer" button click
   */
  async handlePasteAnswerClick() {
    // Modal will be opened by component
  }

  /**
   * Handle answer code submission
   */
  async handleAnswerSubmit(answerCode) {
    try {
      await this.connection.processAnswer(answerCode);
    } catch (error) {
      logger.error('Process answer failed:', error);
      throw error;
    }
  }

  /**
   * Handle "Share Answer Code" button click
   */
  async handleShareAnswerCodeClick() {
    try {
      const message = await this.connection.shareAnswerCode();
      return message;
    } catch (error) {
      logger.error('Share answer code failed:', error);
      throw error;
    }
  }

  /**
   * Handle "Share Answer QR" button click
   */
  async handleShareAnswerQRClick() {
    try {
      const message = await this.connection.shareAnswerQR();
      return message;
    } catch (error) {
      logger.error('Share answer QR failed:', error);
      throw error;
    }
  }

  /**
   * Handle "Show QR" button click (modal display)
   */
  async handleShowQRClick() {
    try {
      const canvas = await this.connection.generateQRForModal();
      return canvas;
    } catch (error) {
      logger.error('Show QR failed:', error);
      throw error;
    }
  }

  /**
   * Handle QR code upload/paste
   */
  async handleQRCodeUpload(blob) {
    const context = store.state.qrPasteContext;
    try {
      const message = await this.connection.processQRCode(blob, context);
      return message;
    } catch (error) {
      logger.error('QR code processing failed:', error);
      throw error;
    }
  }

  /**
   * Handle mic toggle
   */
  handleMicToggle() {
    const newState = !store.state.micEnabled;
    this.mediaService.toggleAudio(newState);
    store.commit('setMicEnabled', newState);
    return newState;
  }

  /**
   * Handle camera toggle
   */
  handleCameraToggle() {
    const newState = !store.state.cameraEnabled;
    this.mediaService.toggleVideo(newState);
    store.commit('setCameraEnabled', newState);
    return newState;
  }

  /**
   * Handle reload button (reset to initial)
   */
  async handleReloadClick() {
    await this.connection.reset();
  }

  /**
   * Handle close button (close connection and reload)
   */
  handleCloseClick() {
    this.connection.closeConnection();
  }

  /**
   * Handle video click (toggle layout mode)
   */
  handleVideoClick() {
    const currentMode = store.state.videoMode;
    let nextMode;

    if (currentMode === VIDEO_MODES.SPLIT) {
      nextMode = VIDEO_MODES.LOCAL_FULL;
    } else if (currentMode === VIDEO_MODES.LOCAL_FULL) {
      nextMode = VIDEO_MODES.REMOTE_FULL;
    } else {
      nextMode = VIDEO_MODES.SPLIT;
    }

    store.commit('setVideoMode', nextMode);
    return nextMode;
  }

  /**
   * Check if button should be visible
   */
  isButtonVisible(buttonId) {
    const state = store.state.buttonState;

    const visibility = {
      // Initial state
      'share-offer-btn': state === BUTTON_STATES.INITIAL,
      'paste-offer-btn': state === BUTTON_STATES.INITIAL,

      // Initiator share state
      'share-offer-link-btn': state === BUTTON_STATES.INITIATOR_SHARE,
      'share-offer-qr-btn': state === BUTTON_STATES.INITIATOR_SHARE,

      // Initiator waiting for answer
      'paste-answer-btn': state === BUTTON_STATES.INITIATOR_WAIT_ANSWER,

      // Responder share state
      'share-answer-code-btn': state === BUTTON_STATES.RESPONDER_SHARE,
      'share-answer-qr-btn': state === BUTTON_STATES.RESPONDER_SHARE,

      // Connected state
      'close-btn': state === BUTTON_STATES.CONNECTED,
    };

    return visibility[buttonId] || false;
  }
}
