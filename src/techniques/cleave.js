/**
 * Cleave / Dismantle — Sukuna's slashing technique
 * 
 * Continuous blade planes sweep through the particle volume while gesture is held.
 * Each slice lasts ~600ms, new slices spawn every 400ms.
 * 
 * Animation phases:
 *   IDLE → SLICING (continuous while active) → SETTLE (when gesture released)
 */

export const config = {
    name:           'cleave',
    displayName:    'Cleave',
    glowColor:      '#ff4444',
    bloomStrength:  2.2,
    shakeIntensity: 0.5,
    cameraDolly:    -1,
};

// ── State machine ──
const SLICE_INTERVAL  = 400;  // ms — time between spawning new slices
const SLICE_LIFETIME  = 600;  // ms — how long each slice stays active
const SETTLE_DURATION = 800;  // ms — aftermath settling time

const state = {
    phase:          'idle',   // idle | slicing | settle
    startTime:      0,
    lastSliceTime:  0,
    slices:         [],       // active slice data
    sliceCount:     0,        // total slices spawned this session
};

// Deterministic hash
function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

function normalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / len, v[1] / len, v[2] / len];
}

// Generate a random blade plane (deterministic based on seed)
function generateBlade(seed) {
    const h1 = hash(seed);
    const h2 = hash(seed + 1000);
    const h3 = hash(seed + 2000);
    const h4 = hash(seed + 3000);
    const h5 = hash(seed + 4000);
    
    return {
        center: [
            (h1 - 0.5) * 40,
            (h2 - 0.5) * 40,
            (h3 - 0.5) * 40,
        ],
        normal: normalize([
            h4 - 0.5,
            h5 - 0.5,
            hash(seed + 5000) - 0.5,
        ]),
        width: 50 + h1 * 15,
    };
}

// ── Public API ──

export function getState() { return state; }

export function activate() {
    if (state.phase === 'idle') {
        state.phase         = 'slicing';
        state.startTime     = performance.now();
        state.lastSliceTime = 0;
        state.slices        = [];
        state.sliceCount    = 0;
    }
}

export function deactivate() {
    if (state.phase === 'slicing') {
        state.phase     = 'settle';
        state.startTime = performance.now();
    }
}

export function reset() {
    state.phase      = 'idle';
    state.slices     = [];
    state.sliceCount = 0;
}

/**
 * Per-frame phase update - spawn new slices continuously
 */
export function updatePhase() {
    const now = performance.now();
    
    if (state.phase === 'slicing') {
        const elapsed = now - state.startTime;
        
        // Spawn new slice every SLICE_INTERVAL ms
        if (elapsed - state.lastSliceTime >= SLICE_INTERVAL) {
            const blade = generateBlade(state.sliceCount);
            state.slices.push({
                blade,
                startTime: now,
                id: state.sliceCount,
            });
            state.lastSliceTime = elapsed;
            state.sliceCount++;
        }
        
        // Remove expired slices
        state.slices = state.slices.filter(s => {
            const age = now - s.startTime;
            return age < SLICE_LIFETIME;
        });
    }
    
    if (state.phase === 'settle') {
        const elapsed = now - state.startTime;
        
        // Remove old slices during settle
        state.slices = state.slices.filter(s => {
            const age = now - s.startTime;
            return age < SLICE_LIFETIME;
        });
        
        // Stay in settle until gesture changes
    }
}

/**
 * Get active slice data for impulse application
 */
export function getActiveSlices() {
    const now = performance.now();
    return state.slices.map(s => {
        const age = now - s.startTime;
        const t = clamp01(age / SLICE_LIFETIME);
        return {
            center: s.blade.center,
            normal: normalize(s.blade.normal),
            width:  s.blade.width,
            strength: (1.0 - t * t) * 3.5,  // decay strength
            age: t,
        };
    });
}

/**
 * Dynamic bloom override
 */
export function getBloomOverride() {
    if (state.phase === 'slicing' || state.phase === 'settle') {
        // Pulse bloom on each slice
        let maxBurst = 0;
        const now = performance.now();
        for (const s of state.slices) {
            const age = (now - s.startTime) / SLICE_LIFETIME;
            const burst = Math.max(0, 1.0 - age * 2) * 1.2;
            maxBurst = Math.max(maxBurst, burst);
        }
        return 2.2 + maxBurst;
    }
    return null;
}

/**
 * Trigger camera shake on new slices
 */
export function shouldShake() {
    const now = performance.now();
    for (const s of state.slices) {
        const age = now - s.startTime;
        if (age < 50) return true;  // shake on slice activation
    }
    return false;
}

/**
 * Particle generation (per-frame, deterministic)
 */
export function generate(i, COUNT) {
    const h1 = hash(i);
    const h2 = hash(i + 1e5);
    const h3 = hash(i + 2e5);
    
    // Base particle position in a volume
    const baseX = (h1 - 0.5) * 50;
    const baseY = (h2 - 0.5) * 50;
    const baseZ = (h3 - 0.5) * 50;
    
    // Default state: ambient volume
    if (state.phase === 'idle') {
        const inVolume = i < COUNT * 0.15;
        if (inVolume) {
            return {
                x: baseX, y: baseY, z: baseZ,
                r: 0.2, g: 0.05, b: 0.05, s: 0.5,
            };
        }
        return { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, s: 0 };
    }
    
    // Slicing or settle: check if particle is a "scar" particle
    const now = performance.now();
    let isScar = false;
    let scarBrightness = 0;
    
    for (const s of state.slices) {
        const blade = s.blade;
        const age = (now - s.startTime) / SLICE_LIFETIME;
        
        // Check if particle is near this slice plane
        const dx = baseX - blade.center[0];
        const dy = baseY - blade.center[1];
        const dz = baseZ - blade.center[2];
        
        const normal = normalize(blade.normal);
        const dist = Math.abs(dx * normal[0] + dy * normal[1] + dz * normal[2]);
        
        // Scar particles are within 2 units of the plane
        if (dist < 2 && hash(i * 7 + s.id) < 0.05) {
            isScar = true;
            scarBrightness = Math.max(scarBrightness, (1.0 - age) * 3.0);
        }
    }
    
    // Render scarred particles as bright white/cyan
    if (isScar && scarBrightness > 0.1) {
        return {
            x: baseX, y: baseY, z: baseZ,
            r: 1.0, g: 0.95, b: 0.9, s: 2.0 * scarBrightness,
        };
    }
    
    // Normal volume particles
    const inVolume = i < COUNT * 0.2;
    if (inVolume) {
        const brightness = state.phase === 'slicing' ? 0.3 : 0.2;
        return {
            x: baseX, y: baseY, z: baseZ,
            r: brightness, g: brightness * 0.3, b: brightness * 0.3, s: 0.5,
        };
    }
    
    return { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, s: 0 };
}

export function updateRotation(pts) {
    // Slow ambient rotation
    pts.rotation.y += 0.003;
}
