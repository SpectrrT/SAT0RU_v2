/**
 * main.js — Application bootstrap + animation loop.
 *
 * Wires together: renderer, particles, hand tracking, techniques, UI panel.
 * Manages the technique state machine including Black Flash's special lifecycle.
 */

import * as renderer     from './core/renderer.js';
import * as particles    from './core/particles.js';
import * as handTracking from './hand/hands.js';
import { setGlowColor }  from './hand/gestures.js';
import { techniques }    from './techniques/index.js';
import * as blackflash   from './techniques/blackflash.js';
import * as cleave       from './techniques/cleave.js';
import * as simpledomain from './techniques/simpledomain.js';
import { createPanel, settings } from './ui/panel.js';

// ── State ──
let currentTechnique = 'neutral';
let pendingTechnique = null;          // queued switch while BF impact plays
let bfImpulseApplied = false;         // one-shot impulse flag for BF impact

const flashOverlay = document.getElementById('flash-overlay');
const nameEl       = document.getElementById('technique-name');

// ── Apply a technique (targets + visuals) ──

function applyTechnique(name) {
    const tech = techniques[name];
    if (!tech) return;

    nameEl.innerText = tech.config.displayName;
    nameEl.style.color = tech.config.glowColor;
    nameEl.style.textShadow = `0 0 10px ${tech.config.glowColor}`;
    setGlowColor(tech.config.glowColor);

    // Black Flash, Cleave, and Simple Domain manage their own bloom/shake/targets dynamically
    if (name !== 'blackflash' && name !== 'cleave' && name !== 'simpledomain') {
        renderer.setBloom(tech.config.bloomStrength * settings.bloomMultiplier);
        renderer.setShake(tech.config.shakeIntensity * (settings.shakeEnabled ? 1 : 0));
        renderer.cameraDolly(tech.config.cameraDolly * settings.techniqueIntensity);

        particles.setActiveCount(settings.activeParticles);
        particles.setTargets(tech.generate);
        particles.clearVelocities(); // Clear any residual velocity from Black Flash
    }
}

// ── Gesture change handler ──

function onGestureChange(gesture) {
    if (gesture === currentTechnique) return;

    // If Black Flash is mid-impact, queue the switch
    if (currentTechnique === 'blackflash') {
        const phase = blackflash.getState().phase;
        if (phase === 'charge') {
            // Releasing during charge → trigger impact, queue next technique
            blackflash.deactivate();
            pendingTechnique = gesture;
            return;
        }
        if (phase === 'impact') {
            pendingTechnique = gesture;
            return;
        }
        // settle or idle — switch immediately
        blackflash.reset();
    }

    // If Cleave is active and gesture changes, reset it properly
    if (currentTechnique === 'cleave' && gesture !== 'cleave') {
        cleave.reset();
    }

    // If Simple Domain is active and gesture changes, immediately clean up
    if (currentTechnique === 'simpledomain' && gesture !== 'simpledomain') {
        simpledomain.cleanup();
    }

    currentTechnique = gesture;

    if (gesture === 'blackflash') {
        blackflash.activate();
        bfImpulseApplied = false;
        particles.clearVelocities(); // Start with clean slate
        // Set initial visual cues
        nameEl.innerText = 'Black Flash — CHARGING...';
        nameEl.style.color = '#ffffff';
        nameEl.style.textShadow = '0 0 15px #ffffff';
        nameEl.style.fontSize = '1.2rem';
        setGlowColor('#ffffff');
    }

    if (gesture === 'cleave') {
        cleave.activate();
        particles.clearVelocities(); // Start with clean slate
        nameEl.innerText = 'Cleave';
        nameEl.style.color = '#ff4444';
        nameEl.style.textShadow = '0 0 15px #ff4444';
        nameEl.style.fontSize = '1.2rem';
        setGlowColor('#ff4444');
        renderer.cameraDolly(-1 * settings.techniqueIntensity);
    }

    if (gesture === 'simpledomain') {
        simpledomain.activate();
        nameEl.innerText = 'Simple Domain';
        nameEl.style.color = '#88ddff';
        nameEl.style.textShadow = '0 0 15px #88ddff';
        nameEl.style.fontSize = '1.2rem';
        setGlowColor('#88ddff');
    }

    applyTechnique(gesture);
}

// ── Settings change callback ──

function onSettingsChange() {
    renderer.setShakeEnabled(settings.shakeEnabled);
    // Re-apply current technique with new settings
    if (currentTechnique !== 'blackflash' && currentTechnique !== 'cleave' && currentTechnique !== 'simpledomain') {
        applyTechnique(currentTechnique);
    }
}

// ── Animation loop ──

function animate() {
    requestAnimationFrame(animate);

    const tech = techniques[currentTechnique];

    // ── Black Flash special handling ──
    if (currentTechnique === 'blackflash') {
        blackflash.updatePhase();
        const bfState = blackflash.getState();

        // Show charge progress during charge phase
        if (bfState.phase === 'charge') {
            const elapsed = performance.now() - bfState.startTime;
            const inWindow = elapsed >= 200 && elapsed <= 600;
            const progress = Math.min(100, (elapsed / 800) * 100).toFixed(0);
            
            if (inWindow) {
                nameEl.innerText = `Black Flash — ✓ PERFECT WINDOW (${progress}%)`;
                nameEl.style.color = '#00ff00';
                nameEl.style.textShadow = '0 0 20px #00ff00';
            } else {
                nameEl.innerText = `Black Flash — CHARGING (${progress}%)`;
                nameEl.style.color = '#ffffff';
                nameEl.style.textShadow = '0 0 15px #ffffff';
            }
        }

        // Animated phases: re-generate targets every frame
        if (bfState.phase === 'charge' || bfState.phase === 'impact') {
            particles.setActiveCount(settings.activeParticles);
            particles.setTargets(blackflash.generate);
        }

        // Settle phase: also animate (flickering)
        if (bfState.phase === 'settle') {
            particles.setActiveCount(settings.activeParticles);
            particles.setTargets(blackflash.generate);
        }

        // One-shot impulse at impact start
        if (bfState.phase === 'impact' && !bfImpulseApplied) {
            bfImpulseApplied = true;
            particles.applyImpulse(bfState.perfect ? 4.5 : 2.0);
            renderer.setShake(bfState.perfect ? 1.8 : 0.9);

            // Fullscreen flash
            flashOverlay.style.opacity = bfState.perfect ? '0.9' : '0.5';
            setTimeout(() => { flashOverlay.style.opacity = '0'; }, 80);

            // Update display for perfect variant
            if (bfState.perfect) {
                nameEl.innerText = 'BLACK FLASH ▪ PERFECT';
                nameEl.style.fontSize = '1.5rem';
                nameEl.style.color = '#ffff00';
                nameEl.style.textShadow = '0 0 20px #ffff00, 0 0 40px #ffff00';
                // Reset after 2 seconds
                setTimeout(() => {
                    nameEl.style.fontSize = '1.2rem';
                }, 2000);
            } else {
                nameEl.innerText = 'BLACK FLASH';
            }
        }

        if (bfState.phase !== 'impact') {
            bfImpulseApplied = false;
        }

        // Dynamic bloom override
        const bloomOvr = blackflash.getBloomOverride();
        if (bloomOvr !== null) {
            renderer.bloomPass.strength = bloomOvr * settings.bloomMultiplier;
        }

        // Dynamic shake override
        const shakeOvr = blackflash.getShakeOverride();
        if (shakeOvr !== null && settings.shakeEnabled) {
            renderer.setShake(shakeOvr);
        }

        // Transition out of settle when a new gesture is queued
        if (bfState.phase === 'settle' && pendingTechnique) {
            currentTechnique = pendingTechnique;
            pendingTechnique = null;
            blackflash.reset();
            bfImpulseApplied = false;
            applyTechnique(currentTechnique);
        }

        // Also auto-transition if gesture changed during impact and impact is done
        if (bfState.phase === 'settle' && pendingTechnique === null) {
            // Stay in settle — waiting for next gesture change
        }
    }

    // ── Cleave special handling ──
    if (currentTechnique === 'cleave') {
        cleave.updatePhase();
        const cleaveState = cleave.getState();

        // Animated phases: re-generate targets every frame (continuous while active)
        if (cleaveState.phase === 'slicing' || cleaveState.phase === 'settle') {
            particles.setActiveCount(settings.activeParticles);
            particles.setTargets(cleave.generate);
        }

        // Apply plane-based impulses for active slices
        if (cleaveState.phase === 'slicing' || cleaveState.phase === 'settle') {
            const slices = cleave.getActiveSlices();
            for (const slice of slices) {
                particles.applyPlaneImpulse(
                    slice.center,
                    slice.normal,
                    slice.strength * settings.techniqueIntensity,
                    slice.width
                );
            }
        }

        // Dynamic bloom override
        const bloomOvr = cleave.getBloomOverride();
        if (bloomOvr !== null) {
            renderer.bloomPass.strength = bloomOvr * settings.bloomMultiplier;
        }

        // Shake bursts on slice activation
        if (cleave.shouldShake() && settings.shakeEnabled) {
            renderer.setShake(0.5 * settings.techniqueIntensity);
        }
    }

    // ── Simple Domain special handling ──
    if (currentTechnique === 'simpledomain') {
        simpledomain.updatePhase();
        const sdState = simpledomain.getState();

        // Animated phases: re-generate targets every frame
        if (sdState.phase !== 'idle') {
            particles.setActiveCount(settings.activeParticles);
            particles.setTargets(simpledomain.generate);
        }

        // Set bloom during active phase
        if (sdState.phase === 'growing' || sdState.phase === 'active') {
            renderer.bloomPass.strength = 2.8 * settings.bloomMultiplier;
        }
    } else {
        // Make absolutely sure Simple Domain visuals are hidden when not active
        simpledomain.cleanup();
    }

    // ── Continuous shake for all active techniques ──
    if (tech && currentTechnique !== 'neutral' && currentTechnique !== 'blackflash' && currentTechnique !== 'cleave' && currentTechnique !== 'simpledomain' && settings.shakeEnabled) {
        // Refresh shake every frame to keep it sustained (Black Flash handles its own shake dynamically)
        renderer.setShake(tech.config.shakeIntensity * settings.techniqueIntensity);
    }

    // ── Rotation ──
    if (tech) {
        tech.updateRotation(particles.getPoints());
    }

    // ── Particle interpolation ──
    const isBlackFlash = currentTechnique === 'blackflash';
    const isCleave = currentTechnique === 'cleave';
    const isSimpleDomain = currentTechnique === 'simpledomain';
    const isImpact = isBlackFlash && blackflash.getState().phase === 'impact';
    const lerpFactor = isImpact ? 0.2 : 0.1;
    particles.update(lerpFactor, isBlackFlash || isCleave); // Use velocity for Black Flash and Cleave

    // ── Renderer transitions + composite ──
    renderer.update();
    renderer.render();
}

// ── Bootstrap ──

createPanel(onSettingsChange);
applyTechnique('neutral');
handTracking.init(onGestureChange);
animate();
