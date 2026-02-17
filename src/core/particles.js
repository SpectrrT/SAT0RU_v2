/**
 * particles.js — BufferGeometry particle system with smooth lerp updates
 * and an impulse system for explosive effects (Black Flash).
 */
import * as THREE from 'three';
import { scene } from './renderer.js';

const MAX_COUNT = 20000;
let activeCount  = MAX_COUNT;

// ── Geometry buffers ──
const positions       = new Float32Array(MAX_COUNT * 3);
const colors          = new Float32Array(MAX_COUNT * 3);
const sizes           = new Float32Array(MAX_COUNT);
const targetPositions = new Float32Array(MAX_COUNT * 3);
const targetColors    = new Float32Array(MAX_COUNT * 3);
const targetSizes     = new Float32Array(MAX_COUNT);
const velocities      = new Float32Array(MAX_COUNT * 3);

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

const material = new THREE.PointsMaterial({
    size:         0.3,
    vertexColors: true,
    blending:     THREE.AdditiveBlending,
    transparent:  true,
    depthWrite:   false,
});

const points = new THREE.Points(geometry, material);
scene.add(points);

/**
 * Set the active particle count (inactive particles fade to size 0).
 */
function setActiveCount(count) {
    activeCount = Math.min(count, MAX_COUNT);
}

/**
 * Populate target arrays from a generator function.
 * @param {(i: number, count: number) => {x,y,z,r,g,b,s}} generateFn
 */
function setTargets(generateFn) {
    for (let i = 0; i < MAX_COUNT; i++) {
        if (i < activeCount) {
            const p = generateFn(i, activeCount);
            targetPositions[i * 3]     = p.x;
            targetPositions[i * 3 + 1] = p.y;
            targetPositions[i * 3 + 2] = p.z;
            targetColors[i * 3]        = p.r;
            targetColors[i * 3 + 1]    = p.g;
            targetColors[i * 3 + 2]    = p.b;
            targetSizes[i]             = p.s;
        } else {
            targetPositions[i * 3] = targetPositions[i * 3 + 1] = targetPositions[i * 3 + 2] = 0;
            targetColors[i * 3]    = targetColors[i * 3 + 1]    = targetColors[i * 3 + 2]    = 0;
            targetSizes[i] = 0;
        }
    }
}

/**
 * Apply a radial impulse (outward from center) to all particles.
 */
function applyImpulse(strength = 1.0) {
    for (let i = 0; i < MAX_COUNT; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        const dist = Math.sqrt(x * x + y * y + z * z) || 1;
        const s = strength * (0.5 + Math.random() * 0.5);
        velocities[i * 3]     += (x / dist) * s;
        velocities[i * 3 + 1] += (y / dist) * s;
        velocities[i * 3 + 2] += (z / dist) * s;
    }
}

/**
 * Per-frame lerp of positions, colors, sizes toward targets.
 * Also applies and decays velocity impulses.
 * @param {number} lerpFactor - interpolation speed (0-1)
 * @param {boolean} useVelocity - whether to apply velocity (for Black Flash only)
 */
function update(lerpFactor = 0.1, useVelocity = false) {
    for (let i = 0; i < MAX_COUNT * 3; i++) {
        if (useVelocity) {
            positions[i] += (targetPositions[i] - positions[i]) * lerpFactor + velocities[i];
            velocities[i] *= 0.91;
        } else {
            positions[i] += (targetPositions[i] - positions[i]) * lerpFactor;
        }
        colors[i] += (targetColors[i] - colors[i]) * lerpFactor;
    }
    for (let i = 0; i < MAX_COUNT; i++) {
        sizes[i] += (targetSizes[i] - sizes[i]) * lerpFactor;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate    = true;
    geometry.attributes.size.needsUpdate     = true;
}

/**
 * Clear all velocities (call when switching away from Black Flash).
 */
function clearVelocities() {
    for (let i = 0; i < MAX_COUNT * 3; i++) {
        velocities[i] = 0;
    }
}

/**
 * Access the Points mesh (for rotation, etc.).
 */
function getPoints() {
    return points;
}

function getMaxCount() {
    return MAX_COUNT;
}

export {
    points, geometry, positions, colors, sizes,
    targetPositions, targetColors, targetSizes, velocities,
    setActiveCount, setTargets, applyImpulse, update,
    clearVelocities, getPoints, getMaxCount,
};
