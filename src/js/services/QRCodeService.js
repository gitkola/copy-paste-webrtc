/**
 * QRCodeService - QR code generation and decoding
 *
 * @pattern Service Layer
 * @purpose Handles QR code creation with adaptive error correction and multi-decoder scanning
 * @dependencies qrcode.js (generation), ZXing + jsQR (decoding)
 */

import { CONFIG } from '../config/webrtc.js';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  QR_CONTEXTS,
} from '../config/constants.js';
import { QRCode } from '../lib/qrcode.js';
import { blobToDataURL, getOptimalQRErrorCorrection } from '../lib/helpers.js';
import logger from '../lib/Logger.js';

export default class QRCodeService {
  constructor() {
    this.currentQRData = null;
  }

  /**
   * Generate QR code as canvas element
   * @param {string} data - Data to encode
   * @returns {Promise<HTMLCanvasElement>} Canvas with QR code
   */
  async generateQRCode(data) {
    if (typeof QRCode === 'undefined') {
      throw new Error(ERROR_MESSAGES.QR_LIBRARY_NOT_LOADED);
    }

    const errorCorrection = getOptimalQRErrorCorrection(data);
    logger.info(
      `Generating QR code (${data.length} chars, EC: ${errorCorrection})`
    );

    const canvas = document.createElement('canvas');

    return new Promise((resolve, reject) => {
      QRCode.toCanvas(
        canvas,
        data,
        {
          errorCorrectionLevel: errorCorrection,
          width: CONFIG.QR_SIZE,
          margin: CONFIG.QR_MARGIN,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        },
        (error) => {
          if (error) {
            logger.error('QR generation failed:', error);
            reject(error);
          } else {
            logger.info('QR code generated successfully');
            resolve(canvas);
          }
        }
      );
    });
  }

  /**
   * Generate QR code and convert to blob
   * @param {string} data - Data to encode
   * @returns {Promise<Blob>} QR code image blob
   */
  async generateQRBlob(data) {
    const canvas = await this.generateQRCode(data);

    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1.0);
    });
  }

  /**
   * Share QR code directly (one-click workflow)
   * @param {string} data - Data to encode in QR
   * @param {string} filename - Filename for shared image
   * @returns {Promise<boolean>} Success status
   */
  async shareQRDirect(data, filename = 'webrtc-qr.png') {
    try {
      const blob = await this.generateQRBlob(data);
      const file = new File([blob], filename, { type: 'image/png' });

      logger.info('Attempting to share QR code...');

      // Try native Share API with files
      if (navigator.share && navigator.canShare) {
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'WebRTC Connection QR Code',
          });
          logger.info('QR shared via Share API');
          return true;
        }
      }

      // Fallback to clipboard
      logger.info('Falling back to clipboard...');
      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        logger.info('QR copied to clipboard');
        return true;
      }

      logger.warn('Neither Share API nor clipboard available');
      return false;
    } catch (error) {
      logger.error('Failed to share QR code:', error);
      throw error;
    }
  }

  /**
   * Download QR code as PNG file
   * @param {HTMLCanvasElement} canvas - Canvas with QR code
   * @param {string} filename - Download filename
   */
  downloadQRCode(canvas, filename = 'webrtc-connection.png') {
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    logger.info('QR code downloaded');
  }

  /**
   * Decode QR code from image blob
   * @param {Blob} blob - Image blob containing QR code
   * @param {string} expectedContext - 'offer' or 'answer'
   * @returns {Promise<Object>} Decoded data with validation
   */
  async decodeQRFromBlob(blob, expectedContext = QR_CONTEXTS.OFFER) {
    logger.info(`Decoding QR code (expecting ${expectedContext})`);

    const imageDataURL = await blobToDataURL(blob);
    const decoded = await this.decodeQRFromImage(imageDataURL);

    if (!decoded) {
      throw new Error(ERROR_MESSAGES.INVALID_QR);
    }

    // Validate decoded data based on context
    return this.validateDecodedQR(decoded, expectedContext);
  }

  /**
   * Decode QR code from image data URL
   * @private
   * @param {string} imageDataURL - Image as data URL
   * @returns {Promise<string|null>} Decoded text or null
   */
  async decodeQRFromImage(imageDataURL) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        canvas.width = img.width;
        canvas.height = img.height;

        // Fill with white background first (in case of transparency)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image on top
        ctx.drawImage(img, 0, 0);

        // Try ZXing first (more powerful for dense QR codes)
        if (typeof ZXing !== 'undefined') {
          try {
            logger.debug('Trying ZXing decoder...');
            const codeReader = new ZXing.BrowserQRCodeReader();
            const result = await codeReader.decodeFromImageElement(img);

            if (result && result.text) {
              logger.info('✅ QR decoded with ZXing', {
                length: result.text.length,
              });
              resolve(result.text);
              return;
            }
          } catch (err) {
            logger.debug('ZXing failed, trying jsQR...');
          }
        }

        // Fallback to jsQR with multiple scales
        if (typeof jsQR !== 'undefined') {
          logger.debug('Trying jsQR decoder...');

          const targetSizes = [
            img.width, // Original size
            800, // Standard QR size
            1200, // Large QR
            600, // Small QR
            400, // Very small
          ];

          for (const targetSize of targetSizes) {
            const scale = targetSize / Math.max(img.width, img.height);
            canvas.width = Math.floor(img.width * scale);
            canvas.height = Math.floor(img.height * scale);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );

            const code = jsQR(
              imageData.data,
              imageData.width,
              imageData.height,
              {
                inversionAttempts: 'attemptBoth',
              }
            );

            if (code) {
              logger.info('✅ QR decoded with jsQR', {
                size: `${canvas.width}x${canvas.height}`,
                length: code.data.length,
              });
              resolve(code.data);
              return;
            }
          }
        }

        logger.warn('❌ No QR code found with any decoder');
        resolve(null);
      };

      img.onerror = (err) => {
        logger.error('Image load error:', err);
        resolve(null);
      };

      img.src = imageDataURL;
    });
  }

  /**
   * Validate decoded QR data based on expected context
   * @private
   * @param {string} decoded - Decoded QR text
   * @param {string} expectedContext - 'offer' or 'answer'
   * @returns {Object} Validated data
   * @throws {Error} If validation fails
   */
  validateDecodedQR(decoded, expectedContext) {
    logger.debug(`Validating QR as ${expectedContext}`, {
      startsWithHttp: decoded.startsWith('http'),
      length: decoded.length,
    });

    if (expectedContext === QR_CONTEXTS.OFFER) {
      // Expecting an offer QR code (URL with hash)
      if (decoded.startsWith('http')) {
        try {
          const url = new URL(decoded);
          if (url.hash) {
            const offerData = url.hash.slice(1);
            logger.info('✅ Valid offer URL');
            return { type: 'offer', data: offerData, raw: decoded };
          }
        } catch (e) {
          logger.error('Invalid offer URL:', e);
        }
      } else {
        // Try to decode as base64 offer data directly
        try {
          const data = JSON.parse(atob(decoded));
          if (data.type === 'offer') {
            logger.info('✅ Valid base64 offer data');
            return { type: 'offer', data: decoded, raw: decoded };
          }
        } catch (e) {
          // Not valid
        }
      }
      throw new Error(ERROR_MESSAGES.QR_WRONG_TYPE_OFFER);
    } else if (expectedContext === QR_CONTEXTS.ANSWER) {
      // Expecting an answer QR code (base64 encoded answer)
      if (decoded.startsWith('http')) {
        throw new Error(ERROR_MESSAGES.QR_WRONG_TYPE_ANSWER);
      }

      try {
        const data = JSON.parse(atob(decoded));
        if (data.type === 'answer') {
          logger.info('✅ Valid answer data');
          return { type: 'answer', data: decoded, raw: decoded };
        }
      } catch (e) {
        // Not valid
      }
      throw new Error(ERROR_MESSAGES.QR_WRONG_TYPE_OFFER);
    }

    throw new Error(ERROR_MESSAGES.INVALID_QR);
  }

  /**
   * Set current QR data for modal display
   * @param {any} data - QR data to store
   */
  setCurrentQRData(data) {
    this.currentQRData = data;
  }

  /**
   * Get current QR data
   * @returns {any}
   */
  getCurrentQRData() {
    return this.currentQRData;
  }
}
