/**
 * Black Flash — NEW technique
 *
 * 3-phase state machine:
 *   CHARGE  → particles converge to center, energy gathering (0–500ms)
 *   IMPACT  → bright flash, shockwave ring, particle burst (~700ms)
 *   SETTLE  → crackling aftermath until gesture changes
 *
 * Timing-window mechanic:
 *   If the fist is held for 250–400ms then released (or auto-fires at 400ms),
 *   a "PERFECT" variant triggers (2× bloom, stronger impulse, bigger ring).
 *
 * Uses deterministic per-particle hashing so generate() can be called
 * every frame without random jitter.
 */

export const config = {
    name:           'blackflash',
    displayName:    'Black Flash',
    glowColor:      '#ffffff',
    bloomStrength:  3.0,
    shakeIntensity: 0.6,
    cameraDolly:    -4,
};

// ── State machine ──

const CHARGE_DURATION = 800;  // ms — max charge time before auto-fire
const TIMING_MIN      = 200;  // ms — start of perfect window
const TIMING_MAX      = 600;  // ms — end of perfect window (wider window)
const IMPACT_DURATION = 700;  // ms — impact animation length

const state = {
    phase:      'idle',   // idle | charge | impact | settle
    startTime:  0,
    impactTime: 0,
    perfect:    false,
};

// Deterministic hash for stable per-particle randomness
function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

// ── Public state API ──

export function getState()  { return state; }

export function activate() {
    if (state.phase === 'idle') {
        state.phase     = 'charge';
        state.startTime = performance.now();
        state.perfect   = false;
    }
}

export function deactivate() {
    if (state.phase === 'charge') {
        const elapsed = performance.now() - state.startTime;
        state.perfect = elapsed >= TIMING_MIN && elapsed <= TIMING_MAX;
        triggerImpact();
    }
}

export function triggerImpact() {
    state.phase      = 'impact';
    state.impactTime = performance.now();
}

export function reset() {
    state.phase   = 'idle';
    state.perfect = false;
}

/**
 * Call every frame while Black Flash is the active technique.
 * Manages automatic phase transitions.
 */
export function updatePhase() {
    const now = performance.now();

    if (state.phase === 'charge') {
        const elapsed = now - state.startTime;
        if (elapsed >= CHARGE_DURATION) {
            // Auto-fire: perfect only if within window
            state.perfect = elapsed <= TIMING_MAX;
            triggerImpact();
        }
    }

    if (state.phase === 'impact') {
        if (now - state.impactTime >= IMPACT_DURATION) {
            state.phase = 'settle';
        }
    }
}

// ── Dynamic bloom/shake overrides ──

export function getBloomOverride() {
    if (state.phase === 'charge') {
        const t = clamp01((performance.now() - state.startTime) / CHARGE_DURATION);
        return 1.5 + t * 2.5;
    }
    if (state.phase === 'impact') {
        const t    = clamp01((performance.now() - state.impactTime) / IMPACT_DURATION);
        const peak = state.perfect ? 9.0 : 5.5;
        return peak * (1.0 - t * t);
    }
    if (state.phase === 'settle') {
        return 1.8;
    }
    return null;
}

export function getShakeOverride() {
    if (state.phase === 'impact') {
        return state.perfect ? 1.8 : 0.9;
    }
    return null;
}

// ── Particle generation (per-frame, deterministic) ──

export function generate(i, COUNT) {
    const h1    = hash(i);
    const h2    = hash(i + 1e5);
    const h3    = hash(i + 2e5);
    const theta = h1 * Math.PI * 2;
    const phi   = Math.acos(2 * h2 - 1);

    // ── CHARGE ──
    if (state.phase === 'charge') {
        const t = clamp01((performance.now() - state.startTime) / CHARGE_DURATION);
        const converge = 1.0 - t * 0.85;

        if (i < COUNT * 0.15) {
            const r = h3 * 25 * converge;
            return {
                x: r * Math.sin(phi) * Math.cos(theta + t * 4),
                y: r * Math.sin(phi) * Math.sin(theta + t * 4),
                z: r * Math.cos(phi),
                r: 0.5 + t * 0.5, g: 0.4 + t * 0.6, b: 1.0, s: 1.0 + t * 2.5,
            };
        }
        const swirl = theta + t * 6 + h3 * 2;
        const rad   = (20 + h3 * 30) * converge;
        return {
            x: rad * Math.cos(swirl),
            y: rad * Math.sin(swirl) * 0.6,
            z: (h3 - 0.5) * rad * 0.4,
            r: 0.1 + t * 0.4, g: 0.05 + t * 0.2, b: 0.3 + t * 0.3, s: 0.3 + t * 1.0,
        };
    }

    // ── IMPACT ──
    if (state.phase === 'impact') {
        const t     = clamp01((performance.now() - state.impactTime) / IMPACT_DURATION);
        const ringR = t * (state.perfect ? 80 : 55);
        const flash = Math.max(0, 1.0 - t * 2.5);

        // Shockwave ring (5% of particles)
        if (i < COUNT * 0.05) {
            const angle  = (i / (COUNT * 0.05)) * Math.PI * 2;
            const wobble = Math.sin(angle * 12 + t * 30) * (2 + t * 4);
            const sz     = state.perfect ? 5.5 : 3.5;
            return {
                x: (ringR + wobble) * Math.cos(angle),
                y: (ringR + wobble) * Math.sin(angle) * 0.35,
                z: wobble * 0.3,
                r: 1.0, g: 1.0, b: 1.0, s: sz * (1.0 - t * 0.6),
            };
        }

        // Flash core (15% of particles)
        if (i < COUNT * 0.2) {
            const coreR = (2 + t * 18) * h3;
            return {
                x: coreR * Math.sin(phi) * Math.cos(theta),
                y: coreR * Math.sin(phi) * Math.sin(theta),
                z: coreR * Math.cos(phi),
                r: flash + 0.2, g: flash * 0.8, b: flash * 0.3,
                s: (2.0 + flash * 3.0) * (1.0 - t * 0.3),
            };
        }

        // Blasted outward particles
        const blastR = (5 + h3 * 55) * t + h3 * 4;
        return {
            x: blastR * Math.sin(phi) * Math.cos(theta),
            y: blastR * Math.sin(phi) * Math.sin(theta),
            z: blastR * Math.cos(phi),
            r: 0.15 * (1.0 - t * 0.5), g: 0.05, b: 0.2 * (1.0 - t * 0.3),
            s: 0.5 * (1.0 - t * 0.4),
        };
    }

    // ── SETTLE ──
    if (state.phase === 'settle') {
        if (i < COUNT * 0.1) {
            const r = h3 * 15;
            // Deterministic flicker per-particle using sin waves of varying freq
            const freq    = 2 + hash(i * 7) * 8;
            const phase   = hash(i * 13) * 100;
            const flicker = Math.sin(performance.now() * 0.01 * freq + phase) > 0.6 ? 2.5 : 0.4;
            return {
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi),
                r: 0.2 * flicker, g: 0.05 * flicker, b: 0.35 * flicker,
                s: 0.8 * flicker,
            };
        }
        return { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, s: 0 };
    }

    // idle fallback
    return { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, s: 0 };
}

export function updateRotation(pts) {
    if (state.phase === 'charge') {
        pts.rotation.z += 0.15;
    } else if (state.phase === 'impact') {
        pts.rotation.z += 0.02;
    } else {
        pts.rotation.y += 0.01;
    }
}
