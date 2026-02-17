/**
 * Secret Technique: Hollow Purple
 * Chaotic singularity — dense sphere + scattered debris.
 */

export const config = {
    name:           'purple',
    displayName:    'Secret Technique: Hollow Purple',
    glowColor:      '#bb00ff',
    bloomStrength:  4.0,
    shakeIntensity: 0.5,
    cameraDolly:    -3,
};

export function generate(i, COUNT) {
    if (Math.random() > 0.8) {
        return {
            x: (Math.random() - 0.5) * 100,
            y: (Math.random() - 0.5) * 100,
            z: (Math.random() - 0.5) * 100,
            r: 0.5, g: 0.5, b: 0.7, s: 0.8,
        };
    }
    const R     = 20;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    return {
        x: R * Math.sin(phi) * Math.cos(theta),
        y: R * Math.sin(phi) * Math.sin(theta),
        z: R * Math.cos(phi),
        r: 0.6, g: 0.5, b: 1.0, s: 2.5,
    };
}

export function updateRotation(pts) {
    pts.rotation.z += 0.2;
    pts.rotation.y += 0.05;
}
