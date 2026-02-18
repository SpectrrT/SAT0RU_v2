/**
 * Technique registry — maps gesture name to technique module.
 * Each module exports { config, generate, updateRotation }.
 */

import * as neutral      from './neutral.js';
import * as red          from './red.js';
import * as purple       from './purple.js';
import * as voidTech     from './void.js';
import * as shrine       from './shrine.js';
import * as blackflash   from './blackflash.js';
import * as cleave       from './cleave.js';
import * as simpledomain from './simpledomain.js';

export const techniques = {
    neutral,
    red,
    purple,
    void:       voidTech,
    shrine,
    blackflash,
    cleave,
    simpledomain,
};
