/**
 * gestures.js — Gesture classification with hand-scale normalization,
 * debouncing (150ms stable), and cooldown (400ms between switches).
 * Black Flash releases bypass cooldown for timing mechanic.
 *
 * Supported gestures:
 *   'purple'       — OK sign (thumb + index pinched, middle/ring/pinky extended)
 *   'blackflash'   — Middle finger only (middle up, others down)
 *   'shrine'       — Open hand / Prayer gesture (all four fingers extended, flat palm)
 *   'void'         — Index + Middle up, ring down
 *   'red'          — Index up only
 *   'cleave'       — Pinky only (pinky up, others down)
 *   'simpledomain' — Circle with both hands (index + thumb tips form ring)
 *   'neutral'      — Default / no clear gesture
 */

const DEBOUNCE_MS = 150; // Reduced from 200ms for faster response
const COOLDOWN_MS = 400; // Reduced from 500ms

let lastConfirmed    = 'neutral';
let candidate        = 'neutral';
let candidateStart   = 0;
let lastSwitchTime   = 0;
let lastTwoHandTime  = 0; // Hysteresis for two-hand gestures

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

    // Cleave: pinky only (others down)
    if (pnk && !idx && !mid && !rng) return 'cleave';

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

    // Check for two-hand circle gesture FIRST
    if (multiLandmarks.length === 2) {
        const circle = detectCircle(multiLandmarks[0], multiLandmarks[1]);
        if (circle) {
            lastTwoHandTime = performance.now();
            return 'simpledomain';
        }
    }
    
    // Hysteresis: if we just had two hands, don't immediately drop to single-hand
    const now = performance.now();
    if (now - lastTwoHandTime < 150 && lastConfirmed === 'simpledomain') {
        return 'simpledomain';
    }

    // Single-hand gestures
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

/**
 * Detect circle gesture with both hands
 */
function detectCircle(lmA, lmB) {
    const scaleA = handScale(lmA);
    const scaleB = handScale(lmB);
    if (scaleA < 0.01 || scaleB < 0.01) return false;
    
    const scale = (scaleA + scaleB) / 2;
    
    // Distance between index tips (8)
    const dIndex = Math.hypot(
        lmA[8].x - lmB[8].x,
        lmA[8].y - lmB[8].y,
        lmA[8].z - lmB[8].z
    );
    
    // Distance between thumb tips (4)
    const dThumb = Math.hypot(
        lmA[4].x - lmB[4].x,
        lmA[4].y - lmB[4].y,
        lmA[4].z - lmB[4].z
    );
    
    const ringSize = (dIndex + dThumb) / 2;
    const ringSizeN = ringSize / scale;
    
    // Symmetry check
    const symmetry = Math.abs(dIndex - dThumb) / (ringSize || 1);
    
    // Thresholds
    const symmetryOK = symmetry < 0.3;
    const sizeOK = ringSizeN > 0.6 && ringSizeN < 2.5;
    
    return symmetryOK && sizeOK;
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
