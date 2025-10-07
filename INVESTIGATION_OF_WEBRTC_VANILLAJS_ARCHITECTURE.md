# Архітектура WebRTC відео-чату на Vanilla JS

Побудова масштабованого WebRTC застосунку для 6 учасників без фреймворків вимагає продуманої модульної архітектури з чітким розділенням відповідальності. **Mesh topology підтримує до 6 учасників при 15 унікальних з'єднаннях** (кожен учасник підтримує 5 RTCPeerConnection об'єктів), що потребує пропускної здатності до 7.5 Mbps upload/download при 720p відео та споживає 80-90% CPU на типових ноутбуках. Ключові архітектурні рішення включають event-driven комунікацію через EventEmitter/Pub-Sub паттерни, proxy-based state management для реактивності, та чітке розділення на UI, business logic, state management та network шари. Vanilla JS дозволяє реалізувати SOLID принципи через ES6+ модулі, dependency injection patterns та Web Components, забезпечуючи розширюваність без overhead фреймворків.

Успішна реалізація залежить від правильного управління множинними peer-to-peer з'єднаннями, ефективної сигналізації, та оптимізації медіа-потоків. При 6 учасниках кожен клієнт кодує відео 5 разів і декодує 5 вхідних потоків, що робить критичною адаптивну якість та bandwidth-aware стратегії. Модульна архітектура з незалежними сервісами (WebRTCService, SignalingService, MediaService) дозволяє ізолювати складність WebRTC API і забезпечити тестованість та перевикористання коду.

## Фундаментальна математика mesh topology

**Повна mesh мережа створює n × (n - 1) / 2 унікальних з'єднань** між учасниками. Для 6 учасників це означає 15 фізичних з'єднань у мережі, але кожен клієнт підтримує 30 RTCPeerConnection об'єктів локально (по одному для кожного напрямку зв'язку з кожним peer). Ця топологія накладає серйозні обмеження на ресурси.

Bandwidth вимоги експоненційно зростають: при 500 kbps на потік кожен учасник завантажує 2.5 Mbps (5 потоків × 500 kbps) і вивантажує такий самий обсяг. При якісному 720p відео з 1.5 Mbps це стає **15 Mbps загальної пропускної здатності на учасника**. CPU навантаження ще більш критичне - кожен учасник виконує 5 паралельних video encoding операцій і 5 decoding операцій одночасно, що призводить до 90-100% завантаження CPU на типових ноутбуках.

Chrome дозволяє максимум 500 RTCPeerConnection об'єктів на сторінку, але практичний ліміт для mesh відео-чату - це **4-6 учасників максимум**. За межами цього порогу критично необхідний перехід на SFU (Selective Forwarding Unit) архітектуру, де сервер пересилає потоки без транскодування, дозволяючи масштабування до 100+ учасників.

## Модульна архітектура для WebRTC застосунку

Vanilla JavaScript дозволяє створити повністю модульну систему використовуючи ES6 modules з чітким розділенням відповідальності. Ключовою є організація коду навколо **незалежних, тестованих модулів** з явними залежностями та мінімальним coupling між компонентами.

Dependency injection в Vanilla JS реалізується через конструктори класів і factory patterns. Замість фреймворків використовуються простіші паттерни, де сервіси передаються як параметри:

```javascript
// services/WebRTCService.js
export default class WebRTCService extends EventEmitter {
  constructor(config, signalingService) {
    super();
    this.config = config;
    this.signaling = signalingService;
    this.connections = new Map();
  }

  createPeerConnection(peerId) {
    const pc = new RTCPeerConnection(this.config.iceServers);
    this.connections.set(peerId, pc);
    return pc;
  }
}

// main.js - Manual DI
import WebRTCService from './services/WebRTCService.js';
import SignalingService from './services/SignalingService.js';
import config from './config/webrtc.js';

const signaling = new SignalingService(config.signalingUrl);
const webrtc = new WebRTCService(config, signaling);
```

Factory pattern забезпечує гнучке створення об'єктів з різними конфігураціями:

```javascript
// factories/ConnectionFactory.js
export default class ConnectionFactory {
  constructor(iceServers) {
    this.iceServers = iceServers;
  }

  createConnection(peerId, options = {}) {
    const config = {
      iceServers: this.iceServers,
      ...options,
    };

    return new RTCPeerConnection(config);
  }

  createDataChannel(connection, label, options) {
    return connection.createDataChannel(label, {
      ordered: true,
      maxRetransmits: 3,
      ...options,
    });
  }
}
```

Module pattern забезпечує інкапсуляцію та приватні змінні:

```javascript
// lib/Logger.js
const Logger = (() => {
  let instance;
  const logLevels = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };

  class LoggerClass {
    constructor() {
      if (instance) return instance;
      this.level = logLevels.INFO;
      instance = this;
    }

    setLevel(level) {
      this.level = logLevels[level] || logLevels.INFO;
    }

    log(level, message, ...args) {
      if (logLevels[level] <= this.level) {
        console[level.toLowerCase()](message, ...args);
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
  }

  return new LoggerClass();
})();

export default Logger;
```

## Розділення на архітектурні шари

Чотиришарова архітектура забезпечує чітке розділення відповідальності та дозволяє незалежно тестувати і розвивати кожен компонент системи.

**Presentation Layer (UI)** відповідає виключно за відображення та user interactions. Компоненти не містять business logic, а лише викликають методи контролерів та реагують на зміни state:

```javascript
// components/VideoGrid.js
import Component from '../lib/Component.js';
import store from '../store/index.js';

export default class VideoGrid extends Component {
  constructor(element) {
    super({ store, element });
    this.remoteVideos = new Map();
    this.render();
  }

  render() {
    const { remoteStreams } = store.state;

    // Remove disconnected peers
    this.remoteVideos.forEach((video, peerId) => {
      if (!remoteStreams.has(peerId)) {
        video.remove();
        this.remoteVideos.delete(peerId);
      }
    });

    // Add new peers
    remoteStreams.forEach((stream, peerId) => {
      if (!this.remoteVideos.has(peerId)) {
        this.addVideoElement(peerId, stream);
      }
    });
  }

  addVideoElement(peerId, stream) {
    const video = document.createElement('video');
    video.id = `video-${peerId}`;
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;

    this.element.appendChild(video);
    this.remoteVideos.set(peerId, video);
  }
}
```

**Business Logic Layer** містить контролери, які координують взаємодію між UI, state та services. Це orchestration layer, який реалізує use cases застосунку:

```javascript
// controllers/RoomController.js
import WebRTCService from '../services/WebRTCService.js';
import MediaService from '../services/MediaService.js';
import store from '../store/index.js';

export default class RoomController {
  constructor(roomId) {
    this.roomId = roomId;
    this.webrtc = new WebRTCService();
    this.media = new MediaService();

    this.setupEventHandlers();
  }

  async joinRoom() {
    try {
      // Get local media
      const stream = await this.media.getUserMedia({
        video: { width: 640, height: 480, frameRate: 15 },
        audio: true,
      });

      store.commit('setLocalStream', stream);

      // Connect to signaling
      await this.webrtc.connect(this.roomId);

      // Existing peers will trigger connections
      store.commit('setRoomState', 'connected');
    } catch (error) {
      store.commit('setError', error.message);
    }
  }

  setupEventHandlers() {
    this.webrtc.on('peer-joined', async ({ peerId }) => {
      await this.handlePeerJoined(peerId);
    });

    this.webrtc.on('peer-left', ({ peerId }) => {
      this.handlePeerLeft(peerId);
    });

    this.webrtc.on('remote-track', ({ peerId, stream }) => {
      store.commit('addRemoteStream', { peerId, stream });
    });
  }

  async handlePeerJoined(peerId) {
    const localStream = store.state.localStream;
    if (localStream) {
      await this.webrtc.createConnection(peerId, localStream);
    }
  }

  handlePeerLeft(peerId) {
    store.commit('removeRemoteStream', peerId);
    this.webrtc.closeConnection(peerId);
  }
}
```

**State Management Layer** управляє application state через Proxy-based реактивну систему, інспіровану Vuex/Redux patterns:

```javascript
// store/store.js
import PubSub from '../lib/PubSub.js';

export default class Store {
  constructor({ state, actions, mutations }) {
    this.events = new PubSub();
    this.actions = actions;
    this.mutations = mutations;
    this.status = 'resting';

    // Reactive state with Proxy
    this.state = new Proxy(state, {
      set: (target, key, value) => {
        target[key] = value;

        console.log(`State change: ${key}`);
        this.events.publish('stateChange', this.state);

        if (this.status !== 'mutation') {
          console.warn(`Direct state mutation outside mutation: ${key}`);
        }

        this.status = 'resting';
        return true;
      },
    });
  }

  dispatch(actionKey, payload) {
    if (typeof this.actions[actionKey] !== 'function') {
      throw new Error(`Action "${actionKey}" doesn't exist`);
    }

    this.status = 'action';
    return this.actions[actionKey](this, payload);
  }

  commit(mutationKey, payload) {
    if (typeof this.mutations[mutationKey] !== 'function') {
      throw new Error(`Mutation "${mutationKey}" doesn't exist`);
    }

    this.status = 'mutation';
    const newState = this.mutations[mutationKey](this.state, payload);
    Object.assign(this.state, newState);
    return true;
  }
}
```

**Data/Network Layer** інкапсулює всю взаємодію з WebRTC API та signaling протоколом:

```javascript
// services/SignalingService.js
import EventEmitter from '../lib/EventEmitter.js';

export default class SignalingService extends EventEmitter {
  constructor(serverUrl) {
    super();
    this.serverUrl = serverUrl;
    this.socket = null;
    this.userId = this.generateId();
  }

  connect() {
    this.socket = io(this.serverUrl);
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.socket.on('existing-peers', (peerIds) => {
      this.emit('existing-peers', peerIds);
    });

    this.socket.on('peer-joined', ({ peerId }) => {
      this.emit('peer-joined', { peerId });
    });

    this.socket.on('signal', ({ fromId, signal }) => {
      this.emit('signal-received', { peerId: fromId, signal });
    });

    this.socket.on('peer-left', (peerId) => {
      this.emit('peer-left', { peerId });
    });
  }

  send(peerId, signal) {
    this.socket.emit('signal', {
      toId: peerId,
      signal: signal,
    });
  }

  joinRoom(roomId) {
    this.socket.emit('join-room', roomId);
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

## Критичні сервіси та моделі даних

WebRTC застосунок потребує мінімум трьох core services для управління складністю множинних peer connections.

**WebRTCService** управляє життєвим циклом RTCPeerConnection об'єктів:

```javascript
// services/WebRTCService.js
import EventEmitter from '../lib/EventEmitter.js';
import { ICE_SERVERS } from '../config/webrtc.js';

export default class WebRTCService extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.localUserId = this.generateId();
  }

  createConnection(remotePeerId, localStream) {
    const config = { iceServers: ICE_SERVERS };
    const pc = new RTCPeerConnection(config);

    // Add local tracks
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Setup event handlers
    this.setupConnectionHandlers(pc, remotePeerId);

    // Store connection
    this.connections.set(remotePeerId, {
      pc,
      makingOffer: false,
      isPolite: this.isPolite(remotePeerId),
    });

    return pc;
  }

  setupConnectionHandlers(pc, remotePeerId) {
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.emit('ice-candidate', { peerId: remotePeerId, candidate });
      }
    };

    pc.ontrack = ({ track, streams }) => {
      this.emit('remote-track', {
        peerId: remotePeerId,
        track,
        stream: streams[0],
      });
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      this.emit('connection-state-change', { peerId: remotePeerId, state });

      if (state === 'failed' || state === 'disconnected') {
        this.handleConnectionFailure(remotePeerId);
      }
    };

    pc.onnegotiationneeded = async () => {
      await this.handleNegotiationNeeded(remotePeerId);
    };
  }

  async handleNegotiationNeeded(remotePeerId) {
    const connection = this.connections.get(remotePeerId);
    if (!connection) return;

    try {
      connection.makingOffer = true;
      await connection.pc.setLocalDescription();

      this.emit('signal-outgoing', {
        peerId: remotePeerId,
        signal: {
          type: 'offer',
          description: connection.pc.localDescription,
        },
      });
    } catch (error) {
      console.error('Negotiation error:', error);
    } finally {
      connection.makingOffer = false;
    }
  }

  async handleSignal(remotePeerId, signal) {
    let connection = this.connections.get(remotePeerId);

    if (!connection) {
      console.warn(`Creating connection for unexpected peer ${remotePeerId}`);
      connection = { pc: this.createConnection(remotePeerId) };
    }

    const { pc, makingOffer, isPolite } = connection;

    try {
      if (signal.description) {
        const offerCollision =
          signal.description.type === 'offer' &&
          (makingOffer || pc.signalingState !== 'stable');

        const ignoreOffer = !isPolite && offerCollision;
        if (ignoreOffer) return;

        await pc.setRemoteDescription(signal.description);

        if (signal.description.type === 'offer') {
          await pc.setLocalDescription();
          this.emit('signal-outgoing', {
            peerId: remotePeerId,
            signal: {
              type: 'answer',
              description: pc.localDescription,
            },
          });
        }
      } else if (signal.candidate) {
        await pc.addIceCandidate(signal.candidate);
      }
    } catch (error) {
      console.error('Signal handling error:', error);
    }
  }

  isPolite(remotePeerId) {
    return this.localUserId < remotePeerId;
  }

  closeConnection(peerId) {
    const connection = this.connections.get(peerId);
    if (connection) {
      connection.pc.close();
      this.connections.delete(peerId);
    }
  }

  closeAllConnections() {
    this.connections.forEach((connection, peerId) => {
      this.closeConnection(peerId);
    });
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

**MediaService** абстрагує управління медіа-потоками:

```javascript
// services/MediaService.js
export default class MediaService {
  constructor() {
    this.localStream = null;
    this.constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 },
      },
    };
  }

  async getUserMedia(constraints = this.constraints) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      throw this.handleMediaError(error);
    }
  }

  async getDisplayMedia() {
    try {
      return await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });
    } catch (error) {
      throw this.handleMediaError(error);
    }
  }

  toggleAudio(enabled) {
    if (!this.localStream) return;

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  toggleVideo(enabled) {
    if (!this.localStream) return;

    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  async replaceVideoTrack(newTrack, senders) {
    await Promise.all(senders.map((sender) => sender.replaceTrack(newTrack)));
  }

  stopAllTracks() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }

  handleMediaError(error) {
    const errorMessages = {
      NotAllowedError: 'Permission denied for camera/microphone',
      NotFoundError: 'No camera/microphone found',
      NotReadableError: 'Device is already in use',
      OverconstrainedError: 'Requested constraints cannot be satisfied',
    };

    return new Error(errorMessages[error.name] || error.message);
  }

  adjustQualityForParticipants(participantCount) {
    if (participantCount <= 3) {
      return {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      };
    } else if (participantCount <= 6) {
      return {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 },
      };
    } else {
      return {
        width: { ideal: 320 },
        height: { ideal: 240 },
        frameRate: { ideal: 10 },
      };
    }
  }
}
```

**DataChannelService** для text chat та інших даних:

```javascript
// services/DataChannelService.js
import EventEmitter from '../lib/EventEmitter.js';

export default class DataChannelService extends EventEmitter {
  constructor() {
    super();
    this.channels = new Map();
  }

  createChannel(peerConnection, peerId, label = 'data') {
    const channel = peerConnection.createDataChannel(label, {
      ordered: true,
      maxRetransmits: 3,
    });

    this.setupChannelHandlers(channel, peerId);
    this.channels.set(peerId, channel);

    return channel;
  }

  setupChannelHandlers(channel, peerId) {
    channel.onopen = () => {
      console.log(`Data channel opened with ${peerId}`);
      this.emit('channel-opened', { peerId });
    };

    channel.onclose = () => {
      console.log(`Data channel closed with ${peerId}`);
      this.channels.delete(peerId);
      this.emit('channel-closed', { peerId });
    };

    channel.onerror = (error) => {
      console.error(`Data channel error with ${peerId}:`, error);
      this.emit('channel-error', { peerId, error });
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message-received', { peerId, data });
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
  }

  handleIncomingChannel(event, peerId) {
    const channel = event.channel;
    this.setupChannelHandlers(channel, peerId);
    this.channels.set(peerId, channel);
  }

  send(peerId, data) {
    const channel = this.channels.get(peerId);

    if (!channel || channel.readyState !== 'open') {
      console.warn(`Cannot send to ${peerId}: channel not open`);
      return false;
    }

    try {
      channel.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  broadcast(data, excludePeer = null) {
    this.channels.forEach((channel, peerId) => {
      if (peerId !== excludePeer) {
        this.send(peerId, data);
      }
    });
  }

  close(peerId) {
    const channel = this.channels.get(peerId);
    if (channel) {
      channel.close();
      this.channels.delete(peerId);
    }
  }

  closeAll() {
    this.channels.forEach((channel, peerId) => {
      this.close(peerId);
    });
  }
}
```

**Моделі даних** забезпечують структуровану роботу з domain entities:

```javascript
// models/Peer.js
export default class Peer {
  constructor(id, displayName) {
    this.id = id;
    this.displayName = displayName;
    this.stream = null;
    this.connection = null;
    this.connected = false;
    this.audioEnabled = true;
    this.videoEnabled = true;
    this.createdAt = Date.now();
  }

  setStream(stream) {
    this.stream = stream;
  }

  setConnection(connection) {
    this.connection = connection;
  }

  updateConnectionState(state) {
    this.connected = (state === 'connected');
  }

  toggleAudio() {
    this.audioEnabled = !this.audioEnabled;
  }

  toggleVideo() {
    this.videoEnabled = !this.videoEnabled;
  }

  toJSON() {
    return {
      id: this.id,
      displayName: this.displayName,
      connected: this.connected,
      audioEnabled: this.audioEnabled,
      videoEnabled: this.videoEnabled
    };
  }
}

// models/Room.js
export default class Room {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.peers = new Map();
    this.maxParticipants = 6;
    this.createdAt = Date.now();
  }

  addPeer(peer) {
    if (this.peers.size >= this.maxParticipants) {
      throw new Error('Room is full');
    }
    this.peers.set(peer.id, peer);
  }

  removePeer(peerId) {
    this.peers.delete(peerId);
  }

  getPeer(peerId) {
    return this.peers.get(peerId);
  }

  getPeerCount() {
    return this.peers.size;
  }

  isFull() {
    return this.peers.size >= this.maxParticipants;
  }

  getAllPeers() {
    return Array.from(this.peers.values());
  }
}
```

## Event-driven архітектура та Pub/Sub patterns

Event-driven підхід є фундаментальним для WebRTC застосунків, де асинхронні події (ICE candidates, tracks, connection states) повинні propagate через всю систему.

**EventEmitter базовий клас** для component-level events:

```javascript
// lib/EventEmitter.js
export default class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(eventName, callback) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    this.events.get(eventName).push(callback);
    return this;
  }

  once(eventName, callback) {
    const wrapper = (...args) => {
      callback(...args);
      this.off(eventName, wrapper);
    };
    return this.on(eventName, wrapper);
  }

  emit(eventName, ...args) {
    if (!this.events.has(eventName)) return false;

    this.events.get(eventName).forEach((callback) => {
      try {
        callback.apply(this, args);
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error);
      }
    });

    return true;
  }

  off(eventName, callback) {
    if (!this.events.has(eventName)) return;

    const callbacks = this.events.get(eventName);
    const index = callbacks.indexOf(callback);

    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  removeAllListeners(eventName) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
  }
}
```

**PubSub pattern** для decoupled cross-module комунікації:

```javascript
// lib/PubSub.js
export default class PubSub {
  constructor() {
    this.events = new Map();
    this.subscriptionId = 0;
  }

  subscribe(event, callback) {
    const id = ++this.subscriptionId;

    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event).push({ id, callback });

    // Return unsubscribe function
    return () => this.unsubscribe(event, id);
  }

  unsubscribe(event, id) {
    if (!this.events.has(event)) return;

    const subscriptions = this.events.get(event);
    const index = subscriptions.findIndex((sub) => sub.id === id);

    if (index > -1) {
      subscriptions.splice(index, 1);
    }
  }

  publish(event, data) {
    if (!this.events.has(event)) return;

    this.events.get(event).forEach(({ callback }) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in subscriber for ${event}:`, error);
      }
    });
  }

  clear(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}
```

**Perfect Negotiation Pattern** для robust WebRTC signaling:

```javascript
// WebRTC Perfect Negotiation implementation
class PerfectNegotiationConnection extends EventEmitter {
  constructor(config, isPolite) {
    super();
    this.pc = new RTCPeerConnection(config);
    this.isPolite = isPolite;
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.isSettingRemoteAnswerPending = false;

    this.setupPerfectNegotiation();
  }

  setupPerfectNegotiation() {
    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await this.pc.setLocalDescription();
        this.emit('signal', { description: this.pc.localDescription });
      } catch (err) {
        console.error('Negotiation error:', err);
      } finally {
        this.makingOffer = false;
      }
    };

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.emit('signal', { candidate });
      }
    };

    this.pc.ontrack = ({ track, streams }) => {
      this.emit('remoteTrack', { track, streams });
    };
  }

  async handleSignal({ description, candidate }) {
    try {
      if (description) {
        const readyForOffer =
          !this.makingOffer &&
          (this.pc.signalingState === 'stable' ||
            this.isSettingRemoteAnswerPending);

        const offerCollision = description.type === 'offer' && !readyForOffer;
        this.ignoreOffer = !this.isPolite && offerCollision;

        if (this.ignoreOffer) return;

        this.isSettingRemoteAnswerPending = description.type === 'answer';
        await this.pc.setRemoteDescription(description);
        this.isSettingRemoteAnswerPending = false;

        if (description.type === 'offer') {
          await this.pc.setLocalDescription();
          this.emit('signal', { description: this.pc.localDescription });
        }
      } else if (candidate) {
        try {
          await this.pc.addIceCandidate(candidate);
        } catch (err) {
          if (!this.ignoreOffer) throw err;
        }
      }
    } catch (err) {
      console.error('Signal handling error:', err);
    }
  }
}
```

## Оптимальна файлова структура проєкту

Дві основні стратегії організації коду: **by-type** для менших проєктів (до 20 файлів) та **by-feature** для більших застосунків. Для WebRTC чату з 6 учасниками рекомендую by-type структуру:

```txt
webrtc-video-chat/
├── src/
│   ├── js/
│   │   ├── main.js                    # Entry point
│   │   │
│   │   ├── components/                # UI Components
│   │   │   ├── VideoGrid.js           # Displays remote videos
│   │   │   ├── LocalVideo.js          # Local video preview
│   │   │   ├── Controls.js            # Mute, camera toggle
│   │   │   ├── ChatPanel.js           # Text chat UI
│   │   │   ├── UserList.js            # Participant list
│   │   │   └── ConnectionStatus.js    # Connection indicators
│   │   │
│   │   ├── controllers/               # Business Logic
│   │   │   ├── RoomController.js      # Room orchestration
│   │   │   ├── CallController.js      # Call state management
│   │   │   └── ChatController.js      # Chat logic
│   │   │
│   │   ├── services/                  # External integrations
│   │   │   ├── WebRTCService.js       # Peer connections
│   │   │   ├── SignalingService.js    # WebSocket signaling
│   │   │   ├── MediaService.js        # Media devices
│   │   │   └── DataChannelService.js  # Data channels
│   │   │
│   │   ├── store/                     # State management
│   │   │   ├── index.js               # Store instance
│   │   │   ├── Store.js               # Store class
│   │   │   ├── state.js               # Initial state
│   │   │   ├── actions.js             # Async actions
│   │   │   └── mutations.js           # Sync mutations
│   │   │
│   │   ├── models/                    # Domain models
│   │   │   ├── Peer.js                # Peer entity
│   │   │   ├── Room.js                # Room entity
│   │   │   └── Message.js             # Chat message
│   │   │
│   │   ├── lib/                       # Utilities & patterns
│   │   │   ├── EventEmitter.js        # Event system
│   │   │   ├── PubSub.js              # Pub/Sub pattern
│   │   │   ├── Component.js           # Base component
│   │   │   ├── Logger.js              # Logging utility
│   │   │   └── helpers.js             # Helper functions
│   │   │
│   │   └── config/                    # Configuration
│   │       ├── webrtc.js              # ICE servers, constraints
│   │       ├── signaling.js           # Signaling server URL
│   │       └── constants.js           # App constants
│   │
│   ├── css/
│   │   ├── base.css                   # Reset, typography
│   │   ├── components/
│   │   │   ├── video-grid.css
│   │   │   ├── controls.css
│   │   │   └── chat-panel.css
│   │   └── main.css                   # Import all CSS
│   │
│   └── index.html                     # HTML entry
│
├── server/                            # Signaling server
│   ├── server.js                      # Express + Socket.io
│   └── package.json
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── package.json
├── .eslintrc.js
├── .gitignore
└── README.md
```

**Naming conventions** забезпечують consistency:

- **Класи та конструктори**: PascalCase (`WebRTCService.js`, `EventEmitter.js`, `RoomController.js`)
- **Методи та функції**: camelCase (`getUserMedia()`, `handleIceCandidate()`, `createConnection()`)
- **Константи**: SCREAMING_SNAKE_CASE (`MAX_PARTICIPANTS`, `ICE_SERVERS`, `SIGNALING_URL`)
- **Приватні властивості**: underscore prefix (`_connections`, `_localStream`, `_isPolite`)
- **Event names**: kebab-case (`'peer-joined'`, `'connection-state-changed'`, `'ice-candidate'`)
- **Boolean змінні**: is/has/can prefix (`isConnected`, `hasVideo`, `canReconnect`)

## Корисні ресурси та GitHub репозиторії

**Офіційні приклади та документація:**

- webrtc/samples - офіційна колекція WebRTC samples від W3C
- MDN Web Docs WebRTC API - повна документація з прикладами
- WebRTC.org - architecture guides та codelabs

**Топ GitHub репозиторії для вивчення:**

- hugoArregui/p2p-mesh - складна P2P mesh реалізація з MST routing
- mfcodeworks/webrtc-p2p-full-mesh - простий full mesh template
- antoniom/webrtc-vanillajs - group chat на vanilla JS
- peers/peerjs - production-ready WebRTC framework
- feross/simple-peer - популярна WebRTC wrapper library

**Туторіали та статті:**

- "WebRTC 02: Many-To-Many Connectivity" (Deepstream.io) - відмінний гайд по mesh topology
- "What is WebRTC P2P Mesh and Why It Can't Scale?" (Bloggeek.me) - критичний аналіз обмежень mesh
- "P2P, SFU and MCU - WebRTC Architectures Explained" - порівняння архітектур

**Важливі концепції для имплементації:**

- Perfect Negotiation Pattern від MDN для robust signaling
- Trickle ICE для швидшого встановлення з'єднань
- STUN/TURN сервери конфігурація (Google STUN, власний TURN)
- Adaptive quality based on participant count
- Connection state monitoring та reconnection logic

Ця архітектура забезпечує **robust, scalable та maintainable** WebRTC застосунок на Vanilla JavaScript з повною підтримкою до 6 учасників у P2P mesh topology, готовий до розширення додатковим функціоналом.
