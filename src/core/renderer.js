/**
 * renderer.js — Scene, camera, WebGLRenderer, EffectComposer, bloom.
 * Also manages cinematic transition effects: bloom ramp, camera dolly, screen shake.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ── Scene ──
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.z = 55;

// ── WebGL Renderer ──
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ── Post-processing ──
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    1.5,   // strength
    0.4,   // radius
    0.85   // threshold
);
composer.addPass(bloomPass);

// ── Transition state ──
const BASE_CAM_Z = 55;
let bloomTarget    = 1.5;
let cameraZTarget  = BASE_CAM_Z;
let shakeEnergy    = 0;
let shakeIntensity = 0;
let shakeEnabled   = true;

/**
 * Set target bloom with an optional cinematic overshoot.
 */
function setBloom(target, overshoot = true) {
    bloomTarget = target;
    if (overshoot) {
        bloomPass.strength = Math.min(target * 1.6, 10);
    }
}

/**
 * Trigger decaying screen shake.
 */
function setShake(intensity) {
    shakeIntensity = intensity;
    shakeEnergy    = 1.0;
}

/**
 * Briefly push the camera along Z for a dolly effect, then spring back.
 */
function cameraDolly(deltaZ) {
    cameraZTarget = BASE_CAM_Z + deltaZ;
}

/**
 * Enable / disable shake (called by UI panel).
 */
function setShakeEnabled(enabled) {
    shakeEnabled = enabled;
    if (!enabled) {
        renderer.domElement.style.transform = 'translate(0,0)';
    }
}

/**
 * Per-frame update of all transition effects.
 */
function update() {
    // Bloom lerp toward target
    bloomPass.strength += (bloomTarget - bloomPass.strength) * 0.06;

    // Camera dolly lerp + spring back to base
    camera.position.z += (cameraZTarget - camera.position.z) * 0.04;
    cameraZTarget     += (BASE_CAM_Z - cameraZTarget) * 0.025;

    // Screen shake with exponential decay
    if (shakeEnabled && shakeEnergy > 0.005) {
        const mag = shakeEnergy * shakeIntensity * 40;
        renderer.domElement.style.transform =
            `translate(${(Math.random() - 0.5) * mag}px, ${(Math.random() - 0.5) * mag}px)`;
        shakeEnergy *= 0.92;
    } else {
        renderer.domElement.style.transform = 'translate(0,0)';
        shakeEnergy = 0;
    }
}

/**
 * Render one frame through the EffectComposer.
 */
function render() {
    composer.render();
}

// ── Resize handler ──
window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
});

export {
    scene, camera, renderer, composer, bloomPass,
    setBloom, setShake, cameraDolly, setShakeEnabled,
    update, render,
};
