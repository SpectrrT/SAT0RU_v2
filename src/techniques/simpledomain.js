/**
 * Simple Domain — Defensive barrier technique
 * 
 * Shader-based ring barrier with animated glyphs, Fresnel rim glow,
 * and gentle particle convergence toward center.
 */

import * as THREE from 'three';
import { scene } from '../core/renderer.js';

export const config = {
    name:           'simpledomain',
    displayName:    'Simple Domain',
    glowColor:      '#88ddff',
    bloomStrength:  2.8,
    shakeIntensity: 0.1,
    cameraDolly:    0,
};

// ── Barrier meshes ──
let ring = null;
let sphere = null;

const RING_RADIUS = 30;
const SPHERE_RADIUS = 28;
const GROW_DURATION = 500;  // ms
const FADE_DURATION = 300;  // ms

const state = {
    phase:      'idle',   // idle | growing | active | fading
    startTime:  0,
    scale:      0,
};

// ── Shader code ──
const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    uniform float uTime;
    uniform float uOpacity;
    uniform vec3 uColor;
    
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    
    // Simple hash noise
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    void main() {
        // Fresnel rim glow
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.5);
        
        // Animated glyph-like noise
        vec2 scrollUv = vUv * 8.0 + vec2(uTime * 0.15, uTime * 0.08);
        float n1 = noise(scrollUv);
        float n2 = noise(scrollUv * 2.3 + vec2(uTime * 0.2, -uTime * 0.1));
        float glyphs = step(0.6, n1) * step(0.65, n2);
        
        // Distortion ripples
        float ripple = sin(vUv.x * 30.0 + uTime * 2.0) * 0.5 + 0.5;
        ripple *= sin(vUv.y * 25.0 - uTime * 1.5) * 0.5 + 0.5;
        
        // Combine
        float intensity = fresnel * 0.6 + glyphs * 0.3 + ripple * 0.1;
        vec3 color = uColor * (0.8 + intensity * 1.2);
        float alpha = (fresnel * 0.4 + glyphs * 0.5 + 0.2) * uOpacity;
        
        gl_FragColor = vec4(color, alpha);
    }
`;

// ── Initialization ──
function createBarrier() {
    if (ring) return;
    
    // Ring geometry
    const ringGeo = new THREE.RingGeometry(RING_RADIUS - 2, RING_RADIUS + 2, 64);
    const ringMat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0 },
            uColor: { value: new THREE.Color(0x88ddff) },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 3;  // Tilt slightly
    
    // Faint sphere shell
    const sphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
    const sphereMat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0 },
            uColor: { value: new THREE.Color(0x88ddff) },
        },
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
    });
    sphere = new THREE.Mesh(sphereGeo, sphereMat);
    
    scene.add(ring);
    scene.add(sphere);
}

// ── Public API ──
export function getState() { return state; }

export function activate() {
    createBarrier();
    state.phase = 'growing';
    state.startTime = performance.now();
    state.scale = 0;
}

export function deactivate() {
    if (state.phase === 'growing' || state.phase === 'active') {
        state.phase = 'fading';
        state.startTime = performance.now();
    }
}

export function reset() {
    state.phase = 'idle';
    state.scale = 0;
    if (ring) {
        ring.visible = false;
        sphere.visible = false;
    }
}

export function cleanup() {
    // Immediately hide meshes (called when switching away)
    if (ring) {
        ring.visible = false;
        sphere.visible = false;
    }
    state.phase = 'idle';
    state.scale = 0;
}

export function updatePhase() {
    if (!ring || state.phase === 'idle') return;
    
    const now = performance.now();
    const elapsed = now - state.startTime;
    
    if (state.phase === 'growing') {
        const t = Math.min(1, elapsed / GROW_DURATION);
        state.scale = t;
        
        if (t >= 1) {
            state.phase = 'active';
        }
    }
    
    if (state.phase === 'fading') {
        const t = Math.min(1, elapsed / FADE_DURATION);
        state.scale = 1 - t;
        
        if (t >= 1) {
            state.phase = 'idle';
            ring.visible = false;
            sphere.visible = false;
            return;
        }
    }
    
    // Update visuals only if not idle
    ring.visible = true;
    sphere.visible = true;
    
    ring.scale.set(state.scale, state.scale, state.scale);
    sphere.scale.set(state.scale, state.scale, state.scale);
    
    ring.material.uniforms.uTime.value = now * 0.001;
    ring.material.uniforms.uOpacity.value = state.scale * 0.7;
    
    sphere.material.uniforms.uTime.value = now * 0.001;
    sphere.material.uniforms.uOpacity.value = state.scale * 0.25;
}

// Hash for deterministic randomness
function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

export function generate(i, COUNT) {
    const h1 = hash(i);
    const h2 = hash(i + 1e5);
    const h3 = hash(i + 2e5);
    
    if (state.phase === 'idle') {
        // Minimal idle particles
        if (i < COUNT * 0.05) {
            const r = 15 + h1 * 10;
            const theta = h2 * Math.PI * 2;
            const phi = Math.acos(2 * h3 - 1);
            return {
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi),
                r: 0.1, g: 0.15, b: 0.2, s: 0.3,
            };
        }
        return { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, s: 0 };
    }
    
    // Active: particles in spherical volume with boundary emphasis
    const now = performance.now();
    const radius = 10 + h1 * 18;
    const theta = h2 * Math.PI * 2;
    const phi = Math.acos(2 * h3 - 1);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    // Distance from barrier
    const dist = Math.sqrt(x * x + y * y + z * z);
    const nearBoundary = Math.abs(dist - 25) < 5;
    
    // Boundary shimmer
    const shimmer = nearBoundary
        ? 1.5 + Math.sin(now * 0.003 + h1 * 10) * 0.5
        : 1.0;
    
    // Calm center pull
    const pull = 0.95 + h1 * 0.05;
    
    return {
        x: x * pull, y: y * pull, z: z * pull,
        r: 0.3 * shimmer, g: 0.5 * shimmer, b: 0.7 * shimmer,
        s: (nearBoundary ? 1.2 : 0.6) * shimmer * state.scale,
    };
}

export function updateRotation(pts) {
    // Slow rotation
    pts.rotation.y += 0.002;
}
