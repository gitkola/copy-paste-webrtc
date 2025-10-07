# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Recent Major Update

**This project was refactored on October 7, 2025** from a monolithic 2,406-line `index.html` into a modular architecture with 30+ files. All functionality preserved with zero breaking changes.

**Key Documentation:**

- [ARCHITECTURE.md](ARCHITECTURE.md) - Complete architecture design
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - What changed from original
- [README.md](README.md) - Project overview and usage
- [QUICKSTART.md](QUICKSTART.md) - Get running in 30 seconds

## Project Overview

This is a **peer-to-peer WebRTC video chat application** that works **without any signaling server**. It uses **manual signaling** (copy-paste or QR codes) instead of traditional WebSocket/HTTP signaling.

### Key Characteristics

- **Serverless P2P**: Direct peer-to-peer connections
- **Manual Signaling**: Share connection codes via any channel
- **QR Code Support**: Visual workflow for mobile devices
- **Dual Connections**: Data channel + media channel architecture
- **Hybrid ICE**: Full gathering for data, Trickle ICE for media
- **Lazy Initialization**: Connections created only when needed
- **Mobile Optimized**: Full PWA support

## Architecture

### Modular Structure (Refactored)

The application follows a **layered architecture** with clear separation of concerns:

```
src/
├── index.html                  # HTML shell (200 lines)
├── js/
│   ├── main.js                 # Entry point with DI
│   ├── components/             # Presentation Layer (6 files)
│   │   ├── Toast.js            # Notifications
│   │   ├── Controls.js         # Top panel (mic, camera, etc.)
│   │   ├── ButtonManager.js    # Main action buttons
│   │   ├── ModalManager.js     # Modal interactions
│   │   ├── VideoGrid.js        # Video display management
│   │   └── SecondaryButtons.js # QR/paste buttons
│   ├── controllers/            # Business Logic (3 files)
│   │   ├── ConnectionController.js  # WebRTC orchestration
│   │   ├── UIController.js          # UI state management
│   │   └── MediaController.js       # Video layout logic
│   ├── services/               # Service Layer (4 files)
│   │   ├── WebRTCService.js    # Peer connections
│   │   ├── MediaService.js     # Camera/microphone
│   │   ├── SignalingService.js # Manual signaling
│   │   └── QRCodeService.js    # QR operations
│   ├── store/                  # State Management (5 files)
│   │   ├── Store.js            # Reactive store class
│   │   ├── state.js            # Initial state
│   │   ├── mutations.js        # Sync state changes
│   │   ├── actions.js          # Async operations
│   │   └── index.js            # Store singleton
│   ├── lib/                    # Infrastructure (3 files)
│   │   ├── EventEmitter.js     # Event system
│   │   ├── Logger.js           # Centralized logging
│   │   └── helpers.js          # Utility functions
│   └── config/                 # Configuration (2 files)
│       ├── webrtc.js           # WebRTC settings
│       └── constants.js        # App constants
└── css/                        # Styles (6 files)
    ├── main.css
    ├── base.css
    └── components/
```

### Architecture Layers

1. **Presentation Layer** ([src/js/components/](src/js/components/))

   - Pure UI components with no business logic
   - Subscribe to state changes for reactive updates
   - Example: [ButtonManager.js](src/js/components/ButtonManager.js) manages button visibility

2. **Business Logic Layer** ([src/js/controllers/](src/js/controllers/))

   - Orchestrate services and coordinate workflows
   - Handle user interactions and route to appropriate services
   - Example: [ConnectionController.js](src/js/controllers/ConnectionController.js) manages connection lifecycle

3. **Service Layer** ([src/js/services/](src/js/services/))

   - Single-responsibility services with clear interfaces
   - WebRTC, media devices, signaling, QR code operations
   - Example: [WebRTCService.js](src/js/services/WebRTCService.js) handles peer connections

4. **State Management** ([src/js/store/](src/js/store/))

   - Proxy-based reactive state (Vuex/Redux pattern)
   - Centralized application state
   - Example: [store/state.js](src/js/store/state.js) defines all state properties

5. **Infrastructure** ([src/js/lib/](src/js/lib/), [src/js/config/](src/js/config/))
   - Event system, logging, utilities, configuration
   - Example: [Logger.js](src/js/lib/Logger.js) provides centralized logging

## Connection Flow

The app uses **two-stage connection** with manual signaling:

### Stage 1: Data Channel Connection

**Purpose**: Establish initial P2P connection and data channel for signaling

**Initiator Flow:**

1. User clicks "Share Offer" → [ConnectionController.startAsInitiator()](src/js/controllers/ConnectionController.js:L80)
2. [WebRTCService.createDataConnection()](src/js/services/WebRTCService.js:L38) creates `RTCPeerConnection`
3. [WebRTCService.createOffer()](src/js/services/WebRTCService.js:L130) generates offer
4. Waits for ICE candidates → [waitForICECandidates()](src/js/services/WebRTCService.js:L190)
5. [SignalingService.createOfferUrl()](src/js/services/SignalingService.js:L21) encodes offer in URL hash
6. User shares URL via any channel (copy-paste, QR, messaging app)

**Responder Flow:**

1. Opens offer URL → [ConnectionController.handleOfferFromHash()](src/js/controllers/ConnectionController.js:L120)
2. [SignalingService.parseOffer()](src/js/services/SignalingService.js:L48) decodes offer from hash
3. [WebRTCService.createAnswer()](src/js/services/WebRTCService.js:L151) processes offer and creates answer
4. Waits for ICE candidates → [waitForICECandidates()](src/js/services/WebRTCService.js:L190)
5. [SignalingService.createAnswerCode()](src/js/services/SignalingService.js:L36) encodes answer
6. User shares answer code back to initiator

**Connection Established:**

- Data channel opens → [setupDataChannel()](src/js/services/WebRTCService.js:L88)
- Event emitted → `'datachannel-open'`
- Ready for Stage 2

### Stage 2: Media Connection

**Purpose**: Exchange video/audio streams via separate peer connection

**Process:**

1. Data channel opens → [ConnectionController](src/js/controllers/ConnectionController.js:L48) listens for event
2. Delay 500ms → [startMediaNegotiation()](src/js/controllers/ConnectionController.js:L228)
3. [WebRTCService.startMediaNegotiation()](src/js/services/WebRTCService.js:L217) initiates media
4. Creates second `RTCPeerConnection` → [createMediaPeerConnection()](src/js/services/WebRTCService.js:L234)
5. **Uses Trickle ICE** - candidates sent via data channel as they arrive
6. Media offer/answer exchanged via data channel (not manual signaling!)
7. Remote tracks received → [remote-track event](src/js/services/WebRTCService.js:L259)
8. Videos displayed → [MediaController.attachRemoteStream()](src/js/controllers/MediaController.js:L31)

### Why Two Connections?

1. **Reliability**: Initial connection uses full ICE gathering (more reliable for manual signaling)
2. **Speed**: Media connection uses Trickle ICE (faster, sent via established data channel)
3. **Flexibility**: Can renegotiate media without recreating data channel
4. **Optimization**: Different ICE strategies for different purposes

## QR Code Features

The app has three QR code workflows, all handled by [QRCodeService.js](src/js/services/QRCodeService.js):

### 1. One-Click QR Share (Recommended)

**Initiator:**

```javascript
// User clicks "Share QR Offer"
ConnectionController.shareOfferQR()
  → QRCodeService.shareQRDirect(url)
    → Generates QR image
    → Opens native share menu
    → Fallback to clipboard
```

**Responder:**

```javascript
// Similar flow for answer
ConnectionController.shareAnswerQR()
  → QRCodeService.shareQRDirect(code)
```

### 2. QR Modal Display

```javascript
// User clicks "Show QR"
UIController.handleShowQRClick()
  → ConnectionController.generateQRForModal()
    → QRCodeService.generateQRCode(data)
      → Returns canvas element
      → Displayed in modal
```

**Smart Detection:**

- Automatically determines if data is offer (URL) or answer (base64)
- Applies adaptive error correction based on data size:
  - Small data (<500 chars): High error correction (H - 30%)
  - Medium (500-1000): Medium-High (Q - 25%)
  - Large (1000-1500): Medium (M - 15%)
  - Very large (>1500): Low (L - 7%)

### 3. QR Scanning/Upload

```javascript
// User uploads/pastes QR image
ModalManager.processQRBlob(blob)
  → UIController.handleQRCodeUpload(blob)
    → ConnectionController.processQRCode(blob, context)
      → QRCodeService.decodeQRFromBlob(blob, context)
        → Try ZXing decoder (primary)
        → Fallback to jsQR
        → Try multiple scales: [1, 800px, 1200px, 600px, 400px]
        → Validate against expected context (offer vs answer)
```

**Context Validation:**

- Tracks expected QR type: `store.state.qrPasteContext` ('offer' or 'answer')
- Rejects wrong type with clear error message
- Prevents user confusion and connection failures

### QR Code Libraries

**Generation:**

- `qrcode.js` (local file) - [generateQRCode()](src/js/services/QRCodeService.js:L27)

**Decoding (multi-decoder approach):**

- **ZXing** (primary) - Better for dense/large QR codes - [decodeQRFromImage()](src/js/services/QRCodeService.js:L97)
- **jsQR** (fallback) - Better compatibility - [decodeQRFromImage()](src/js/services/QRCodeService.js:L120)
- Tries multiple image scales automatically for robustness

## State Management

The application uses **Proxy-based reactive state** similar to Vuex/Redux:

### State Structure

Defined in [store/state.js](src/js/store/state.js):

```javascript
{
  // Connection
  connectionState: 'idle' | 'connecting' | 'connected' | 'failed',
  role: 'initiator' | 'responder' | null,

  // UI
  buttonState: 'initial' | 'initiator-share' | 'initiator-wait-answer' |
               'responder-share' | 'connected',
  videoMode: 'split' | 'local-full' | 'remote-full',
  qrPasteContext: 'offer' | 'answer',

  // Media
  localStream: MediaStream | null,
  remoteStream: MediaStream | null,
  micEnabled: boolean,
  cameraEnabled: boolean,

  // Data
  offerUrl: string | null,
  answerCode: string | null,

  // Flags
  isProcessing: boolean,
  isLoading: boolean,
  error: string | null
}
```

### Using State

**Read state:**

```javascript
import store from './store/index.js';
const currentRole = store.state.role;
```

**Update state (via mutations):**

```javascript
store.commit('setRole', 'initiator');
store.commit('setConnectionState', 'connected');
```

**Async operations (via actions):**

```javascript
await store.dispatch('startAsInitiator');
await store.dispatch('connectEstablished');
```

**Subscribe to changes:**

```javascript
store.subscribe((state, change) => {
  if (change.key === 'buttonState') {
    console.log('Button state changed:', change.value);
    updateUI();
  }
});
```

### UI State Machine

Button states transition through defined flow:

```
initial
  ↓ (click "Share Offer")
initiator-share
  ↓ (share offer)
initiator-wait-answer
  ↓ (paste answer)
connected

OR

initial
  ↓ (paste offer / open URL)
responder-share
  ↓ (share answer)
connected
```

Managed by [store/actions.js](src/js/store/actions.js) and [UIController.js](src/js/controllers/UIController.js).

## Running the Application

### Development

```bash
# Navigate to project root
cd /Users/nick/Downloads/copy-paste-webrtc

# Start HTTP server
python3 -m http.server 8000
# or
npx http-server -p 8000

# Open browser
http://localhost:8000/src/

# ⚠️ Must use HTTP(S), not file:// (ES6 modules requirement)
```

### Commands

```bash
# Development server
npm run dev           # Starts python3 -m http.server 8000
npm run serve         # Alternative with http-server
```

## Testing Workflows

### Copy-Paste Flow

**Initiator (Window 1):**

1. Open `http://localhost:8000/src/`
2. Click "Share Offer" (creates connection via [startAsInitiator()](src/js/controllers/ConnectionController.js:L80))
3. Click "Share Offer Link" or "Share Offer QR"
4. Share via clipboard or messaging app
5. Wait for answer code
6. Click "Paste Answer" → paste code
7. ✅ Connected!

**Responder (Window 2):**

1. Open shared URL (processed via [handleOfferFromHash()](src/js/controllers/ConnectionController.js:L120))
2. Click "Share Answer Code" or "Share Answer QR"
3. Send back to initiator
4. ✅ Connected!

### QR Code Flow

**Initiator:**

1. Click "Share QR Offer" (one-click: generates + shares)
2. Share QR image
3. Click "Paste QR Answer" → upload answer QR
4. ✅ Connected!

**Responder:**

1. Click "Paste QR Offer" → upload offer QR
2. Click "Show QR" → share answer QR
3. ✅ Connected!

## Key Implementation Details

### Lazy Initialization

Peer connection is **NOT** created on page load. It's created only when:

- User clicks "Share Offer" (initiator)
- User pastes offer / opens offer URL (responder)

Benefits:

- Saves resources until actually needed
- Cleaner user experience
- No wasted connections

Implementation: [ConnectionController.startAsInitiator()](src/js/controllers/ConnectionController.js:L80)

### Hybrid ICE Strategy

**Data Connection (Initial):**

- Full ICE gathering - waits for all candidates
- More reliable for copy-paste signaling
- Implementation: [waitForICECandidates()](src/js/services/WebRTCService.js:L190)

**Media Connection (Secondary):**

- Trickle ICE - candidates sent as they arrive
- Faster connection establishment
- Sent via data channel, not manual signaling
- Implementation: [sendMediaOffer()](src/js/services/WebRTCService.js:L270)

### Event-Driven Architecture

Services emit events, controllers handle them - loose coupling:

```javascript
// WebRTCService emits
this.emit('remote-track', { streams });

// ConnectionController handles
this.webrtc.on('remote-track', ({ streams }) => {
  store.commit('setRemoteStream', streams[0]);
  store.dispatch('connectEstablished');
});
```

Key events: `'datachannel-open'`, `'remote-track'`, `'connection-failed'`, `'ice-state-change'`

### Video Layout Modes

Three modes managed by [MediaController.js](src/js/controllers/MediaController.js):

1. **Split** - 50/50 view (horizontal on landscape, vertical on portrait)
2. **Local Full** - Your video full, remote thumbnail
3. **Remote Full** - Their video full, local thumbnail

Toggle by clicking any video → [VideoGrid.handleVideoClick()](src/js/components/VideoGrid.js:L30)

## Technical Details

### ICE Servers

Configured in [config/webrtc.js](src/js/config/webrtc.js):

```javascript
ICE_SERVERS: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];
```

**No TURN servers** - Direct P2P only. Connections may fail behind restrictive firewalls.

### Data Encoding

All signaling data is **base64-encoded JSON**:

```javascript
// Offer/Answer format
{
  type: 'offer' | 'answer',
  sdp: '<SDP string with embedded ICE candidates>'
}
```

Implementation: [helpers.js](src/js/lib/helpers.js) - `encodeToBase64()`, `decodeFromBase64()`

### Mobile Optimization

- PWA-capable ([site.webmanifest](site.webmanifest))
- Touch-optimized UI (no scrolling/zooming)
- Viewport settings for fullscreen mobile
- Proper handling of mobile browser chrome
- Video fullscreen support

## Debugging

### Console Access

```javascript
// Access store
window.__DEBUG__.store.state;

// Access logger
window.__DEBUG__.logger.setLevel('DEBUG'); // ERROR, WARN, INFO, DEBUG

// Subscribe to all state changes
window.__DEBUG__.store.subscribe((state, change) => {
  console.log('State changed:', change.key, '→', change.value);
});
```

### Logger Usage

All logging goes through centralized logger:

```javascript
import logger from './lib/Logger.js';

logger.debug('Detailed info'); // Only shown when DEBUG level
logger.info('General info'); // Default level
logger.warn('Warning');
logger.error('Error');
```

### Key Debugging Points

**Connection issues:**

- [WebRTCService.js](src/js/services/WebRTCService.js) - All peer connection logic
- Check ICE state: Look for `'ICE state: '` logs
- Check connection state: Look for `'Connection state: '` logs

**QR code issues:**

- [QRCodeService.js](src/js/services/QRCodeService.js) - All QR operations
- Look for `'✅ QR decoded'` or `'❌ No QR code found'`
- Check context validation: `'Valid offer URL'` vs `'This looks like an offer'`

**State issues:**

- Enable: `window.__DEBUG__.logger.setLevel('DEBUG')`
- Watch for: `'State change: '` logs
- Check: `window.__DEBUG__.store.state`

**WebRTC internals:**

- Chrome: `chrome://webrtc-internals/`
- Firefox: `about:webrtc`

## Common Development Tasks

### Adding a New Feature

1. **Determine layer**: Which layer does this belong to?

   - UI change? → [components/](src/js/components/)
   - Business logic? → [controllers/](src/js/controllers/)
   - Core functionality? → [services/](src/js/services/)

2. **Add state** (if needed): [store/state.js](src/js/store/state.js)

3. **Add mutations**: [store/mutations.js](src/js/store/mutations.js)

4. **Implement feature** in appropriate layer

5. **Wire in main.js**: [main.js](src/js/main.js)

### Modifying Existing Feature

1. **Find the file**: Use documentation index or grep
2. **Read the module**: Each file is ~100 lines, easy to understand
3. **Make changes**: Stay within single responsibility
4. **Test**: Manual testing or add unit tests

### Example: Adding Screen Sharing

```javascript
// 1. Add to MediaService
async getDisplayMedia() {
  return await navigator.mediaDevices.getDisplayMedia({
    video: { cursor: 'always' },
    audio: false
  });
}

// 2. Add state
screenShareActive: false

// 3. Add mutation
setScreenShareActive(state, active) {
  state.screenShareActive = active;
}

// 4. Add to UIController
async handleScreenShareClick() {
  const stream = await this.mediaService.getDisplayMedia();
  // Replace track in connection...
}

// 5. Add button in ButtonManager
// 6. Wire in main.js
```

## Architecture Patterns Used

- **Dependency Injection**: Manual DI via constructors ([main.js](src/js/main.js:L29))
- **Observer Pattern**: EventEmitter for pub/sub ([EventEmitter.js](src/js/lib/EventEmitter.js))
- **Reactive State**: Proxy-based reactivity ([Store.js](src/js/store/Store.js:L24))
- **Service Layer**: Single-responsibility services ([services/](src/js/services/))
- **Repository Pattern**: Centralized state ([store/](src/js/store/))
- **Module Pattern**: ES6 modules throughout
- **Factory Pattern**: Configuration factories ([config/webrtc.js](src/js/config/webrtc.js:L40))
- **Singleton**: Store and Logger ([store/index.js](src/js/store/index.js), [Logger.js](src/js/lib/Logger.js))

## Troubleshooting

### "Module not found" errors

- ✅ Serving via HTTP(S)? (not `file://`)
- ✅ Correct paths? (case-sensitive!)
- ✅ Check browser console for specific module

### Camera not working

- ✅ HTTPS in production (HTTP localhost is OK)
- ✅ Permissions granted
- ✅ Device not in use by another app

### Connection fails

- ✅ Both peers on networks allowing P2P
- ✅ No TURN servers (direct P2P only)
- ✅ Firewall not blocking WebRTC
- ✅ Check `chrome://webrtc-internals/`

### QR code not scanning

- ✅ Image clear and high resolution
- ✅ Correct context (offer vs answer)
- ✅ Check console for decoder errors
- ✅ Try different scales/lighting

## Performance

- **Bundle size**: ~90KB total (unminified, no gzip)
- **Load time**: <500ms on 3G
- **Runtime**: Same as monolithic (no framework overhead)
- **Memory**: Slightly better (modular GC)

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 15+
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

## Security Notes

- ⚠️ **No encryption** on signaling data (offer/answer codes in clear text)
- ✅ WebRTC media encrypted by default (DTLS-SRTP)
- ⚠️ No TURN servers configured (direct P2P only)
- ✅ No data collected or stored
- ⚠️ Use HTTPS in production (required for getUserMedia)

## Additional Resources

- **Full architecture details**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **What changed**: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
- **Quick start**: [QUICKSTART.md](QUICKSTART.md)
- **Deployment**: [.deployment-checklist.md](.deployment-checklist.md)
- **Documentation index**: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)

---

**Last Updated**: October 7, 2025 (After modular refactoring)
**Architecture Version**: 2.0.0
**Pattern Compliance**: SOLID, Clean Architecture, Event-Driven
