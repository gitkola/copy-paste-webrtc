# Quick Start Guide

## 🚀 Get Running in 30 Seconds

### 1. Start Server

```bash
cd /Users/nick/Downloads/copy-paste-webrtc
python3 -m http.server 8000
```

### 2. Open Browser

Navigate to: **http://localhost:8000/src/**

### 3. Test It!

Open two browser windows side-by-side and follow the flow:

#### Window 1 (Initiator):

1. Click **"Share Offer"** button (green)
2. Click **"Share Offer Link"** or **"Share Offer QR"**
3. Copy the URL or share the QR code
4. Wait for answer...
5. Click **"Paste Answer"** when ready
6. **✅ Connected!**

#### Window 2 (Responder):

1. Paste the offer URL into address bar (from Window 1)
2. Click **"Share Answer Code"** or **"Share Answer QR"**
3. Copy and send back to Window 1
4. **✅ Connected!**

---

## 🎥 Video Layout

Once connected, **click on any video** to cycle through layouts:

- **Split view** (50/50)
- **Local full** (your video full screen)
- **Remote full** (their video full screen)

---

## 🐛 Troubleshooting

### "Module not found" errors?

- ✅ Make sure you're accessing via **http://localhost:8000/src/** (not `file://`)
- ✅ Check browser console for specific module name

### Camera not working?

- ✅ Grant camera/microphone permissions
- ✅ Check if another app is using the camera
- ✅ Try reloading the page

### Connection not establishing?

- ✅ Enable debug logging: `window.__DEBUG__.logger.setLevel('DEBUG')`
- ✅ Check browser console for WebRTC errors
- ✅ Both users must be on networks that allow P2P (no strict firewalls)

### QR code not scanning?

- ✅ Make sure image is clear and well-lit
- ✅ Try uploading the file instead of pasting
- ✅ Check you're using the right context (offer vs answer)

---

## 🔍 Debug Mode

Open browser console and run:

```javascript
// Enable debug logging
window.__DEBUG__.logger.setLevel('DEBUG');

// View current state
window.__DEBUG__.store.state;

// Monitor all state changes
window.__DEBUG__.store.subscribe((state, change) => {
  console.log('State changed:', change.key, change.value);
});
```

---

## 📱 Mobile Testing

1. Find your local IP: `ifconfig | grep inet` (macOS/Linux)
2. Start server: `python3 -m http.server 8000`
3. On mobile, visit: `http://YOUR_IP:8000/src/`
4. Make sure both devices are on the same network

---

## ✨ Quick Feature Tour

### Lazy Initialization

- Camera starts immediately
- Peer connection only created when you click "Share Offer"
- Saves resources until needed

### Dual Connections

- **Data Channel**: For signaling media negotiation
- **Media Channel**: For actual video/audio streams
- Optimized for speed and reliability

### Hybrid ICE

- **Initial connection**: Waits for all ICE candidates (reliable)
- **Media connection**: Uses Trickle ICE (fast)

### QR Code Workflows

- **Generate**: Automatic error correction based on data size
- **Scan**: Multi-decoder (ZXing + jsQR) with scale adaptation
- **Share**: One-click to any app via native Share API

---

## 🎯 Testing Checklist

- [ ] Camera/mic access granted
- [ ] Initiator can create and share offer
- [ ] Responder receives offer from URL hash
- [ ] Answer code can be shared back
- [ ] Connection establishes (both videos appear)
- [ ] Video layout toggling works
- [ ] Mic toggle works
- [ ] Camera toggle works
- [ ] QR code generation works
- [ ] QR code scanning works
- [ ] Mobile layout responsive

---

## 📂 Project Structure Reference

```
src/
├── index.html          # Entry point
├── js/
│   ├── main.js         # Bootstrap
│   ├── components/     # UI (6 files)
│   ├── controllers/    # Logic (3 files)
│   ├── services/       # Core (4 files)
│   ├── store/          # State (5 files)
│   ├── lib/            # Utils (3 files)
│   └── config/         # Config (2 files)
└── css/
    ├── main.css        # Entry
    ├── base.css        # Reset
    └── components/     # Styles (4 files)
```

---

## 🔗 Next Steps

1. ✅ **Try it** - Test all flows (copy-paste, QR)
2. 📖 **Read** - [ARCHITECTURE.md](ARCHITECTURE.md) for design details
3. 🛠️ **Extend** - Add new features using the modular structure
4. 🧪 **Test** - Write unit tests for individual modules
5. 🚀 **Deploy** - Host on any static server

---

## 💡 Pro Tips

- **State inspection**: `window.__DEBUG__.store.state` shows everything
- **Network debugging**: Chrome DevTools → Network → WS (WebSocket) tab
- **WebRTC internals**: Chrome → `chrome://webrtc-internals/`
- **Mobile debugging**: Chrome → Inspect → Remote devices

---

## 🆘 Getting Help

1. Check browser console for errors
2. Enable DEBUG logging mode
3. Review [ARCHITECTURE.md](ARCHITECTURE.md) for design
4. Check [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for changes
5. See [CLAUDE.md](CLAUDE.md) for WebRTC specifics

---

**Ready to code?** Open `src/js/main.js` and start exploring! 🎉
