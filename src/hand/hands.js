/**
 * hands.js — MediaPipe Hands initialization, camera feed loop,
 * and overlay landmark drawing on the preview canvas.
 */

import { detectGesture, getGlowColor } from './gestures.js';

let gestureCallback = null;
let currentGesture  = 'neutral';

/**
 * Initialize MediaPipe Hands + Camera utils.
 * @param {(gesture: string) => void} onGestureChange — called when gesture changes
 */
function init(onGestureChange) {
    gestureCallback = onGestureChange;

    const videoEl  = document.querySelector('.input_video');
    const canvasEl = document.getElementById('output_canvas');
    const ctx      = canvasEl.getContext('2d');

    // MediaPipe Hands (loaded as global from CDN)
    const hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
        maxNumHands:           2,
        modelComplexity:       1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence:  0.5,
    });

    hands.onResults((results) => {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

        // Draw landmarks
        if (results.multiHandLandmarks) {
            const color = getGlowColor();
            for (const lm of results.multiHandLandmarks) {
                window.drawConnectors(ctx, lm, window.HAND_CONNECTIONS, { color, lineWidth: 5 });
                window.drawLandmarks(ctx, lm, { color: '#fff', lineWidth: 1, radius: 2 });
            }
        }

        // Detect gesture (debounced + cooldown)
        const gesture = detectGesture(results.multiHandLandmarks);
        if (gesture !== currentGesture) {
            currentGesture = gesture;
            if (gestureCallback) gestureCallback(gesture);
        }
    });

    // Camera feed
    const cam = new window.Camera(videoEl, {
        onFrame: async () => {
            canvasEl.width  = videoEl.videoWidth;
            canvasEl.height = videoEl.videoHeight;
            await hands.send({ image: videoEl });
        },
        width:  640,
        height: 480,
    });
    cam.start();
}

function getCurrentGesture() {
    return currentGesture;
}

export { init, getCurrentGesture };
