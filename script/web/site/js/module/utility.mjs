/**
 * @file utilities.mjs
 * @module utilities
 * @description Utility constants, functions, and classes
 */

/**
 * @constant
 * @type {undefined}
 * @description Undefined value
 */
const ø = undefined;
Object.defineProperty(window, 'ø', { value: ø });

/**
 * @constant
 * @type {null}
 * @description Null value
 */
const Ø = null;
Object.defineProperty(window, 'Ø', { value: Ø });

/**
 * @function
 * @param {*} value - Any value
 * @returns {boolean}
 * @description Check if value is undefined
 * @example
 * ø(undefined) // true
 * ø(null), ø(0), ø('') // false
 */
const fø = value => value === undefined;
Object.defineProperty(window, 'fø', { value: fø });

/**
 * @function
 * @param {*} value - Any value
 * @returns {boolean}
 * @description Check if value is null
 * @example
 * ø(null) // true
 * ø(undefined), ø(0), ø('') // false
 */
const fØ = value => value === null;
Object.defineProperty(window, 'fØ', { value: fØ });

/**
 * @function
 * @param {*} value - Any value
 * @returns {boolean}
 * @description Check if value is undefined or null
 * @example
 * Fø(undefined), Fø(null) // true
 * Fø(0), Fø('') // false
 */
const Fø = value => value === undefined || value === null;
Object.defineProperty(window, 'Fø', { value: Fø });

/**
 * @function
 * @param {*} value - Any value
 * @returns {boolean}
 * @description Check if value is null or undefined
 * @example
 * FØ(null), FØ(undefined) // true
 * FØ(0), FØ('') // false
 */
const FØ = value => value === null || value === undefined;
Object.defineProperty(window, 'FØ', { value: FØ });

export default true;