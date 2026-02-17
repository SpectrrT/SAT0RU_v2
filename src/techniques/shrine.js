/**
 * Domain Expansion: Malevolent Shrine
 * Blood floor + four pillars + domed roof.
 */

export const config = {
    name:           'shrine',
    displayName:    'Domain Expansion: Malevolent Shrine',
    glowColor:      '#ff0000',
    bloomStrength:  2.5,
    shakeIntensity: 1.3,
    cameraDolly:    -2,
};

// Deterministic hash for stable randomness
function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

export function generate(i, COUNT) {
    const h1 = hash(i);
    const h2 = hash(i + 1e5);
    const h3 = hash(i + 2e5);
    
    // Floor layer (red mist)
    if (i < COUNT * 0.3) {
        return {
            x: (h1 - 0.5) * 80,
            y: -15,
            z: (h2 - 0.5) * 80,
            r: 0.4, g: 0, b: 0, s: 0.8,
        };
    }
    // Four pillars
    if (i < COUNT * 0.4) {
        const px = ((i % 4) < 2 ? 1 : -1) * 12;
        const pz = ((i % 4) % 2 === 0 ? 1 : -1) * 8;
        return {
            x: px + (h1 - 0.5) * 2,
            y: -15 + h2 * 30,
            z: pz + (h3 - 0.5) * 2,
            r: 0.2, g: 0.2, b: 0.2, s: 0.6,
        };
    }
    // Dome / roof
    if (i < COUNT * 0.6) {
        const t     = h1 * Math.PI * 2;
        const rad   = h2 * 30;
        const curve = Math.pow(rad / 30, 2) * 10;
        return {
            x: rad * Math.cos(t),
            y: 15 - curve + h3 * 2,
            z: rad * Math.sin(t) * 0.6,
            r: 0.6, g: 0, b: 0, s: 0.6,
        };
    }
    return { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, s: 0 };
}

export function updateRotation(pts) {
    // Lock rotation completely — shrine is static, menace comes from screen shake
    pts.rotation.set(0, 0, 0);
}
