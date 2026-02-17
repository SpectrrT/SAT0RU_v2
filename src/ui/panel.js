/**
 * panel.js — Desktop settings panel.
 * Exposes a reactive `settings` object that main.js reads each frame.
 */

export const settings = {
    bloomMultiplier:    1.0,
    activeParticles:    20000,
    techniqueIntensity: 1.0,
    shakeEnabled:       true,
    grainEnabled:       true,
};

let changeCallback = null;

/**
 * Build the panel DOM inside #control-panel.
 * @param {(s: typeof settings) => void} [onChange] — optional callback on any change
 */
export function createPanel(onChange) {
    changeCallback = onChange || null;

    const root = document.getElementById('control-panel');
    root.innerHTML = `
        <div class="panel-header">
            <span>SETTINGS</span>
            <button id="panel-toggle" title="Collapse">−</button>
        </div>
        <div class="panel-body" id="panel-body">
            <div class="control-group">
                <label>Bloom</label>
                <span id="bloom-val">1.0×</span>
                <input type="range" id="bloom-slider" min="0.2" max="3.0" step="0.1" value="1.0">
            </div>
            <div class="control-group">
                <label>Particles</label>
                <select id="quality-select">
                    <option value="5000">Low (5 K)</option>
                    <option value="10000">Medium (10 K)</option>
                    <option value="20000" selected>High (20 K)</option>
                </select>
            </div>
            <div class="control-group">
                <label>Intensity</label>
                <span id="intensity-val">1.0×</span>
                <input type="range" id="intensity-slider" min="0.5" max="2.0" step="0.1" value="1.0">
            </div>
            <div class="control-group">
                <label>Screen Shake</label>
                <input type="checkbox" id="shake-toggle" checked>
            </div>
            <div class="control-group">
                <label>Film Grain</label>
                <input type="checkbox" id="grain-toggle" checked>
            </div>
        </div>
    `;

    // Collapse / expand
    document.getElementById('panel-toggle').addEventListener('click', () => {
        const body = document.getElementById('panel-body');
        const btn  = document.getElementById('panel-toggle');
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : 'block';
        btn.textContent    = open ? '+' : '−';
    });

    // Bloom multiplier
    document.getElementById('bloom-slider').addEventListener('input', (e) => {
        settings.bloomMultiplier = parseFloat(e.target.value);
        document.getElementById('bloom-val').textContent = settings.bloomMultiplier.toFixed(1) + '×';
        notify();
    });

    // Particle quality
    document.getElementById('quality-select').addEventListener('change', (e) => {
        settings.activeParticles = parseInt(e.target.value, 10);
        notify();
    });

    // Technique intensity
    document.getElementById('intensity-slider').addEventListener('input', (e) => {
        settings.techniqueIntensity = parseFloat(e.target.value);
        document.getElementById('intensity-val').textContent = settings.techniqueIntensity.toFixed(1) + '×';
        notify();
    });

    // Screen shake
    document.getElementById('shake-toggle').addEventListener('change', (e) => {
        settings.shakeEnabled = e.target.checked;
        notify();
    });

    // Film grain
    document.getElementById('grain-toggle').addEventListener('change', (e) => {
        settings.grainEnabled = e.target.checked;
        document.getElementById('grain').style.display = e.target.checked ? 'block' : 'none';
        notify();
    });
}

function notify() {
    if (changeCallback) changeCallback(settings);
}
