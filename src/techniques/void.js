/**
 * Domain Expansion: Infinite Void
 * Bright event-horizon ring + deep cosmos background.
 */

export const config = {
    name:           'void',
    displayName:    'Domain Expansion: Infinite Void',
    glowColor:      '#00ffff',
    bloomStrength:  2.0,
    shakeIntensity: 0.3,
    cameraDolly:    -1,
};

export function generate(i, COUNT) {
    if (i < COUNT * 0.15) {
        const angle = Math.random() * Math.PI * 2;
        return {
            x: 26 * Math.cos(angle),
            y: 26 * Math.sin(angle),
            z: (Math.random() - 0.5) * 1,
            r: 1, g: 1, b: 1, s: 2.5,
        };
    }
    const radius = 30 + Math.random() * 90;
    const theta  = Math.random() * Math.PI * 2;
    const phi    = Math.acos(2 * Math.random() - 1);
    return {
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        r: 0.1, g: 0.6, b: 1.0, s: 0.7,
    };
}

export function updateRotation(pts) {
    pts.rotation.y += 0.005;
}
