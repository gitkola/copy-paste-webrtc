/**
 * Logger - Singleton pattern for centralized logging
 *
 * @pattern Singleton (Module pattern)
 * @purpose Consistent logging with levels and formatting
 * @usage import logger from './lib/Logger.js'; logger.info('message');
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class LoggerClass {
  constructor() {
    this.level = LOG_LEVELS.INFO;
    this.enableColors = true;
    this.prefix = '[P2P WebRTC]';
  }

  /**
   * Set logging level
   * @param {keyof typeof LOG_LEVELS} level - Log level name
   */
  setLevel(level) {
    this.level = LOG_LEVELS[level] ?? LOG_LEVELS.INFO;
  }

  /**
   * Internal log method
   * @private
   */
  log(level, message, ...args) {
    if (LOG_LEVELS[level] <= this.level) {
      const timestamp = new Date().toISOString().substring(11, 23);
      const formattedMessage = `${this.prefix} [${timestamp}] ${message}`;
      console[level.toLowerCase()](formattedMessage, ...args);
    }
  }

  error(message, ...args) {
    this.log('ERROR', message, ...args);
  }

  warn(message, ...args) {
    this.log('WARN', message, ...args);
  }

  info(message, ...args) {
    this.log('INFO', message, ...args);
  }

  debug(message, ...args) {
    this.log('DEBUG', message, ...args);
  }
}

// Singleton instance
const logger = new LoggerClass();

export default logger;
