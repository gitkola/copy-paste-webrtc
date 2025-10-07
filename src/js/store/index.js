/**
 * Store instance - Singleton
 * Central state management for the application
 */

import Store from './Store.js';
import state from './state.js';
import mutations from './mutations.js';
import actions from './actions.js';

const store = new Store({
  state,
  mutations,
  actions,
});

export default store;
