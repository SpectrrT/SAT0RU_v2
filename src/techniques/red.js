/**
 * Cursed Technique Reversal: Red
 * Dense core + 3-arm spiral of repulsive energy.
 */

export const config = {
    name:           'red',
    displayName:    'Cursed Technique Reversal: Red',
    glowColor:      '#ff3333',
    bloomStrength:  2.5,
    shakeIntensity: 0.4,
    cameraDolly:    -2,
};

export function generate(i, COUNT) {
    if (i < COUNT * 0.1) {
        const r     = Math.random() * 9;
        const theta = Math.random() * 6.28;
        const phi   = Math.acos(2 * Math.random() - 1);
        return {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi),
            r: 3, g: 0.1, b: 0.1, s: 2.5,
        };
    }
    const armCount = 3;
    const t      = i / COUNT;
    const angle  = t * 15 + ((i % armCount) * (Math.PI * 2 / armCount));
    const radius = 2 + t * 40;
    return {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        z: (Math.random() - 0.5) * (10 * t),
        r: 0.8, g: 0, b: 0, s: 1.0,
    };
}

export function updateRotation(pts) {
    pts.rotation.z -= 0.1;
}
