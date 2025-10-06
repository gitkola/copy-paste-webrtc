# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **peer-to-peer WebRTC video chat application** that works without any signaling server. The entire implementation is contained in a single [index.html](index.html) file with embedded JavaScript and CSS, plus [qrcode.js](qrcode.js) (minified library) for QR code generation.

## Architecture

### Connection Flow

The app uses **manual signaling** (copy-paste or QR codes) instead of a traditional WebRTC signaling server:

**Copy-Paste Flow:**
1. **Initiator** creates an offer and generates a shareable URL with the offer encoded in the hash
2. **Responder** opens the URL, which decodes the offer from the hash
3. Responder generates an answer code (base64 encoded SDP)
4. Responder manually copies and sends the answer code back to the initiator
5. Initiator pastes the answer code to establish the peer connection

**QR Code Flow:**
- Offers and answers can be shared via QR codes instead of copy-paste
- "Show QR" button generates QR codes (offer URL or answer base64)
- "Paste QR Offer" and "Paste QR Answer" buttons scan/upload QR code images
- Context-aware validation ensures correct QR type is used
- No typing or copy-paste required - fully visual workflow

### Two-Stage Connection Process

The app establishes connections in two stages:

1. **Data Channel Connection** (`this.pc`): Established first using the manual copy-paste process
   - Used to exchange media negotiation messages
   - Created in `createDataConnection()` ([index.html:1133](index.html#L1133))

2. **Media Connection** (`this.mediaPc`): Established second via the data channel
   - Carries actual video/audio streams
   - Negotiated after data channel is connected via `startMediaNegotiation()` ([index.html:1400](index.html#L1400))

### Key Components

- **P2PWebRTC Class** ([index.html:721](index.html#L721)): Main class managing the entire WebRTC lifecycle
  - `role`: Either 'initiator' or 'responder'
  - `pc`: RTCPeerConnection for data channel
  - `mediaPc`: RTCPeerConnection for media streams
  - `dataChannel`: For sending media negotiation messages
  - `localStream`: User's camera/microphone
  - `videoMode`: Controls layout ('split', 'local-full', 'remote-full')
  - `buttonState`: UI state ('share', 'paste', 'close')

### UI State Management

The button state machine transitions through:
- `share`: Initial state, shows "Share Offer Link" button
- `paste`: After sharing, shows "Paste Answer Code" button
- `close`: After connection established, shows close button

Video layout modes (toggled by clicking videos):
- `split`: 50/50 split view (default when connected)
- `local-full`: Local video full screen, remote as thumbnail
- `remote-full`: Remote video full screen, local as thumbnail

### QR Code Features

The app supports complete QR code-based signaling as an alternative to copy-paste:

- **Generation**: `showQRCode()` - Intelligently creates QR codes for either offer URLs or answer codes based on role
  - Offers: Encoded as full URL with hash (e.g., `http://localhost:3000/#eyJ0eXBlIjoi...`)
  - Answers: Encoded as base64 string directly (e.g., `eyJ0eXBlIjoiYW5zd2VyIi...`)
  - Uses error correction level 'L' and 600x600px size for optimal scanning

- **Decoding**: `decodeQRFromBlob()` - Reads pasted/uploaded QR code images with context awareness
  - Uses ZXing library (primary, more powerful) with fallback to jsQR
  - Tries multiple image scales (1, 1.5, 2, 3, 4, 0.75, 0.5) for robust detection
  - Context-aware validation: rejects wrong QR type with clear error messages

- **QR Paste Buttons**:
  - `initial-qr-paste-btn`: "Paste QR Offer" (bottom of screen, visible on initial load)
  - `qr-paste-btn`: "Paste QR Answer" (top secondary button, visible when waiting for answer)
  - `qrPasteContext`: Tracks expected QR type ('offer' or 'answer')

- **External Libraries**:
  - qrcode.js (generation, local file)
  - ZXing (@zxing/library, CDN) - Primary decoder for dense QR codes
  - jsQR (CDN) - Fallback decoder

## Running the Application

Since this is a single HTML file with no build process:

```bash
# Serve locally (Python)
python3 -m http.server 8000

# Serve locally (Node.js)
npx http-server

# Or simply open index.html in a browser (file://)
open index.html
```

The app requires camera/microphone permissions and works best with two separate browser windows or different devices.

## How to Test

### Standard Copy-Paste Flow
1. Open the app in one browser window (becomes initiator)
2. Click "Share Offer Link" or use native share
3. Open the link in another browser window/tab (becomes responder)
4. Click "Share Answer Code" on responder side
5. Click "Paste Answer Code" on initiator side and paste the code
6. Connection establishes automatically

### QR Code Flow (Complete Signaling via QR Codes)

**Initiator (Person A):**
1. Open app → Offer automatically generated
2. Click "Show QR" (top secondary button) → Displays offer QR code
3. Download/share the QR code to Person B (via Share Image or Download)
4. Both "Show QR" and "Paste QR Answer" buttons are now visible
5. When Person B provides their answer QR, click "Paste QR Answer"
6. Upload/paste Person B's answer QR code image
7. ✅ Connection established!

**Responder (Person B):**
1. Open app → Click "Paste QR Offer" (bottom button)
2. Upload/paste Person A's offer QR code image
3. App processes offer and becomes responder
4. Click "Show QR" → Generates and displays **answer QR code** (base64)
5. Share answer QR code to Person A
6. ✅ Connection established!

**Important Notes:**
- The "Paste QR Offer" button is always visible on initial screen
- The "Paste QR Answer" button appears when initiator is ready for answer (in 'share' state)
- QR type validation prevents pasting wrong QR code type with clear error messages
- Both "Show QR" and "Paste QR Answer" are visible simultaneously for initiator

## Technical Details

### ICE Servers

Uses Google's public STUN servers:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`
- `stun:stun2.l.google.com:19302`

No TURN servers configured (direct P2P only).

### Data Encoding

All signaling data (offers/answers) is base64-encoded JSON containing SDP information. The format is:
```json
{
  "type": "offer" | "answer",
  "sdp": "<SDP string>"
}
```

### Mobile Optimization

The app includes extensive mobile optimizations:
- PWA-capable with manifest and icons
- Viewport settings for fullscreen mobile experience
- Touch-optimized UI with no scrolling/zooming
- Proper handling of mobile browser chrome

## Troubleshooting

### QR Code Issues

**"No QR code found in image"**
- Ensure the QR code image is clear and high resolution
- Try taking a screenshot instead of using the original QR code
- The app tries multiple image scales automatically (1x to 4x)
- Check browser console for detailed decoder logs

**"This looks like an offer, not an answer"**
- You clicked "Paste QR Answer" but uploaded an offer QR code
- Use "Paste QR Offer" button instead (bottom of screen initially)

**"This doesn't look like an offer QR code"**
- You clicked "Paste QR Offer" but uploaded an answer QR code
- The responder should use "Show QR" to generate their answer QR

**Share QR Code Issues (Safari/macOS)**
- Safari may not support sharing images directly to all apps
- Use "Download" button as fallback
- Copy to clipboard is attempted as secondary fallback

### Connection Issues

**ICE connection failed**
- Both peers must be on networks that allow P2P connections
- No TURN servers configured - direct P2P only
- Corporate/restrictive firewalls may block connections
- Check browser console for ICE state changes

**Data channel not opening**
- Ensure both sides have completed the full handshake
- Check that answer code was processed correctly
- Verify no peer connection was closed prematurely

## Debugging

### Useful Console Logs

**QR Code Generation:**
```
Generating QR code for offer: http://localhost:3000/#eyJ...
Data length: 1167
Data type check: URL
```

**QR Code Decoding (Offer):**
```
Trying ZXing decoder...
✅ QR code decoded successfully with jsQR at scale 1
📥 Processing offer QR code
✅ Valid offer URL, hash length: 1144
📥 Received offer via QR code
```

**QR Code Decoding (Answer):**
```
📥 Processing answer QR code, length: 856
✅ Valid answer data
✅ Answer received
```

**Connection States:**
```
ICE: checking
PC: connecting
ICE: connected
DataChannel opened
```

**Media Negotiation:**
```
Starting media negotiation, role: initiator
🎉 Connected!
```

### Key Functions for Debugging

- `handleOfferFromHash(hashData)`: Processes offer from QR code or URL hash
- `decodeQRFromBlob(blob)`: Decodes QR code with context validation
- `showQRCode()`: Generates QR code (auto-detects offer vs answer)
- `processAnswer()`: Processes answer code from QR or paste
- `createDataConnection()`: Creates initial peer connection
- `startMediaNegotiation()`: Initiates media exchange after data channel connects
