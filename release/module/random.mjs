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

import Rejection from './debug.mjs';

function $(o) {
  return Object.defineProperties({}, o);
}

// random
const Ξ = $({
  ℝ: {
    value: $({ // random float
      ii: { // non-crypto inclusive-inclusive [min, max]
        value: (min = 0, max = 1) => Math.random()  * (1 + Number.EPSILON) * (max - min) + min,
      },
      aii: { // advanced non-crypto inclusive-inclusive [min, max]
        value(min = 0, max = 1, digits) {
          const ξ = Math.random() * (max - min) + min;
          return digits === undefined ? ξ : parseFloat(ξ.toFixed(digits));
        }
      },

      ei: { // non-crypto exclusive-inclusive (min, max]
        value: (min = 0, max = 1) => (1 - Math.random()) * (max - min) + min,
      },
      aei: { // advanced non-crypto exclusive-inclusive (min, max]
        value(min = 0, max = 1, digits) {
          const ξ = (1 - Math.random()) * (max - min) + min;
          return digits === undefined ? ξ : parseFloat(ξ.toFixed(digits));
        }
      },

      ie: { // non-crypto inclusive-exclusive [min, max)
        value: (min = 0, max = 1) => Math.random() * (max - min) + min,
      },
      aie: { // advanced non-crypto inclusive-exclusive [min, max)
        value(min = 0, max = 1, digits) {
          const ξ = Math.random() * (max - min) + min;
          return digits === undefined ? ξ : parseFloat(ξ.toFixed(digits));
        }
      },

      ee: { // non-crypto exclusive-exclusive (min, max)
        value: (min = 0, max = 1) => Math.random() * (1 - Number.EPSILON) * (max - min) + min + Number.EPSILON,
      },
      aee: { // advanced non-crypto exclusive-exclusive (min, max)
        value(min = 0, max = 1, digits) {
          const ξ = Math.random() * (1 - Number.EPSILON) * (max - min) + min + Number.EPSILON;
          return digits === undefined ? ξ : parseFloat(ξ.toFixed(digits));
        }
      },

      II: { // crypto inclusive-inclusive [min, max]
        value: (min = 0, max = 1) => crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF * (max - min) + min,
      },
      aII: { // advanced crypto [min, max] (inclusive-inclusive)
        value(min = 0, max = 1, bits = 32, digits) {
          let ξ;
          if (bits === 32)
            ξ = crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF * (max - min) + min;
          else if (bits === 16)
            ξ = crypto.getRandomValues(new Uint16Array(1))[0] / 0xFFFF * (max - min) + min;
          else if (bits === 8)
            ξ = crypto.getRandomValues(new Uint8Array(1))[0] / 0xFF * (max - min) + min;
          else new Rejection('Could not call Ξ.ℝ.aII()', 'min', min, 'max', max, 'bits', bits, 'digits', digits).handle('Invalid bit size!');

          return digits === undefined ? ξ : parseFloat(ξ.toFixed(digits));
        }
      },

      EI: { // crypto exclusive-inclusive (min, max]
        value: (min = 0, max = 1) => (1 - crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000) * (max - min) + min,
      },
      aEI: { // advanced crypto exclusive-inclusive (min, max]
        value(min = 0, max = 1, bits = 32, digits) {
          let ξ;
          if (bits === 32)
            ξ = (1 - crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000) * (max - min) + min;
          else if (bits === 16)
            ξ = (1 - crypto.getRandomValues(new Uint16Array(1))[0] / 0x10000) * (max - min) + min;
          else if (bits === 8)
            ξ = (1 - crypto.getRandomValues(new Uint8Array(1))[0] / 0x100) * (max - min) + min;
          else new Rejection('Could not call Ξ.ℝ.aEI()', 'min', min, 'max', max, 'bits', bits, 'digits', digits).handle('Invalid bit size!');

          return digits === undefined ? ξ : parseFloat(ξ.toFixed(digits));
        }
      },

      IE: { // crypto inclusive-exclusive [min, max)
        value: (min = 0, max = 1) => crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000 * (max - min) + min,
      },
      aIE: { // advanced crypto inclusive-exclusive [min, max)
        value(min = 0, max = 1, bits = 32, digits) {
          let ξ;
          if (bits === 32)
            ξ = crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000 * (max - min) + min;
          else if (bits === 16)
            ξ = crypto.getRandomValues(new Uint16Array(1))[0] / 0x10000 * (max - min) + min;
          else if (bits === 8)
            ξ = crypto.getRandomValues(new Uint8Array(1))[0] / 0x100 * (max - min) + min;
          else new Rejection('Could not call Ξ.ℝ.aIE()', 'min', min, 'max', max, 'bits', bits, 'digits', digits).handle('Invalid bit size!');

          return digits === undefined ? ξ : parseFloat(ξ.toFixed(digits));
        }
      },

      EE: { // crypto exclusive-exclusive (min, max)
        value: (min = 0, max = 1) => (crypto.getRandomValues(new Uint32Array(1))[0] + 1) / 0x100000001 * (max - min) + min,
      },
      aEE: { // advanced crypto exclusive-exclusive (min, max)
        value(min = 0, max = 1, bits = 32, digits) {
          let ξ;
          if (bits === 32)
            ξ = (crypto.getRandomValues(new Uint32Array(1))[0] + 1) / 0x100000001 * (max - min) + min;
          else if (bits === 16)
            ξ = (crypto.getRandomValues(new Uint16Array(1))[0] + 1) / 0x10001 * (max - min) + min;
          else if (bits === 8)
            ξ = (crypto.getRandomValues(new Uint8Array(1))[0] + 1) / 0x101 * (max - min) + min;
          else new Rejection('Could not call Ξ.ℝ.aEE()', 'min', min, 'max', max, 'bits', bits, 'digits', digits).handle('Invalid bit size!');

          return digits === undefined ? ξ : parseFloat(ξ.toFixed(digits));
        }
      },
    }),
  },

  ℤ: {
    value: $({ // random integer
      ii: { // non-crypto inclusive-inclusive [min, max]
        value: (min = 0, max = 1) => Math.floor(Math.random() * (max - min + 1)) + min,
      },
      aii: { // advanced non-crypto inclusive-inclusive [min, max]
        value(min = 0, max = 1, multiple = 1) {
          min = Math.ceil(min / multiple) * multiple;
          max = Math.floor(max / multiple) * multiple;

          return Math.floor(Math.random() * ((max - min) / multiple + 1)) * multiple + min;
        }
      },

      ei: { // non-crypto exclusive-inclusive (min, max]
        value: (min = 0, max = 1) => Math.floor(Math.random() * (max - min)) + min + 1,
      },
      aei: { // advanced non-crypto exclusive-inclusive (min, max)
        value(min = 0, max = 1, multiple = 1) {
          min = Math.ceil(min / multiple) * multiple;
          max = Math.floor(max / multiple) * multiple;

          return Math.floor(Math.random() * ((max - min) / multiple)) * multiple + min + multiple;
        }
      },

      ie: { // non-crypto inclusive-exclusive [min, max)
        value: (min = 0, max = 1) => Math.floor(Math.random() * (max - min)) + min,
      },
      aie: { // advanced non-crypto inclusive-exclusive [min, max)
        value(min = 0, max = 1, multiple = 1) {
          min = Math.ceil(min / multiple) * multiple;
          max = Math.floor(max / multiple) * multiple;

          return Math.floor(Math.random() * ((max - min) / multiple)) * multiple + min;
        }
      },

      ee: { // non-crypto exclusive-exclusive (min, max)
        value: (min = 0, max = 1) => Math.floor(Math.random() * (max - min - 1)) + min + 1,
      },
      aee: { // advanced non-crypto exclusive-exclusive (min, max)
        value(min = 0, max = 1, multiple = 1) {
          min = Math.ceil(min / multiple) * multiple;
          max = Math.floor(max / multiple) * multiple;

          return Math.floor(Math.random() * ((max - min) / multiple - 1)) * multiple + min + multiple;
        }
      },

      II: { // crypto inclusive-inclusive [min, max]
        value: (min = 0, max = 1) => Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF * (max - min + 1)) + min,
      },
      aII: { // advanced crypto inclusive-inclusive [min, max]
        value(min = 0, max = 1, multiple = 1, bits = 32) {
          min = Math.ceil(min / multiple) * multiple;
          max = Math.floor(max / multiple) * multiple;

          let ξ;
          if (bits === 32)
            ξ = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF * ((max - min) / multiple + 1)) * multiple + min;
          else if (bits === 16)
            ξ = Math.floor(crypto.getRandomValues(new Uint16Array(1))[0] / 0xFFFF * ((max - min) / multiple + 1)) * multiple + min;
          else if (bits === 8)
            ξ = Math.floor(crypto.getRandomValues(new Uint8Array(1))[0] / 0xFF * ((max - min) / multiple + 1)) * multiple + min;
          else new Rejection('Could not call Ξ.ℤ.aII()', 'min', min, 'max', max, 'bits', bits, 'multiple', multiple).handle('Invalid bit size!');
        }
      },

      EI: { // crypto exclusive-inclusive (min, max]
        value: (min = 0, max = 1) => Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF * (max - min)) + min + 1,
      },
      aEI: { // advanced crypto exclusive-inclusive (min, max)
        value(min = 0, max = 1, multiple = 1, bits = 32) {
          min = Math.ceil(min / multiple) * multiple;
          max = Math.floor(max / multiple) * multiple;

          let ξ;
          if (bits === 32)
            ξ = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF * ((max - min) / multiple)) * multiple + min + multiple;
          else if (bits === 16)
            ξ = Math.floor(crypto.getRandomValues(new Uint16Array(1))[0] / 0xFFFF * ((max - min) / multiple)) * multiple + min + multiple;
          else if (bits === 8)
            ξ = Math.floor(crypto.getRandomValues(new Uint8Array(1))[0] / 0xFF * ((max - min) / multiple)) * multiple + min + multiple;
          else new Rejection('Could not call Ξ.ℤ.aEI()', 'min', min, 'max', max, 'bits', bits, 'multiple', multiple).handle('Invalid bit size!');
        }
      },

      IE: { // crypto inclusive-exclusive [min, max)
        value: (min = 0, max = 1) => Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF * (max - min)) + min,
      },
      aIE: { // advanced crypto inclusive-exclusive [min, max)
        value(min = 0, max = 1, multiple = 1, bits = 32) {
          min = Math.ceil(min / multiple) * multiple;
          max = Math.floor(max / multiple) * multiple;

          let ξ;
          if (bits === 32)
            ξ = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF * ((max - min) / multiple)) * multiple + min;
          else if (bits === 16)
            ξ = Math.floor(crypto.getRandomValues(new Uint16Array(1))[0] / 0xFFFF * ((max - min) / multiple)) * multiple + min;
          else if (bits === 8)
            ξ = Math.floor(crypto.getRandomValues(new Uint8Array(1))[0] / 0xFF * ((max - min) / multiple)) * multiple + min;
          else new Rejection('Could not call Ξ.ℤ.aIE()', 'min', min, 'max', max, 'bits', bits, 'multiple', multiple).handle('Invalid bit size!');
        }
      },

      EE: { // crypto exclusive-exclusive (min, max)
        value: (min = 0, max = 1) => Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF * (max - min - 1)) + min + 1,
      },
      aEE: { // advanced crypto exclusive-exclusive (min, max)
        value(min = 0, max = 1, multiple = 1, bits = 32) {
          min = Math.ceil(min / multiple) * multiple;
          max = Math.floor(max / multiple) * multiple;

          let ξ;
          if (bits === 32)
            ξ = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF * ((max - min) / multiple - 1)) * multiple + min + multiple;
          else if (bits === 16)
            ξ = Math.floor(crypto.getRandomValues(new Uint16Array(1))[0] / 0xFFFF * ((max - min) / multiple - 1)) * multiple + min + multiple;
          else if (bits === 8)
            ξ = Math.floor(crypto.getRandomValues(new Uint8Array(1))[0] / 0xFF * ((max - min) / multiple - 1)) * multiple + min + multiple;
          else new Rejection('Could not call Ξ.ℤ.aEE()', 'min', min, 'max', max, 'bits', bits, 'multiple', multiple).handle('Invalid bit size!');
        }
      },
    }),
  },

  sign: {
    value: (fn = Ξ.ℝ.ie, ...params) => Math.random() < 0.5 ? -fn(...params) : fn(...params),
  },

  if: {
    value: (c = 0.5) => Math.random() < c,
  },

  log: {
    value: (n = 0.5) =>  Math.log(Math.random()) / Math.log(n),
  },

  weighted: {
    value(weights, values) {
      const σ = weights.reduce((a, b) => a + b);
      let ξ = Math.random() * σ;

      let i = 0;
      for (let w of weights) {
        w = +w;
        if (ξ < w) return values ? values[i] : i;
        ξ -= w;
        i++;
      }
    }
  },

  inverseWeighted: {
    value(weights, values) {
      const σ = weights.reduce((a, b) => a + b, 0); // sum of weights
      let ξ = Math.random() * σ;

      let i = 0;
      for (let w of weights) {
        w = σ - w;
        if (ξ < w) return values ? values[i] : i;
        ξ -= w;
        i++ ;
      }
    }
  },
});
Object.defineProperty(window, 'Ξ', { value: Ξ });