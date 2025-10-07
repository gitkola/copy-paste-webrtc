/**
 * SignalingService - Manual signaling via copy-paste/QR codes
 *
 * @pattern Service Layer
 * @purpose Handles manual signaling without traditional signaling server
 * @note Unique to this app - uses URL hash and base64 encoding for P2P signaling
 */

import { encodeToBase64, decodeFromBase64, extractHashFromUrl, isValidUrl, isValidSignalData } from '../lib/helpers.js';
import { ERROR_MESSAGES } from '../config/constants.js';
import logger from '../lib/Logger.js';

export default class SignalingService {
  constructor() {
    this.offerUrl = null;
    this.answerCode = null;
  }

  /**
   * Create offer URL from SDP offer
   * @param {RTCSessionDescriptionInit} offerDescription - WebRTC offer
   * @returns {string} Shareable URL with encoded offer in hash
   */
  createOfferUrl(offerDescription) {
    const offerData = {
      type: 'offer',
      sdp: offerDescription.sdp,
    };

    const encoded = encodeToBase64(offerData);
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;

    this.offerUrl = url;
    logger.info('Offer URL created', { length: url.length });

    return url;
  }

  /**
   * Create answer code from SDP answer
   * @param {RTCSessionDescriptionInit} answerDescription - WebRTC answer
   * @returns {string} Base64 encoded answer
   */
  createAnswerCode(answerDescription) {
    const answerData = {
      type: 'answer',
      sdp: answerDescription.sdp,
    };

    const encoded = encodeToBase64(answerData);

    this.answerCode = encoded;
    logger.info('Answer code created', { length: encoded.length });

    return encoded;
  }

  /**
   * Parse offer from URL or hash string
   * @param {string} input - Full URL or hash string
   * @returns {Object} Decoded offer data
   * @throws {Error} If invalid offer
   */
  parseOffer(input) {
    let hashData;

    // Check if input is a URL or just hash data
    if (isValidUrl(input)) {
      hashData = extractHashFromUrl(input);
      if (!hashData) {
        throw new Error(ERROR_MESSAGES.INVALID_OFFER);
      }
    } else {
      hashData = input;
    }

    try {
      const data = decodeFromBase64(hashData);

      if (!isValidSignalData(data, 'offer')) {
        throw new Error(ERROR_MESSAGES.INVALID_OFFER);
      }

      logger.info('Offer parsed successfully');
      return data;
    } catch (error) {
      logger.error('Failed to parse offer:', error);
      throw new Error(ERROR_MESSAGES.INVALID_OFFER);
    }
  }

  /**
   * Parse answer from base64 string
   * @param {string} encoded - Base64 encoded answer
   * @returns {Object} Decoded answer data
   * @throws {Error} If invalid answer
   */
  parseAnswer(encoded) {
    try {
      const data = decodeFromBase64(encoded);

      if (!isValidSignalData(data, 'answer')) {
        throw new Error(ERROR_MESSAGES.INVALID_ANSWER);
      }

      logger.info('Answer parsed successfully');
      return data;
    } catch (error) {
      logger.error('Failed to parse answer:', error);
      throw new Error(ERROR_MESSAGES.INVALID_ANSWER);
    }
  }

  /**
   * Check if current page has offer in URL hash
   * @returns {boolean}
   */
  hasOfferInHash() {
    return location.hash.length > 1;
  }

  /**
   * Get offer from current URL hash
   * @returns {Object|null} Decoded offer or null
   */
  getOfferFromHash() {
    if (!this.hasOfferInHash()) {
      return null;
    }

    const hashData = location.hash.slice(1);

    try {
      return this.parseOffer(hashData);
    } catch (error) {
      logger.warn('Invalid offer in URL hash');
      return null;
    }
  }

  /**
   * Clear URL hash
   */
  clearHash() {
    if (location.hash) {
      history.replaceState(null, '', location.pathname);
      logger.debug('URL hash cleared');
    }
  }

  /**
   * Set URL hash with offer data
   * @param {string} offerData - Base64 encoded offer
   */
  setHashFromOffer(offerData) {
    history.replaceState(null, '', `#${offerData}`);
    logger.debug('URL hash set with offer');
  }

  /**
   * Get stored offer URL
   * @returns {string|null}
   */
  getOfferUrl() {
    return this.offerUrl;
  }

  /**
   * Get stored answer code
   * @returns {string|null}
   */
  getAnswerCode() {
    return this.answerCode;
  }

  /**
   * Share offer via native Share API or clipboard
   * @param {string} url - Offer URL to share
   * @returns {Promise<boolean>} Success status
   */
  async shareOfferUrl(url) {
    // Try native Share API first
    if (navigator.share) {
      try {
        await navigator.share({ url });
        logger.info('Offer shared via Share API');
        return true;
      } catch (err) {
        if (err.name !== 'AbortError') {
          logger.warn('Share API failed:', err);
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url);
      logger.info('Offer copied to clipboard');
      return true;
    } catch (err) {
      logger.error('Failed to copy to clipboard:', err);
      return false;
    }
  }

  /**
   * Share answer via native Share API or clipboard
   * @param {string} code - Answer code to share
   * @returns {Promise<boolean>} Success status
   */
  async shareAnswerCode(code) {
    // Try native Share API first
    if (navigator.share) {
      try {
        await navigator.share({ text: code });
        logger.info('Answer shared via Share API');
        return true;
      } catch (err) {
        if (err.name !== 'AbortError') {
          logger.warn('Share API failed:', err);
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(code);
      logger.info('Answer copied to clipboard');
      return true;
    } catch (err) {
      logger.error('Failed to copy to clipboard:', err);
      return false;
    }
  }
}
