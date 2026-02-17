/**
 * gestures.js — Gesture classification with hand-scale normalization,
 * debouncing (150ms stable), and cooldown (400ms between switches).
 * Black Flash releases bypass cooldown for timing mechanic.
 *
 * Supported gestures:
 *   'purple'     — OK sign (thumb + index pinched, middle/ring/pinky extended)
 *   'blackflash' — Middle finger only (middle up, others down)
 *   'shrine'     — Flat hand / all four fingers up
 *   'void'       — Index + Middle up, ring down
 *   'red'        — Index up only
 *   'neutral'    — Default / no clear gesture
 */

const DEBOUNCE_MS = 150; // Reduced from 200ms for faster response
const COOLDOWN_MS = 400; // Reduced from 500ms

let lastConfirmed    = 'neutral';
let candidate        = 'neutral';
let candidateStart   = 0;
let lastSwitchTime   = 0;

let glowColor = '#00ffff';

// ── Helpers ──

/**
 * Hand scale = distance from wrist (0) to middle-finger MCP (9).
 * Used to normalize all distance-based gesture thresholds.
 */
function handScale(lm) {
    return Math.hypot(
        lm[0].x - lm[9].x,
        lm[0].y - lm[9].y,
        lm[0].z - lm[9].z,
    );
}

function fingerUp(lm, tip, pip) {
    return lm[tip].y < lm[pip].y;
}

// ── Single-hand classification ──

function classify(lm) {
    const scale = handScale(lm);
    if (scale < 0.01) return 'neutral';

    // Finger states
    const idx = fingerUp(lm, 8,  6);
    const mid = fingerUp(lm, 12, 10);
    const rng = fingerUp(lm, 16, 14);
    const pnk = fingerUp(lm, 20, 18);

    // Black Flash: middle finger only (others down)
    if (mid && !idx && !rng && !pnk) return 'blackflash';

    // OK sign (purple): thumb + index pinched, other 3 fingers extended
    const pinch = Math.hypot(lm[8].x - lm[4].x, lm[8].y - lm[4].y) / scale;
    if (pinch < 0.28 && mid && rng && pnk) return 'purple';

    // Other finger-up combos
    if (idx && mid && rng && pnk) return 'shrine';
    if (idx && mid && !rng)       return 'void';
    if (idx && !mid)              return 'red';

    return 'neutral';
}

// ── Multi-hand: pick the largest (closest / most confident) hand ──

function classifyBest(multiLandmarks) {
    if (!multiLandmarks || multiLandmarks.length === 0) return 'neutral';

    let best = 'neutral';
    let bestScale = 0;

    for (const lm of multiLandmarks) {
        const s = handScale(lm);
        if (s > bestScale) {
            bestScale = s;
            best = classify(lm);
        }
    }
    return best;
}

// ── Public API ──

/**
 * Main entry point — call once per MediaPipe frame.
 * Returns the debounced, cooldown-gated gesture string.
 */
function detectGesture(multiLandmarks) {
    const now = performance.now();
    const raw = classifyBest(multiLandmarks);

    // Cooldown: ignore changes that come too soon after the last switch
    // EXCEPT when releasing Black Flash (allow fast release for timing mechanic)
    const allowFastRelease = lastConfirmed === 'blackflash' && raw !== 'blackflash';
    if (!allowFastRelease && now - lastSwitchTime < COOLDOWN_MS && raw !== lastConfirmed) {
        return lastConfirmed;
    }

    // Debounce: candidate must be stable for DEBOUNCE_MS
    if (raw !== candidate) {
        candidate      = raw;
        candidateStart = now;
        return lastConfirmed;
    }

    if (now - candidateStart >= DEBOUNCE_MS && candidate !== lastConfirmed) {
        lastConfirmed  = candidate;
        lastSwitchTime = now;
    }

    return lastConfirmed;
}

function getGlowColor()       { return glowColor; }
function setGlowColor(color)  { glowColor = color; }

export { detectGesture, getGlowColor, setGlowColor };
