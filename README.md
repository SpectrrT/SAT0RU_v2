# SAT0RU v2 — Cursed Technique Visualizer

A desktop web app that uses your webcam and hand gestures to trigger cinematic **Jujutsu Kaisen** cursed techniques rendered with a 20,000-particle Three.js system, post-processing bloom, and MediaPipe hand tracking. No backend, no build step — just open and go.

![Demo GIF](https://github.com/user-attachments/assets/8ad2b871-02c0-4b97-95f3-34682e745be0)

## ✨ Technique Showcase

### 🟣 Secret Technique: Hollow Purple
![Hollow Purple Demo](https://github.com/user-attachments/assets/your-purple-gif-here)
*Gojo's ultimate attack — a chaotic singularity combining attraction and repulsion*

### 🔴 Cursed Technique Reversal: Red  
![Red Demo](https://github.com/user-attachments/assets/your-red-gif-here)
*Violent repulsive force with a dense white-hot core*

### 🟦 Domain Expansion: Infinite Void
![Infinite Void Demo](https://github.com/user-attachments/assets/your-void-gif-here)
*Gojo's domain — infinite information overload with bright event horizon*

### ⛩️ Domain Expansion: Malevolent Shrine
![Malevolent Shrine Demo](https://github.com/user-attachments/assets/your-shrine-gif-here)
*Sukuna's domain — a dark, ominous shrine with intense screen shake*

### ⚡ Black Flash *(NEW)*
![Black Flash Demo](https://github.com/user-attachments/assets/your-blackflash-gif-here)
*The ultimate critical hit — charge → impact → shockwave ring with perfect timing window*

---

## How to Run

This is a **no-build** project. You just need a local HTTP server (ES modules require one).

### Option A — VS Code Live Server (easiest)
1. Install the **Live Server** extension in VS Code / Cursor.
2. Right-click `index.html` → **Open with Live Server**.
3. Allow webcam access when prompted.

### Option B — Python one-liner
```bash
# Python 3
python3 -m http.server 8000

# Then open http://localhost:8000
```

### Option C — npx
```bash
npx serve .
```

> **Note:** Opening `index.html` directly as a `file://` URL will **not** work because browsers block ES module imports from the file system.

---

## Gestures

| Technique | Gesture | Description |
|---|---|---|
| Secret Technique: Hollow Purple | **OK sign** (thumb + index pinched, other 3 fingers up) | Chaotic singularity sphere with purple bloom |
| Domain Expansion: Malevolent Shrine | **Open hand / Prayer gesture** (all four fingers extended, flat palm) | Blood floor, pillars, and domed roof |
| Domain Expansion: Infinite Void | **Index + Middle up** (ring down) | Event-horizon ring with cosmos background |
| Cursed Technique Reversal: Red | **Index finger up** only | Dense core with 3-arm spiral |
| Black Flash *(NEW)* | **Middle finger only** (middle up, others down) 🖕 | Charge → impact flash → shockwave ring |
| Neutral State | No hands / relaxed | Sparse ambient particles |

### Black Flash — Timing Window

Black Flash has a **timing mechanic**: release the middle finger between **200–600 ms** for the **PERFECT** variant (2× bloom, bigger ring, stronger impulse). If you hold past 800 ms, it auto-fires.

**Visual feedback during charge:**
- **White text**: Charging (not yet in window or past window)
- **Green "✓ PERFECT WINDOW"**: You're in the timing window — release now for PERFECT!
- **Yellow "PERFECT" on impact**: You successfully hit the timing window!

---

## Settings Panel

A collapsible panel in the top-right corner lets you adjust:

- **Bloom** — multiplier on bloom strength (0.2×–3.0×)
- **Particles** — quality preset (5K / 10K / 20K active particles)
- **Intensity** — technique visual intensity multiplier
- **Screen Shake** — toggle decaying screen shake on/off
- **Film Grain** — toggle the film grain overlay

---

## Project Structure

```
SAT0RU_v2/
├── index.html                  # Entry point (importmap, CDN scripts, UI shells)
├── .gitignore
├── README.md
└── src/
    ├── main.js                 # Bootstrap + animation loop + state machine
    ├── core/
    │   ├── renderer.js         # Three.js scene, camera, EffectComposer, bloom, transitions
    │   └── particles.js        # 20K BufferGeometry particles, lerp updates, impulse system
    ├── hand/
    │   ├── hands.js            # MediaPipe Hands init, camera loop, landmark drawing
    │   └── gestures.js         # Gesture classification, hand-scale normalization, debounce
    ├── techniques/
    │   ├── index.js            # Technique registry
    │   ├── neutral.js          # Idle state
    │   ├── red.js              # Cursed Technique Reversal: Red
    │   ├── purple.js           # Hollow Purple
    │   ├── void.js             # Infinite Void
    │   ├── shrine.js           # Malevolent Shrine
    │   └── blackflash.js       # Black Flash (charge/impact/settle state machine)
    └── ui/
        └── panel.js            # Settings panel (bloom, quality, intensity, toggles)
```

---

## Troubleshooting

### Webcam not working
- Make sure you're on **HTTPS** or **localhost** — browsers block camera access on plain HTTP.
- Check browser permissions: click the lock/camera icon in the address bar.
- If using Chrome, go to `chrome://settings/content/camera` and ensure the site is allowed.
- Close other apps that may be using the webcam (Zoom, FaceTime, etc.).

### Gestures not detected
- Ensure good lighting — MediaPipe struggles in low light.
- Keep your hand within the camera frame and at a reasonable distance.
- The system has a **200 ms debounce** and **500 ms cooldown** between gesture switches to prevent flickering. Hold your gesture steadily.

### Performance issues
- Lower the **Particle** quality to 5K or 10K in the settings panel.
- Close other GPU-intensive tabs.
- The pixel ratio is capped at 2× — if you're on a high-DPI display, this is already handled.

---

## Tech Stack

- **Three.js** 0.160 (ES modules via CDN importmap)
- **MediaPipe Hands** (CDN)
- **EffectComposer** + **UnrealBloomPass** for post-processing
- Vanilla JavaScript ES modules — no framework, no build step

---

## License

MIT — do whatever you want with it.
