/**
 * State actions (asynchronous)
 * Can commit multiple mutations and perform async operations
 */

import { BUTTON_STATES, PEER_ROLES, CONNECTION_STATES } from '../config/constants.js';

export default {
  /**
   * Initialize as initiator and create offer
   */
  async startAsInitiator({ commit, dispatch }) {
    commit('setRole', PEER_ROLES.INITIATOR);
    commit('setButtonState', BUTTON_STATES.INITIATOR_SHARE);
    // Actual WebRTC logic handled by controllers
  },

  /**
   * Transition to waiting for answer
   */
  async waitForAnswer({ commit }) {
    commit('setButtonState', BUTTON_STATES.INITIATOR_WAIT_ANSWER);
    commit('setQRPasteContext', 'answer');
  },

  /**
   * Process received offer and become responder
   */
  async becomeResponder({ commit }) {
    commit('setRole', PEER_ROLES.RESPONDER);
    commit('setButtonState', BUTTON_STATES.RESPONDER_SHARE);
  },

  /**
   * Mark connection as established
   */
  async connectEstablished({ commit }) {
    commit('setConnectionState', CONNECTION_STATES.CONNECTED);
    commit('setButtonState', BUTTON_STATES.CONNECTED);
    commit('setProcessing', false);
    commit('setLoading', false);
  },

  /**
   * Handle connection failure
   */
  async connectionFailed({ commit }, error) {
    commit('setConnectionState', CONNECTION_STATES.FAILED);
    commit('setError', error);
    commit('setProcessing', false);
    commit('setLoading', false);
  },

  /**
   * Reset to initial state
   */
  async resetToInitial({ commit }) {
    commit('reset');
  },

  /**
   * Toggle video layout mode
   */
  async toggleVideoMode({ commit, state }) {
    const modes = ['split', 'local-full', 'remote-full'];
    const currentIndex = modes.indexOf(state.videoMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    commit('setVideoMode', modes[nextIndex]);
  },
};
