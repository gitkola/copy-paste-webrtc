/**
 * ConnectionController - Orchestrates WebRTC connection flow
 *
 * @pattern Controller/Orchestrator
 * @purpose Coordinates WebRTC, Signaling, and QR services with state management
 */

import WebRTCService from '../services/WebRTCService.js';
import SignalingService from '../services/SignalingService.js';
import QRCodeService from '../services/QRCodeService.js';
import MediaService from '../services/MediaService.js';
import store from '../store/index.js';
import { PEER_ROLES, LOADING_MESSAGES, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../config/constants.js';
import { CONFIG } from '../config/webrtc.js';
import { delay } from '../lib/helpers.js';
import logger from '../lib/Logger.js';

export default class ConnectionController {
  constructor() {
    this.webrtc = new WebRTCService();
    this.signaling = new SignalingService();
    this.qrCode = new QRCodeService();
    this.media = new MediaService();

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for WebRTC service
   */
  setupEventHandlers() {
    // Data connection established
    this.webrtc.on('data-connection-established', async () => {
      logger.info('Data connection ready, starting media negotiation...');
      await delay(CONFIG.MEDIA_NEGOTIATION_DELAY);
      await this.startMediaNegotiation();
    });

    // Data channel opened
    this.webrtc.on('datachannel-open', () => {
      logger.info('DataChannel is open and ready');
    });

    // Media offer received (responder)
    this.webrtc.on('media-offer-received', async ({ offerData }) => {
      const localStream = store.state.localStream;
      if (localStream) {
        await this.webrtc.processMediaOffer(offerData, localStream);
      }
    });

    // Media connection established
    this.webrtc.on('media-connection-established', () => {
      logger.info('Media connection established');
    });

    // Remote track received
    this.webrtc.on('remote-track', ({ streams }) => {
      logger.info('Remote stream received');
      store.commit('setRemoteStream', streams[0]);
      store.dispatch('connectEstablished');
    });

    // Connection failed
    this.webrtc.on('connection-failed', () => {
      store.dispatch('connectionFailed', ERROR_MESSAGES.CONNECTION_FAILED);
    });
  }

  /**
   * Initialize camera and check for offer in URL
   */
  async init() {
    try {
      // Get camera/microphone
      const stream = await this.media.getUserMedia();
      store.commit('setLocalStream', stream);

      // Check if there's an offer in URL hash
      if (this.signaling.hasOfferInHash()) {
        await this.handleOfferFromHash();
      } else {
        // Ready to share or paste offer
        store.commit('setButtonState', 'initial');
        logger.info('⏸️ Ready - waiting for user action');
      }
    } catch (error) {
      logger.error('Initialization failed:', error);
      store.commit('setError', error.message);
      throw error;
    }
  }

  /**
   * Start as initiator: create peer connection and offer
   */
  async startAsInitiator() {
    if (store.state.isProcessing) return;

    try {
      store.commit('setProcessing', true);
      store.commit('setLoading', true);
      logger.info('👤 Starting as initiator...');

      // Set role and create data connection
      this.webrtc.setRole(PEER_ROLES.INITIATOR);
      store.commit('setRole', PEER_ROLES.INITIATOR);

      await this.webrtc.createDataConnection();

      // Create offer
      const offerDescription = await this.webrtc.createOffer();

      // Create shareable URL
      const offerUrl = this.signaling.createOfferUrl(offerDescription);
      store.commit('setOfferUrl', offerUrl);

      // Update UI state
      await store.dispatch('startAsInitiator');

      store.commit('setLoading', false);
      logger.info('✅ Offer created and ready to share');
    } catch (error) {
      logger.error('Failed to start as initiator:', error);
      store.commit('setError', error.message);
      store.commit('setProcessing', false);
      store.commit('setLoading', false);
      throw error;
    }
  }

  /**
   * Handle offer from URL hash (responder flow)
   */
  async handleOfferFromHash() {
    try {
      store.commit('setProcessing', true);
      store.commit('setLoading', true);
      logger.info('📥 Processing offer from URL...');

      // Parse offer from hash
      const offerData = this.signaling.getOfferFromHash();
      if (!offerData) {
        throw new Error(ERROR_MESSAGES.INVALID_OFFER);
      }

      // Become responder
      this.webrtc.setRole(PEER_ROLES.RESPONDER);
      store.commit('setRole', PEER_ROLES.RESPONDER);

      await this.webrtc.createDataConnection();

      // Create answer
      const answerDescription = await this.webrtc.createAnswer({
        type: 'offer',
        sdp: offerData.sdp,
      });

      // Create answer code
      const answerCode = this.signaling.createAnswerCode(answerDescription);
      store.commit('setAnswerCode', answerCode);

      // Update UI state
      await store.dispatch('becomeResponder');

      store.commit('setLoading', false);
      logger.info('✅ Answer ready to share');
    } catch (error) {
      logger.error('Failed to process offer:', error);
      store.commit('setError', error.message);
      store.commit('setProcessing', false);
      store.commit('setLoading', false);
      throw error;
    }
  }

  /**
   * Process answer code from initiator
   */
  async processAnswer(answerCode) {
    if (store.state.isProcessing) return;

    try {
      store.commit('setProcessing', true);
      store.commit('setLoading', true);
      logger.info('📥 Processing answer...');

      const answerData = this.signaling.parseAnswer(answerCode);

      await this.webrtc.setRemoteAnswer({
        type: 'answer',
        sdp: answerData.sdp,
      });

      logger.info('✅ Answer processed, waiting for connection...');
    } catch (error) {
      logger.error('Failed to process answer:', error);
      store.commit('setError', error.message);
      store.commit('setProcessing', false);
      store.commit('setLoading', false);
      throw error;
    }
  }

  /**
   * Start media negotiation after data channel is established
   */
  async startMediaNegotiation() {
    const localStream = store.state.localStream;
    if (!localStream) {
      logger.warn('No local stream available for media negotiation');
      return;
    }

    await this.webrtc.startMediaNegotiation(localStream);
  }

  /**
   * Share offer URL
   */
  async shareOfferUrl() {
    const url = store.state.offerUrl;
    if (!url) {
      throw new Error(ERROR_MESSAGES.NO_OFFER_URL);
    }

    const success = await this.signaling.shareOfferUrl(url);
    if (success) {
      await store.dispatch('waitForAnswer');
      return SUCCESS_MESSAGES.OFFER_SHARED;
    }
    throw new Error('Failed to share offer');
  }

  /**
   * Share answer code
   */
  async shareAnswerCode() {
    const code = store.state.answerCode;
    if (!code) {
      throw new Error(ERROR_MESSAGES.NO_ANSWER_CODE);
    }

    const success = await this.signaling.shareAnswerCode(code);
    if (success) {
      return SUCCESS_MESSAGES.ANSWER_SHARED;
    }
    throw new Error('Failed to share answer');
  }

  /**
   * Generate and share QR code for offer
   */
  async shareOfferQR() {
    const url = store.state.offerUrl;
    if (!url) {
      throw new Error(ERROR_MESSAGES.NO_OFFER_URL);
    }

    try {
      await this.qrCode.shareQRDirect(url, 'offer-qr.png');
      await store.dispatch('waitForAnswer');
      return SUCCESS_MESSAGES.QR_SHARED;
    } catch (error) {
      // Fallback: user can show QR in modal
      logger.warn('Direct QR share failed, user should use "Show QR" button');
      throw error;
    }
  }

  /**
   * Generate and share QR code for answer
   */
  async shareAnswerQR() {
    const code = store.state.answerCode;
    if (!code) {
      throw new Error(ERROR_MESSAGES.NO_ANSWER_CODE);
    }

    try {
      await this.qrCode.shareQRDirect(code, 'answer-qr.png');
      return SUCCESS_MESSAGES.QR_SHARED;
    } catch (error) {
      // Fallback: user can show QR in modal
      logger.warn('Direct QR share failed, user should use "Show QR" button');
      throw error;
    }
  }

  /**
   * Generate QR code for modal display
   */
  async generateQRForModal() {
    // Determine what data to encode
    const answerCode = store.state.answerCode;
    const offerUrl = store.state.offerUrl;

    const data = answerCode || offerUrl;
    if (!data) {
      throw new Error('No data available for QR code');
    }

    const canvas = await this.qrCode.generateQRCode(data);
    this.qrCode.setCurrentQRData(canvas);
    return canvas;
  }

  /**
   * Process QR code from image
   */
  async processQRCode(blob, context) {
    try {
      const result = await this.qrCode.decodeQRFromBlob(blob, context);

      if (context === 'offer') {
        // Process as offer
        logger.info('Processing offer from QR code');

        // Set hash and handle offer
        this.signaling.setHashFromOffer(result.data);
        await this.handleOfferFromHash();

        return SUCCESS_MESSAGES.OFFER_RECEIVED;
      } else if (context === 'answer') {
        // Process as answer
        logger.info('Processing answer from QR code');
        await this.processAnswer(result.data);

        return SUCCESS_MESSAGES.ANSWER_RECEIVED;
      }
    } catch (error) {
      logger.error('Failed to process QR code:', error);
      throw error;
    }
  }

  /**
   * Reset connection and return to initial state
   */
  async reset() {
    logger.info('Resetting to initial state...');

    // Cleanup WebRTC connections
    this.webrtc.cleanup();

    // Clear remote stream
    const remoteStream = store.state.remoteStream;
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }

    // Clear URL hash
    this.signaling.clearHash();

    // Reset state
    await store.dispatch('resetToInitial');

    logger.info('✅ Reset complete');
  }

  /**
   * Close connection and reload page
   */
  closeConnection() {
    this.webrtc.cleanup();

    // Stop all media
    this.media.stopAllTracks();

    // Reload page
    this.signaling.clearHash();
    location.reload();
  }

  /**
   * Get media service for external use
   */
  getMediaService() {
    return this.media;
  }

  /**
   * Get QR service for external use
   */
  getQRService() {
    return this.qrCode;
  }
}
