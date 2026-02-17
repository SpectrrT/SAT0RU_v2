/**
 * Neutral / idle state — sparse ambient particles drifting slowly.
 */

export const config = {
    name:           'neutral',
    displayName:    'Cursed Energy',
    glowColor:      '#00ffff',
    bloomStrength:  1.0,
    shakeIntensity: 0,
    cameraDolly:    0,
};

export function generate(i, COUNT) {
    if (i < COUNT * 0.05) {
        const r  = 15 + Math.random() * 20;
        const t  = Math.random() * 6.28;
        const ph = Math.random() * 3.14;
        return {
            x: r * Math.sin(ph) * Math.cos(t),
            y: r * Math.sin(ph) * Math.sin(t),
            z: r * Math.cos(ph),
            r: 0.1, g: 0.1, b: 0.2, s: 0.4,
        };
    }
    return { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, s: 0 };
}

export function updateRotation(pts) {
    pts.rotation.y += 0.005;
}
