# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **peer-to-peer WebRTC video chat application** that works without any signaling server. The entire implementation is contained in a single `index.html` file with embedded JavaScript and CSS.

## Architecture

### Connection Flow

The app uses a **manual copy-paste signaling mechanism** instead of a traditional WebRTC signaling server:

1. **Initiator** creates an offer and generates a shareable URL with the offer encoded in the hash
2. **Responder** opens the URL, which decodes the offer from the hash
3. Responder generates an answer code (base64 encoded SDP)
4. Responder manually copies and sends the answer code back to the initiator
5. Initiator pastes the answer code to establish the peer connection

### Two-Stage Connection Process

The app establishes connections in two stages:

1. **Data Channel Connection** (`this.pc`): Established first using the manual copy-paste process
   - Used to exchange media negotiation messages
   - Created in `createDataConnection()`

2. **Media Connection** (`this.mediaPc`): Established second via the data channel
   - Carries actual video/audio streams
   - Negotiated after data channel is connected via `startMediaNegotiation()`

### Key Components

- **P2PWebRTC Class**: Main class managing the entire WebRTC lifecycle
  - `role`: Either 'initiator' or 'responder'
  - `pc`: RTCPeerConnection for data channel
  - `mediaPc`: RTCPeerConnection for media streams
  - `dataChannel`: For sending media negotiation messages
  - `localStream`: User's camera/microphone

### State Machine

The UI has 5 states:
- `initialState`: Landing page
- `initiatorState`: Shows link to share and answer input
- `responderState`: Shows answer code to copy
- `connectingState`: Waiting for connection
- `connectedState`: Video call active

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

1. Open the app in one browser window (becomes initiator)
2. Copy the generated link
3. Open the link in another browser window/tab (becomes responder)
4. Copy the answer code from the responder
5. Paste it into the initiator's answer input
6. Click "Connect"

## ICE Servers

Uses Google's public STUN servers:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`
- `stun:stun2.l.google.com:19302`

No TURN servers configured (direct P2P only).
