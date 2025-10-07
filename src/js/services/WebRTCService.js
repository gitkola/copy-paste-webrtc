/**
 * WebRTCService - Manages WebRTC peer connections
 *
 * @pattern Service Layer
 * @purpose Handles dual peer connections (data + media) with hybrid ICE gathering
 * @note Uses two-stage connection: data channel first, then media connection
 */

import EventEmitter from '../lib/EventEmitter.js';
import { getRTCConfiguration, CONFIG } from '../config/webrtc.js';
import { PEER_ROLES } from '../config/constants.js';
import logger from '../lib/Logger.js';

export default class WebRTCService extends EventEmitter {
  constructor() {
    super();
    this.pc = null;           // Data channel peer connection
    this.mediaPc = null;      // Media peer connection
    this.dataChannel = null;
    this.role = null;
    this.connectionEstablished = false;
  }

  /**
   * Set peer role
   * @param {string} role - 'initiator' or 'responder'
   */
  setRole(role) {
    this.role = role;
    logger.info(`Role set: ${role}`);
  }

  /**
   * Get current role
   * @returns {string|null}
   */
  getRole() {
    return this.role;
  }

  /**
   * Create data channel peer connection
   * @param {MediaStream} localStream - Local media stream to add
   * @returns {Promise<void>}
   */
  async createDataConnection(localStream = null) {
    logger.info('Creating data channel peer connection...');

    this.pc = new RTCPeerConnection(getRTCConfiguration());

    // Setup ICE candidate handler
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        logger.debug('ICE candidate generated (data PC)', { type: event.candidate.type });
      } else {
        logger.info('✅ ICE gathering complete (data PC)');
        this.emit('ice-gathering-complete', { type: 'data' });
      }
    };

    // ICE connection state monitoring
    this.pc.oniceconnectionstatechange = () => {
      logger.debug(`ICE state (data): ${this.pc.iceConnectionState}`);
      this.emit('ice-state-change', {
        type: 'data',
        state: this.pc.iceConnectionState,
      });

      if (
        this.pc.iceConnectionState === 'failed' ||
        this.pc.iceConnectionState === 'closed'
      ) {
        logger.error('ICE connection failed or closed');
        this.emit('connection-failed');
      }
    };

    // Connection state monitoring
    this.pc.onconnectionstatechange = () => {
      logger.debug(`Connection state (data): ${this.pc.connectionState}`);
      this.emit('connection-state-change', {
        type: 'data',
        state: this.pc.connectionState,
      });

      if (
        this.pc.connectionState === 'connected' &&
        !this.connectionEstablished
      ) {
        this.connectionEstablished = true;
        logger.info('Data connection established');
        this.emit('data-connection-established');
      }
    };

    // Create or receive data channel
    if (this.role === PEER_ROLES.INITIATOR) {
      this.dataChannel = this.pc.createDataChannel('media', { ordered: true });
      this.setupDataChannel(this.dataChannel);
      logger.info('Data channel created as initiator');
    }

    this.pc.ondatachannel = (event) => {
      logger.info('Data channel received as responder');
      this.dataChannel = event.channel;
      this.setupDataChannel(this.dataChannel);
    };
  }

  /**
   * Setup data channel event handlers
   * @private
   * @param {RTCDataChannel} channel - Data channel to setup
   */
  setupDataChannel(channel) {
    channel.onopen = () => {
      logger.info('DataChannel opened');
      this.emit('datachannel-open');
    };

    channel.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        logger.debug('DataChannel message received', { type: data.type });

        if (data.type === 'media-offer') {
          await this.handleMediaOffer(data);
        } else if (data.type === 'media-answer') {
          await this.handleMediaAnswer(data);
        } else if (data.type === 'ice-candidate') {
          await this.handleRemoteICECandidate(data);
        }
      } catch (error) {
        logger.error('Failed to handle data channel message:', error);
      }
    };

    channel.onerror = (error) => {
      logger.error('DataChannel error:', error);
    };

    channel.onclose = () => {
      logger.info('DataChannel closed');
      this.emit('datachannel-close');
    };
  }

  /**
   * Create WebRTC offer (for data connection)
   * @returns {Promise<RTCSessionDescriptionInit>} Offer with ICE candidates
   */
  async createOffer() {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    logger.info('Creating offer...');

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Wait for ICE candidates to be embedded in SDP
    await this.waitForICECandidates(this.pc);

    logger.info('Offer created with embedded ICE candidates');

    return this.pc.localDescription;
  }

  /**
   * Create WebRTC answer (for data connection)
   * @param {RTCSessionDescriptionInit} offer - Remote offer
   * @returns {Promise<RTCSessionDescriptionInit>} Answer with ICE candidates
   */
  async createAnswer(offer) {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    logger.info('Processing offer and creating answer...');

    await this.pc.setRemoteDescription(offer);

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    // Wait for ICE candidates to be embedded in SDP
    await this.waitForICECandidates(this.pc);

    logger.info('Answer created with embedded ICE candidates');

    return this.pc.localDescription;
  }

  /**
   * Set remote answer (complete data connection)
   * @param {RTCSessionDescriptionInit} answer - Remote answer
   * @returns {Promise<void>}
   */
  async setRemoteAnswer(answer) {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    logger.info('Setting remote answer...');
    await this.pc.setRemoteDescription(answer);
    logger.info('Remote answer set');
  }

  /**
   * Wait for ICE gathering to complete
   * @private
   * @param {RTCPeerConnection} pc - Peer connection to monitor
   * @returns {Promise<void>}
   */
  waitForICECandidates(pc) {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        logger.debug('ICE gathering already complete');
        resolve();
        return;
      }

      let timeout;
      const onStateChange = () => {
        logger.debug(`ICE gathering state: ${pc.iceGatheringState}`);
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', onStateChange);
          clearTimeout(timeout);
          logger.info('✅ ICE gathering complete');
          resolve();
        }
      };

      pc.addEventListener('icegatheringstatechange', onStateChange);

      // Timeout fallback - proceed even if incomplete
      timeout = setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', onStateChange);
        logger.warn('⏱️ ICE gathering timeout - proceeding with available candidates');
        resolve();
      }, CONFIG.ICE_GATHERING_TIMEOUT);
    });
  }

  /**
   * Start media negotiation (after data channel is established)
   * @param {MediaStream} localStream - Local media stream
   * @returns {Promise<void>}
   */
  async startMediaNegotiation(localStream) {
    logger.info(`Starting media negotiation (role: ${this.role})`);

    if (this.role === PEER_ROLES.INITIATOR) {
      await this.sendMediaOffer(localStream);
    }
  }

  /**
   * Create media peer connection
   * @private
   * @param {MediaStream} localStream - Local stream to add
   * @returns {RTCPeerConnection}
   */
  createMediaPeerConnection(localStream) {
    const mediaPc = new RTCPeerConnection(getRTCConfiguration());

    // Trickle ICE: Send candidates via data channel
    mediaPc.onicecandidate = (event) => {
      if (event.candidate) {
        logger.debug('ICE candidate generated (media PC)', { type: event.candidate.type });
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          this.dataChannel.send(
            JSON.stringify({
              type: 'ice-candidate',
              candidate: event.candidate.toJSON(),
            })
          );
          logger.debug('📤 Sent ICE candidate to peer');
        }
      } else {
        logger.info('✅ ICE gathering complete (media PC)');
      }
    };

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        mediaPc.addTrack(track, localStream);
        logger.debug(`Added ${track.kind} track to media PC`);
      });
    }

    // Handle remote tracks
    mediaPc.ontrack = (event) => {
      logger.info('Remote track received', { kind: event.track.kind });
      this.emit('remote-track', {
        track: event.track,
        streams: event.streams,
      });
    };

    return mediaPc;
  }

  /**
   * Send media offer via data channel
   * @private
   * @param {MediaStream} localStream - Local stream
   * @returns {Promise<void>}
   */
  async sendMediaOffer(localStream) {
    this.mediaPc = this.createMediaPeerConnection(localStream);

    const offer = await this.mediaPc.createOffer();
    await this.mediaPc.setLocalDescription(offer);

    // Trickle ICE: Send offer immediately without waiting
    const mediaOffer = {
      type: 'media-offer',
      sdp: this.mediaPc.localDescription.sdp,
    };

    this.dataChannel.send(JSON.stringify(mediaOffer));
    logger.info('📤 Media offer sent (Trickle ICE)');
  }

  /**
   * Handle incoming media offer
   * @private
   * @param {Object} data - Media offer data
   * @returns {Promise<void>}
   */
  async handleMediaOffer(data) {
    logger.info('📥 Media offer received');

    // Get local stream from wherever it's stored (passed via event)
    this.emit('media-offer-received', { offerData: data });
  }

  /**
   * Process media offer and send answer
   * @param {Object} offerData - Media offer data
   * @param {MediaStream} localStream - Local stream
   * @returns {Promise<void>}
   */
  async processMediaOffer(offerData, localStream) {
    this.mediaPc = this.createMediaPeerConnection(localStream);

    await this.mediaPc.setRemoteDescription({
      type: 'offer',
      sdp: offerData.sdp,
    });

    const answer = await this.mediaPc.createAnswer();
    await this.mediaPc.setLocalDescription(answer);

    // Trickle ICE: Send answer immediately
    const mediaAnswer = {
      type: 'media-answer',
      sdp: this.mediaPc.localDescription.sdp,
    };

    this.dataChannel.send(JSON.stringify(mediaAnswer));
    logger.info('📤 Media answer sent (Trickle ICE)');
  }

  /**
   * Handle incoming media answer
   * @private
   * @param {Object} data - Media answer data
   * @returns {Promise<void>}
   */
  async handleMediaAnswer(data) {
    logger.info('📥 Media answer received');

    await this.mediaPc.setRemoteDescription({
      type: 'answer',
      sdp: data.sdp,
    });

    logger.info('Media connection established');
    this.emit('media-connection-established');
  }

  /**
   * Handle remote ICE candidate (for media connection)
   * @private
   * @param {Object} data - ICE candidate data
   * @returns {Promise<void>}
   */
  async handleRemoteICECandidate(data) {
    if (this.mediaPc && data.candidate) {
      try {
        await this.mediaPc.addIceCandidate(new RTCIceCandidate(data.candidate));
        logger.debug('🧊 Added remote ICE candidate (media PC)');
      } catch (error) {
        logger.error('Failed to add ICE candidate:', error);
      }
    }
  }

  /**
   * Clean up all peer connections
   */
  cleanup() {
    logger.info('Cleaning up peer connections...');

    if (this.pc) {
      this.pc.close();
      this.pc = null;
      logger.debug('Data PC closed');
    }

    if (this.mediaPc) {
      this.mediaPc.close();
      this.mediaPc = null;
      logger.debug('Media PC closed');
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
      logger.debug('Data channel closed');
    }

    this.connectionEstablished = false;
    this.removeAllListeners();

    logger.info('✅ Cleanup complete');
  }

  /**
   * Check if connection is established
   * @returns {boolean}
   */
  isConnected() {
    return this.connectionEstablished;
  }
}
