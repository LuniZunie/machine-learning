/*
  Copyright 2024 Cedric Hotopp

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

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