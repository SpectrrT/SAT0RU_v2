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
 * Apply a plane-based impulse (push particles away from a slicing plane).
 * @param {Array} center - [x, y, z] center of the plane
 * @param {Array} normal - [nx, ny, nz] normalized plane normal
 * @param {number} strength - impulse strength
 * @param {number} width - affected radius perpendicular to normal
 */
function applyPlaneImpulse(center, normal, strength, width) {
    const [cx, cy, cz] = center;
    const [nx, ny, nz] = normal;
    
    for (let i = 0; i < MAX_COUNT; i++) {
        const px = positions[i * 3];
        const py = positions[i * 3 + 1];
        const pz = positions[i * 3 + 2];
        
        // Vector from center to particle
        const dx = px - cx;
        const dy = py - cy;
        const dz = pz - cz;
        
        // Distance to plane (signed)
        const dist = dx * nx + dy * ny + dz * nz;
        
        // Distance perpendicular to normal (in-plane distance)
        const perpX = dx - dist * nx;
        const perpY = dy - dist * ny;
        const perpZ = dz - dist * nz;
        const perpDist = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);
        
        // Only affect particles within the blade width
        if (perpDist < width) {
            // Falloff based on distance from plane
            const falloff = Math.max(0, 1.0 - Math.abs(dist) / 15);
            const widthFalloff = Math.max(0, 1.0 - perpDist / width);
            const totalFalloff = falloff * widthFalloff;
            
            if (totalFalloff > 0.01) {
                // Push particles perpendicular to the plane (away from slice)
                const pushDir = dist > 0 ? 1 : -1;
                const s = strength * totalFalloff * pushDir * (0.8 + Math.random() * 0.4);
                
                velocities[i * 3]     += nx * s;
                velocities[i * 3 + 1] += ny * s;
                velocities[i * 3 + 2] += nz * s;
            }
        }
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
    setActiveCount, setTargets, applyImpulse, applyPlaneImpulse, update,
    clearVelocities, getPoints, getMaxCount,
};
