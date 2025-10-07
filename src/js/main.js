/**
 * Main Entry Point
 * Wire up all modules and initialize the application
 *
 * @architecture Dependency Injection via constructor parameters
 * @pattern MVC/Layered Architecture
 */

import ConnectionController from './controllers/ConnectionController.js';
import UIController from './controllers/UIController.js';
import MediaController from './controllers/MediaController.js';
import Toast from './components/Toast.js';
import Controls from './components/Controls.js';
import ButtonManager from './components/ButtonManager.js';
import ModalManager from './components/ModalManager.js';
import VideoGrid from './components/VideoGrid.js';
import SecondaryButtons from './components/SecondaryButtons.js';
import store from './store/index.js';
import logger from './lib/Logger.js';

/**
 * Application class - orchestrates initialization
 */
class App {
  constructor() {
    logger.info('🚀 P2P WebRTC App initializing...');

    // Initialize controllers (business logic layer)
    this.connectionController = new ConnectionController();
    this.uiController = new UIController(this.connectionController);
    this.mediaController = new MediaController();

    // Initialize components (presentation layer)
    this.toast = new Toast(document.getElementById('toast'));
    this.controls = new Controls(this.uiController);
    this.buttonManager = new ButtonManager(this.uiController, this.toast);
    this.modalManager = new ModalManager(this.uiController, this.toast);
    this.videoGrid = new VideoGrid(this.mediaController);
    this.secondaryButtons = new SecondaryButtons(this.modalManager);

    // Wire modal manager to UI controller (for opening modals)
    this.uiController.setModalManager(this.modalManager);

    // Subscribe media controller to state changes
    this.mediaController.subscribeToStateChanges();

    // Global error handler
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled promise rejection:', event.reason);
      this.toast.show('❌ An error occurred');
    });

    window.addEventListener('error', (event) => {
      logger.error('Global error:', event.error);
    });

    logger.info('✅ Application initialized');
  }

  /**
   * Start the application
   */
  async start() {
    try {
      logger.info('Starting application...');

      // Initialize connection (get camera, check for offer in URL)
      await this.connectionController.init();

      logger.info('🎉 Application ready!');
    } catch (error) {
      logger.error('Failed to start application:', error);
      this.toast.show(error.message || '❌ Initialization failed');
    }
  }
}

// Initialize and start app when DOM is ready
window.addEventListener('load', async () => {
  const app = new App();
  await app.start();
});

// Export for debugging in console
window.__DEBUG__ = {
  store,
  logger,
};

logger.info('📦 Modules loaded');
