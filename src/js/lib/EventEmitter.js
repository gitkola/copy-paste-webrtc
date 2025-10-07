/**
 * EventEmitter - Observer pattern implementation for component-level events
 *
 * @pattern Observer
 * @purpose Decoupled event-driven communication within services
 * @usage Extend this class for services that emit events (WebRTCService, MediaService)
 */
export default class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Event identifier
   * @param {Function} callback - Event handler
   * @returns {EventEmitter} this for chaining
   */
  on(eventName, callback) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    this.events.get(eventName).push(callback);
    return this;
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first trigger)
   * @param {string} eventName - Event identifier
   * @param {Function} callback - Event handler
   * @returns {EventEmitter} this for chaining
   */
  once(eventName, callback) {
    const wrapper = (...args) => {
      callback(...args);
      this.off(eventName, wrapper);
    };
    return this.on(eventName, wrapper);
  }

  /**
   * Emit an event with data
   * @param {string} eventName - Event identifier
   * @param {...any} args - Arguments to pass to handlers
   * @returns {boolean} true if event had listeners
   */
  emit(eventName, ...args) {
    if (!this.events.has(eventName)) return false;

    this.events.get(eventName).forEach(callback => {
      try {
        callback.apply(this, args);
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error);
      }
    });

    return true;
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Event identifier
   * @param {Function} callback - Specific handler to remove
   */
  off(eventName, callback) {
    if (!this.events.has(eventName)) return;

    const callbacks = this.events.get(eventName);
    const index = callbacks.indexOf(callback);

    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Remove all listeners for event(s)
   * @param {string} [eventName] - Specific event or all if omitted
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
  }
}
