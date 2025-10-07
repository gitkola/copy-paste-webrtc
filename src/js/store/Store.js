/**
 * Store - Reactive state management with Proxy
 *
 * @pattern State Management (Vuex/Redux inspired)
 * @purpose Centralized, predictable state with reactivity
 */

import logger from '../lib/Logger.js';

export default class Store {
  constructor({ state, mutations, actions }) {
    this.mutations = mutations;
    this.actions = actions;
    this.status = 'resting';
    this.subscribers = [];

    // Create reactive state with Proxy
    this.state = new Proxy(state, {
      set: (target, key, value) => {
        const oldValue = target[key];
        target[key] = value;

        logger.debug(`State change: ${key}`, { old: oldValue, new: value });

        // Notify subscribers
        this.notifySubscribers({ key, value, oldValue });

        // Warn if state mutated outside mutation
        if (this.status !== 'mutation') {
          logger.warn(`Direct state mutation outside mutation: ${key}`);
        }

        this.status = 'resting';
        return true;
      },
    });
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback - Called on state change
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers of state change
   * @private
   */
  notifySubscribers(change) {
    this.subscribers.forEach((callback) => {
      try {
        callback(this.state, change);
      } catch (error) {
        logger.error('Error in state subscriber:', error);
      }
    });
  }

  /**
   * Dispatch an action (async)
   * @param {string} actionKey - Action name
   * @param {any} payload - Action payload
   * @returns {Promise<any>}
   */
  async dispatch(actionKey, payload) {
    if (typeof this.actions[actionKey] !== 'function') {
      throw new Error(`Action "${actionKey}" doesn't exist`);
    }

    logger.debug(`Dispatching action: ${actionKey}`, payload);
    this.status = 'action';

    try {
      return await this.actions[actionKey](this, payload);
    } finally {
      this.status = 'resting';
    }
  }

  /**
   * Commit a mutation (sync)
   * @param {string} mutationKey - Mutation name
   * @param {any} payload - Mutation payload
   * @returns {boolean}
   */
  commit(mutationKey, payload) {
    if (typeof this.mutations[mutationKey] !== 'function') {
      throw new Error(`Mutation "${mutationKey}" doesn't exist`);
    }

    logger.debug(`Committing mutation: ${mutationKey}`, payload);
    this.status = 'mutation';

    this.mutations[mutationKey](this.state, payload);

    return true;
  }
}
