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
 * @file math.mjs
 * @module math
 * @description Math functions
 */

/**
 * @constant
 * @name gamma
 * @type {number}
 * @description Euler-Mascheroni constant
 */
const γ = 0.57721566490153286060651209008240243104215933593992; // gamma — Euler-Mascheroni constant
Object.defineProperty(window, 'γ', { value: γ });

/**
 * @function
 * @name GAMMA
 * @param {number|BigInt} number - Positive integer
 * @returns {number|BigInt}
 * @description Factorial function (n!)
 * @example
 * Γ(5) // 120 = 1 * 2 * 3 * 4 * 5 = 5!
 * Γ(5n) // 120n = 1n * 2n * 3n * 4n * 5n = 5n!
 */
const Γ = number => { // GAMMA — factorial
  const type = typeof number;

  try {
    number = BigInt(number);
  } catch { return NaN; }
  if (number < 0n) return NaN;
  if (number < 2n) return type === 'bigint' ? 1n : 1;

  let p = 1n;
  for (let i = 2n; i <= number; i++) p *= i;

  return type === 'bigint' ? p : Number(p);
};
Object.defineProperty(window, 'Γ', { value: Γ });

/**
 * @function
 * @name DELTA
 * @this {string} - Key for object
 * @param {number|object} a - Number a or object a
 * @param {number} b - Number b
 * @returns {number}
 * @description If b is undefined, returns the difference of the array of numbers or objects. Otherwise, returns the difference of the numbers or objects a and b.
 * @example
 * Δ(5, 3) // 2 = 5 - 3
 * Δ(3, 5) // -2 = 3 - 5
 * Δ.call('a', { a: 5 }, { a: 3 }) // 2 = 5 - 3
 * Δ.call('a', [{ a: 5 }, { a: 3 }]) // 2 = 5 - 3
 * Δ([ 1, 2 ]) // -1 = 1 - 2
 */
const Δ = (function(a, b) { // delta — difference
  if (b === undefined) {
    if (this === undefined) return a.reduce((a, b) => a - b);
    else {
      let d = a[0]?.[this];
      for (let i = 1; i < a.length; i++) d -= a[i]?.[this];

      return d;
    }
  } else
    return this === undefined ?
      a - b :
      a?.[this] - b?.[this];
});
Object.defineProperty(window, 'Δ', { value: Δ });

/**
 * @function
 * @name iDELTA
 * @this {string} - Key for object
 * @param {number|object} a - Number a or object a
 * @param {number} b - Number b
 * @returns {number}
 * @description If b is undefined, returns the difference of the array of numbers or objects. Otherwise, returns the difference of the numbers or objects b and a.
 * @example
 * iΔ(5, 3) // -2 = 3 - 5
 * iΔ(3, 5) // 2 = 5 - 3
 * iΔ.call('a', { a: 5 }, { a: 3 }) // 2 = 3 - 5
 * iΔ.call('a', [{ a: 5 }, { a: 3 }]) // 2 = 3 - 5
 * iΔ([ 1, 2 ]) // 1 = 2 - 1
 */
const iΔ = (function(a, b) { // iDELTA — inverse delta
  if (b === undefined) {
    if (this === undefined) return a.reduce((a, b) => b - a, 0);
    else {
      let d = a[0]?.[this];
      for (let i = 1; i < a.length; i++) d = a[i]?.[this] - d;

      return d;
    }
  } else
    return this === undefined ?
      b - a :
      b?.[this] - a?.[this];
});
Object.defineProperty(window, 'iΔ', { value: iΔ });

/**
 * @function
 * @name MU
 * @param {number[]} numbers - Array of numbers
 * @returns {number}
 * @description Mean function
 * @example
 * Μ([1, 2, 3, 4, 5]) // 3 = (1 + 2 + 3 + 4 + 5) / 5
 */
const Μ = numbers => Σ(numbers) / numbers.length; // MU — mean
Object.defineProperty(window, 'Μ', { value: Μ });

/**
 * @function
 * @name XI
 * @param {number=} [a=1] - Minimum value (inclusive) – Maximum value (exclusive) when b is defined
 * @param {number=} b - Maximum value (exclusive)
 * @returns {number}
 * @description Random number generator
 * @example
 * Ξ(1, 10) // Random number 1 ≤ x < 10
 * Ξ(5) // Random number 0 ≤ x < 5
 * Ξ() // Random number 0 ≤ x < 1
 */
const Ξ = (a = 1, b) => b === undefined ? Math.random() * a : Math.random() * (b - a) + a; // XI — random number
Object.defineProperty(window, 'Ξ', { value: Ξ });

/**
 * @function
 * @name XIsign
 * @param {number=} [a=1] - Positive number
 * @param {number=} b - Positive number
 * @returns {number}
 * @description Random number generator with sign
 * @example
 * Ξsign(1, 10) // Random number -10 < x ≤ -1 or 1 ≤ x < 10
 * Ξsign(5) // Random number -5, 5
 * Ξsign() // Random number -1, 1
 */
const Ξsign = (a = 1, b) => { // XI — random number with sign
  if (b === undefined) return Math.random() < 0.5 ? -a : a;

  return Math.random() < 0.5 ?
    -(Math.random() * (b - a) + a) :
    (Math.random() * (b - a) + a);
};
Object.defineProperty(window, 'Ξsign', { value: Ξsign });

/**
 * @function
 * @name XIint
 * @param {number} a - Minimum value (inclusive) – Maximum value (exclusive) when b is defined
 * @param {number} b - Maximum value (exclusive)
 * @returns {number}
 * @description Random integer generator
 * @example
 * Ξℤ(1, 10) // Random integer 1 ≤ x < 10
 * Ξℤ(5) // Random integer 0 ≤ x < 5
 * Ξℤ() // 0
 * Ξℤ(1.5, 10.5) // Random integer 1 ≤ x < 10
 */
const Ξℤ = (a, b) => Ξ(a, b) | 0; // XIint — random integer
Object.defineProperty(window, 'Ξℤ', { value: Ξℤ });

/**
 * @function
 * @name XIif
 * @param {number} [number=0.5] - Probability (0 ≤ x ≤ 1)
 * @returns {boolean}
 * @description Random boolean generator
 * @example
 * Ξ(0.4) // 40% probability of true
 * Ξ() // 50% probability of true
 */
const Ξif = (number = 0.5) => Math.random() < number; // XIif — random boolean
Object.defineProperty(window, 'Ξif', { value: Ξif });

/**
 * @constant
 * @name pi
 * @type {number}
 * @description Pi constant
 */
const π = Math.PI; // pi — Pi constant
Object.defineProperty(window, 'π', { value: π });

/**
 * @function
 * @name PI
 * @this {string} - Key for object
 * @param {number|object} a - Number a or object a
 * @param {number} b - Number b
 * @returns {number}
 * @description If b is undefined, returns the product of the array of numbers or objects. Otherwise, returns the product of the numbers or objects a and b.
 * @example
 * Π(5, 3) // 15 = 5 * 3
 * Π(3, 5) // 15 = 3 * 5
 * Π.call('a', { a: 5 }, { a: 3 }) // 15 = 5 * 3
 * Π.call('a', [{ a: 5 }, { a: 3 }]) // 15 = 5 * 3
 * Π([ 1, 2 ]) // 2 = 1 * 2
 */
const Π = (function(a, b) { // PI — product
  if (b === undefined)
    return this === undefined ?
      a.reduce((a, b) => a * b) :
      a.reduce((a, b) => a * b?.[this], 1);
  else
    return this === undefined ?
      a * b :
      a?.[this] * b?.[this];
});
Object.defineProperty(window, 'Π', { value: Π });

/**
 * @function
 * @name SIGMA
 * @this {string} - Key for object
 * @param {number|object} a - Number a or object a
 * @param {number} b - Number b
 * @returns {number}
 * @description If b is undefined, returns the sum of the array of numbers or objects. Otherwise, returns the sum of the numbers or objects a and b.
 * @example
 * Σ(5, 3) // 8 = 5 + 3
 * Σ(3, 5) // 8 = 3 + 5
 * Σ.call('a', { a: 5 }, { a: 3 }) // 8 = 5 + 3
 * Σ.call('a', [{ a: 5 }, { a: 3 }]) // 8 = 5 + 3
 * Σ([ 1, 2 ]) // 3 = 1 + 2
 */
const Σ = (function(a, b) { // SIGMA — sum
  if (b === undefined)
    return this === undefined ?
      a.reduce((a, b) => a + b, 0) :
      a.reduce((a, b) => a + b?.[this], 0);
  else
    return this === undefined ?
      a + b :
      a?.[this] + b?.[this];
});
Object.defineProperty(window, 'Σ', { value: Σ });

/**
 * @constant
 * @name phi
 * @type {number}
 * @description Golden ratio
 */
const φ = 1.61803398874989484820458683436563811772030917980576286213544862270526046281890244970720720418939113748475; // phi — golden ratio
Object.defineProperty(window, 'φ', { value: φ });

/**
 * @constant
 * @name psi
 * @type {number}
 * @description Super golden ratio
 */
const ψ = 1.46557123187676802665673122521993910802557756847228570164318311124926299668501784047812580119490927006438; // psi — super golden ratio
Object.defineProperty(window, 'ψ', { value: ψ });

/**
 * @constant
 * @name omega
 * @type {number}
 * @description Omega constant
 */
const ω = 0.567143290409783872999968662210355549753815787186512508135131079223045793086684566693219446961752294557638; // omega — Omega constant
Object.defineProperty(window, 'ω', { value: ω });

/**
 * @function
 * @param {number[]} weights - Array of weights
 * @returns {number}
 * @description Returns number based on weights (higher weight = higher probability)
 * @example
 * Math.wΞ([ 1, 9 ]) // returns 0 with 10% probability and 1 with 90% probability
 */
Math.wΞ = function(weights) { // weighted random
  const σ = Σ(weights);
  let ξ = Ξ(σ);

  let i = 0;
  for (let w of weights) {
    w = +w;
    if (ξ < w) return i;
    ξ -= w;
    i++;
  }
}

/**
 * @function
 * @param {number[]} weights - Array of weights
 * @returns {number}
 * @description Returns number based on weights (lower weight = higher probability)
 * @example
 * Math.iwΞ([ 1, 9 ]) // returns 0 with 90% probability and 1 with 10% probability
 */
Math.iwΞ = function(weights) { // inverted weighted random
  const σ = Σ(weights);
  let ξ = Ξ(σ);

  let i = 0;
  for (let w of weights) {
    w = σ - w;
    if (ξ < +w) return i;
    ξ -= +w;
    i++;
  }

  return weights.length - 1;
}

export default true;