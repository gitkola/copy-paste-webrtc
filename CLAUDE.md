# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **peer-to-peer WebRTC video chat application** that works without any signaling server. The entire implementation is contained in a single [index.html](index.html) file with embedded JavaScript and CSS, plus [qrcode.js](qrcode.js) (minified library) for QR code generation.

## Architecture

### Connection Flow

The app uses a **manual copy-paste signaling mechanism** instead of a traditional WebRTC signaling server:

1. **Initiator** creates an offer and generates a shareable URL with the offer encoded in the hash
2. **Responder** opens the URL, which decodes the offer from the hash
3. Responder generates an answer code (base64 encoded SDP)
4. Responder manually copies and sends the answer code back to the initiator
5. Initiator pastes the answer code to establish the peer connection

**Alternative QR Code Flow**: Both offer URLs and answer codes can be shared via QR codes instead of copy-paste, using the "Show QR" and "Paste QR" buttons.

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

- **Generation**: `showQRCode()` ([index.html:1520](index.html#L1520)) - Creates QR codes for offer URLs or answer codes
- **Decoding**: `decodeQRFromBlob()` ([index.html:1669](index.html#L1669)) - Reads pasted/uploaded QR code images
- External libraries: qrcode.js (generation) and jsQR (decoding, loaded from CDN)

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

### Standard Flow
1. Open the app in one browser window (becomes initiator)
2. Click "Share Offer Link" or use native share
3. Open the link in another browser window/tab (becomes responder)
4. Click "Share Answer Code" on responder side
5. Click "Paste Answer Code" on initiator side and paste the code
6. Connection establishes automatically

### QR Code Flow
1. Initiator clicks "Show QR" to display offer as QR code
2. Responder scans/uploads QR code using "Paste QR"
3. Responder's answer can also be shared via QR code

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
