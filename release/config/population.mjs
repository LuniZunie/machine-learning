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

import '../module/utility.mjs';
import '../module/logic_gate.mjs';
import '../module/math.mjs';
import RejectionHandler from '../module/debug.mjs';
import Config from '../module/config.mjs';

export default new Config({
  population: {
    size: { // default: 100
       // number of neural networks
      [Config.value]: 100,

      [Config.filter](v) { return Number.isInteger(v) && v > 0; }, // integers [1,∞)
    },
    equality: { // default: 5
       // how close leaderboard distribution should be (percentage)
      [Config.value]: 5,
      [Config.getter](v) { return v / 100; }, // convert to percentage

      [Config.filter](v) { return v >= 0 && v < 100; }, // [0, 100)
    },
  },

  network: {
    dynamic: { // default: true
      // if amount of layers and neurons per layer can change
      [Config.value]: false,

      [Config.filter](v) { return typeof v === 'boolean'; }, // must be boolean
    },

    inputs: { // default: 1
       // number of input neurons when dynamic network configuration is enabled
      [Config.value]: 1,

      [Config.filter](v) { return Number.isInteger(v) && v > 0; }, // integers [1,∞)
      [Config.disabler]() {
        if (this.root.network.dynamic[Config.get]()) return false;
        else return 'Dynamic network configuration is disabled! (Inputs count set by network.layers[0])';
      },
    },
    outputs: { // default: 1
       // number of output neurons when dynamic network configuration is enabled
      [Config.value]: 1,

      [Config.filter](v) { return Number.isInteger(v) && v > 0; }, // integers [1,∞)
      [Config.disabler]() {
        if (this.root.network.dynamic[Config.get]()) return false;
        else return 'Dynamic network configuration is disabled! (Outputs count set by network.layers[-1])';
      }
    },

    layers: { // default: [ 1, 2, 1 ]
      // neurons per layer when dynamic network configuration is disabled (input, ...hidden, output)
      [Config.value]: [ 1, 2, 1 ],
      [Config.getter](v) { return [ ...v ]; }, // clone array
      [Config.setter](v) { return [ ...v ]; }, // clone array

      [Config.filter](v) { return Array.isArray(v) && v.length > 1 && v.every(n => Number.isInteger(n) && n > 0); }, // array[2+] of positive integers [1,∞)
      [Config.disabler]() {
        if (this.root.network.dynamic[Config.get]()) return 'Dynamic network configuration is enabled! (Variable layer sizes)';
        else return false;
      },
    },

    reward: {
      function: { // default: mean of outputs function
        [Config.default]: function(...outputs) { return μ(outputs); }, // default: mean of outputs function
        [Config.deleter]: true, // allow deletion

        [Config.filter](v) { return typeof v === 'function'; }, // must be function
      },
    },
  },

  neuron: {
    activation: {
      function: { // default: <sigmoid function>
        // activation function
        [Config.default]: 'sigmoid', // default: sigmoid function
        [Config.setter](fn) { // set function
          const reject = new RejectionHandler('Invalid activation function.', 'function', fn); // create rejection handler
          let vars = [];
          if (typeof fn === 'function') return fn; // return function
          else if (typeof fn === 'object'){
            fn = fn?.function; // get function from object
            vars = fn?.with.map(function(v) {
              if (Number.isFinite(v)) return v; // return number
              else return reject.handle('Invalid activation function "with" value. (Expected number)', 'value', v, 'with', fn.with); // reject invalid value
            }) || []; // get variables
          };

          switch (fn.toLowerCase()) { // check string
            // https://www.desmos.com/calculator/fvpt3vudwk — activation functions

            case 'identity':
            case 'linear':
              // x
              return function(v) { return v; };
            case 'binary step':
              // \left\{x\ge0:1,x<0:0\right\}
              return function(v) { return v >= 0 ? 1 : 0; };
            case 'logistic':
            case 'sigmoid':
            case 'soft step':
              // \frac{1}{1+e^{-x}}
              return function(v) { return 1 / (1 + Math.exp(-v)); };
            case 'hyperbolic tangent':
            case 'tanh':
              // \tanh\left(x\right)
              return function(v) { return Math.tanh(v); };
            case 'soboleva modified hyperbolic tangent':
            case 'smht':
              if (vars.length !== 4) reject.handle('Invalid activation function "with" length! (Expected 4)', fn, vars); // require 4 variables

              // \frac{e^{ax}-e^{-bx}}{e^{cx}+e^{-dx}}
              return function(v) {  return (Math.E ** (vars[0] * v) - Math.E ** (-vars[1] * v)) / (Math.E ** (vars[2] * v) + Math.E ** (-vars[3] * v)); };
            case 'rectified linear unit':
            case 'relu':
              // \max\left(0,x\right)
              return function(v) { return Math.max(0, v); };
            case 'gaussian error linear unit':
            case 'gelu':
              // \frac{1}{2}x\left(1+\operatorname{erf}\left(\frac{x}{\sqrt{2}}\right)\right)
              return function(v) { return 0.5 * v * (1 + Math.erf(v / Math.SQRT2)); };
            case 'softplus':
              // \ln\left(1+e^x\right)
              return function(v) { return Math.ln(1 + Math.exp(v)); };
            case 'exponential linear unit':
            case 'elu':
              if (vars.length !== 1) reject.handle('Invalid activation function "with" length! (Expected 1)', fn, vars); // require 1 variable

              // \left\{x\le0:a\left(e^{x}-1\right),x>0:x\right\}
              return function(v) { return v <= 0 ? vars[0] * (Math.exp(v) - 1) : v; };
            case 'scaled exponential linear unit':
            case 'selu':
              // 1.0507\left\{x<0:\left(1.67326\right)\left(e^{x}-1\right),x\ge0:x\right\}
              return function(v) { return 1.0507 * (v < 0 ? 1.67326 * (Math.exp(v) - 1) : v); };
            case 'leaky rectified linear unit':
            case 'leaky relu':
              // \left\{x\le0:0.01x,x>0:x\right\}
              return function(v) { return v <= 0 ? 0.01 * v : v; };
            case 'parametric rectified linear unit':
            case 'prelu':
              if (vars.length !== 1) reject.handle('Invalid activation function "with" length! (Expected 1)', fn, vars); // require 1 variable

              // \left\{x<0:ax,x\ge0:x\right\}
              return function(v) { return v < 0 ? vars[0] * v : v; };
            case 'sigmoid linear unit':
            case 'silu':
            case 'sigmoid shrinkage':
            case 'sil':
            case 'swish':
            case 'swish-1':
              // \frac{x}{1+e^{-x}}
              return function(v) { return v / (1 + Math.exp(-v)); };
            case 'gaussian':
              // e^{-x^{2}}
              return function(v) { return Math.exp(-(v ** 2)); };

            default: reject.handle('Activation function not predefined.'); // reject invalid function
          }

          return reject.handle('Invalid activation function.'); // reject invalid function
        },
        [Config.deleter]: true, // allow deletion

        [Config.filter](v) { return typeof v === 'function' }, // must be function or object
      },
    },

    bias: {
      range: { // default: { min: -2, max: 2 }
        // range of neuron bias
        [Config.getter]() {
          return [ this.local.min[Config.get](), this.local.max[Config.get]() ]; // return range
        },
        [Config.setter](v) {
          const reject = new RejectionHandler('Could not set neuron bias range.', 'range', v); // create rejection handler

          if (!Array.isArray(v) || v.length !== 2)
            reject.handle('Range must be an array of length 2.'); // reject invalid range
          else if (!this.local.min[Config.test](v[0]))
            try { this.local.min[Config.set](v[0]); } // try to set min to get error message
            catch (e) { reject.handle('Range[0] did not pass neuron bias range filter.', 'error', e, 'min', v[0]); } // reject invalid min
          else if (!this.local.max[Config.test](v[1]))
            try { this.local.max[Config.set](v[1]); } // try to set max to get error message
            catch (e) { reject.handle('Range[1] did not pass neuron bias range filter.', 'error', e, 'max', v[1]); } // reject invalid max

          this.local.min[Config.set](v[0]); // set min
          this.local.max[Config.set](v[1]); // set max
        },
        [Config.deleter](v) {
          this.local.min[Config.delete](); // delete min
          this.local.max[Config.delete](); // delete max
        },

        [Config.method]() {
          return Ξ(this.local.min[Config.get](), this.local.max[Config.get]()); // return random value
        },

        min: { // default: -2
          // minimum bias value
          [Config.default]: -2, // default: -2
          [Config.deleter]: true, // allow deletion

          [Config.filter](v) { return Number.isFinite(v) && v <= this.root.neuron.bias.range.max[Config.get]() && v <= 0; }, // [0, max]
        },
        max: { // default: 2
          // maximum bias value
          [Config.default]: 2, // default: 2
          [Config.deleter]: true, // allow deletion

          [Config.filter](v) { return Number.isFinite(v) && v >= this.root.neuron.bias.range.min[Config.get]() && v >= 0; }, // [min, 0]
        },
      },
    },
  },

  synapse: {
    weight: {
      range: { // default: { min: -1, max: 1 }
        // range of synapse weight
        [Config.getter]() {
          return [ this.local.min[Config.get](), this.local.max[Config.get]() ]; // return range
        },
        [Config.setter](v) {
          const reject = new RejectionHandler('Could not set synapse weight range.', 'range', v); // create rejection handler

          if (!Array.isArray(v) || v.length !== 2)
            reject.handle('Range must be an array of length 2.'); // reject invalid range
          else if (!this.local.min[Config.test](v[0]))
            try { this.local.min[Config.set](v[0]); } // try to set min to get error message
            catch (e) { reject.handle('Range[0] did not pass synapse weight range filter.', 'error', e, 'min', v[0]); } // reject invalid min
          else if (!this.local.max[Config.test](v[1]))
            try { this.local.max[Config.set](v[1]); } // try to set max to get error message
            catch (e) { reject.handle('Range[1] did not pass synapse weight range filter.', 'error', e, 'max', v[1]); } // reject invalid max

          this.local.min[Config.set](v[0]); // set min
          this.local.max[Config.set](v[1]); // set max
        },
        [Config.deleter](v) {
          this.local.min[Config.delete](); // delete min
          this.local.max[Config.delete](); // delete max
        },

        [Config.method]() {
          return Ξ(this.local.min[Config.get](), this.local.max[Config.get]()); // return random value
        },

        min: { // default: -1
          // minimum weight value
          [Config.default]: -1,
          [Config.deleter]: true, // allow deletion

          [Config.filter](v) { return Number.isFinite(v) && v <= this.root.synapse.weight.range.max[Config.get]() && v <= 0; }, // [0, max]
        },
        max: { // default: 1
          // maximum weight value
          [Config.default]: 1,
          [Config.deleter]: true, // allow deletion

          [Config.filter](v) { return Number.isFinite(v) && v >= this.root.synapse.weight.range.min[Config.get]() && v >= 0; }, // [min, 0]
        },
      },
    },
  },

  mutate: {
    evolve: { // default: true
      layer: {
        [Config.method]() {
          const mutations = new Map();
          for (const k of Object.keys(this.local))
            if (this.local[k][Config.isCallable]) // check if random chance is callable
              mutations.set(k, this.local[k][Config.call]()); // get random chance

          return mutations; // return all mutations
        },

        [Config.disabler]() {
          if (this.root.network.dynamic[Config.get]()) return false;
          else return 'Dynamic network configuration is disabled! (Variable layer sizes)';
        },

        add: { // default: 2
          // chance of adding a layer (percentage)
          [Config.default]: 2,
          [Config.getter](v) { return v / 100; }, // convert to percentage
          [Config.deleter]: true, // allow deletion

          [Config.method](v) { return Ξlog(v) | 0; }, // check if random chance is met

          [Config.filter](v) { return v >= 0 && v <= 100; }, // [0, 100]
          [Config.disabler]() {
            if (this.root.network.dynamic[Config.get]()) return false;
            else return 'Dynamic network configuration is disabled! (Variable layer sizes)';
          },
        },
        remove: { // default: 1
          // chance of removing a layer (percentage)
          [Config.default]: 1,
          [Config.getter](v) { return v / 100; }, // convert to percentage
          [Config.deleter]: true, // allow deletion

          [Config.method](v) { return Ξlog(v) | 0; }, // check if random chance is met

          [Config.filter](v) { return v >= 0 && v <= 100; }, // [0, 100]
          [Config.disabler]() {
            if (this.root.network.dynamic[Config.get]()) return false;
            else return 'Dynamic network configuration is disabled! (Variable layer sizes)';
          },
        },
      },

      neuron: {
        [Config.method]() {
          const mutations = new Map();
          for (const k of Object.keys(this.local))
            if (this.local[k][Config.isCallable]) // check if random chance is callable
              mutations.set(k, this.local[k][Config.call]()); // get random chance

          return mutations; // return all mutations
        },

        add: { // default: 8
          // chance of adding a neuron (percentage)
          [Config.default]: 8,
          [Config.getter](v) { return v / 100; }, // convert to percentage
          [Config.deleter]: true, // allow deletion

          [Config.method](v) { return Ξlog(v) | 0; }, // check if random chance is met

          [Config.filter](v) { return v >= 0 && v <= 100; }, // [0, 100]
          [Config.disabler]() {
            if (this.root.network.dynamic[Config.get]()) return false;
            else return 'Dynamic network configuration is disabled! (Variable layer sizes)';
          },
        },
        change: {
          [Config.method]() {
            if (this.local.chance[Config.call]()) // check if random change chance is met
              return this.local.amount[Config.call](); // return random change value
            return 0; // return no change
          },

          chance: { // default: 30
            // chance of changing a neuron (percentage)
            [Config.default]: 30,
            [Config.getter](v) { return v / 100; }, // convert to percentage
            [Config.deleter]: true, // allow deletion

            [Config.method](v) { return Ξif(v); }, // check if random chance is met

            [Config.filter](v) { return v >= 0 && v <= 100; }, // [0, 100]
          },
          amount: { // default: 0.5
            // amount of change
            [Config.default]: 0.5,
            [Config.deleter]: true, // allow deletion

            [Config.method](v) { return Ξsign(0, v); }, // get value in range [-v, v]

            [Config.filter](v) { return Number.isFinite(v) && v >= 0; }, // positive (or zero) and finite
          },
        },
        remove: { // default: 6
          // chance of removing a neuron (percentage)
          [Config.default]: 6,
          [Config.getter](v) { return v / 100; }, // convert to percentage
          [Config.deleter]: true, // allow deletion

          [Config.method](v) { return Ξlog(v) | 0; }, // check if random chance is met

          [Config.filter](v) { return v >= 0 && v <= 100; }, // [0, 100]
          [Config.disabler]() {
            if (this.root.network.dynamic[Config.get]()) return false;
            else return 'Dynamic network configuration is disabled! (Variable layer sizes)';
          },
        },
      },

      synapse: {
        [Config.method]() {
          const mutations = new Map();
          for (const k of Object.keys(this.local))
            if (this.local[k][Config.isCallable]) // check if random chance is callable
              mutations.set(k, this.local[k][Config.call]()); // get random chance

          return mutations; // return all mutations
        },

        add: { // default: 25
          // chance of adding a synapse (percentage)
          [Config.default]: 25,
          [Config.getter](v) { return v / 100; }, // convert to percentage
          [Config.deleter]: true, // allow deletion

          [Config.method](v) { return Ξif(v); }, // check if random chance is met

          [Config.filter](v) { return v >= 0 && v <= 100; }, // [0, 100]
        },
        change: {
          [Config.method]() {
            if (this.local.chance[Config.call]()) // check if random change chance is met
              return this.local.amount[Config.call](); // return random change value
            return 0; // return no change
          },

          chance: { // default: 30
            // chance of changing a synapse (percentage)
            [Config.default]: 30,
            [Config.getter](v) { return v / 100; }, // convert to percentage
            [Config.deleter]: true, // allow deletion

            [Config.method](v) { return Ξif(v); }, // check if random chance is met

            [Config.filter](v) { return v >= 0 && v <= 100; }, // [0, 100]
          },
          amount: { // default: 0.2
            // amount of change
            [Config.default]: 0.2,
            [Config.deleter]: true, // allow deletion

            [Config.method](v) { return Ξsign(0, v); }, // get value in range [-v, v]

            [Config.filter](v) { return Number.isFinite(v) && v >= 0; }, // positive (or zero) and finite
          },
        },
        remove: { // default: 15
          // chance of removing a synapse (percentage)
          [Config.default]: 15,
          [Config.getter](v) { return v / 100; }, // convert to percentage
          [Config.deleter]: true, // allow deletion

          [Config.method](v) { return Ξif(v); }, // check if random chance is met

          [Config.filter](v) { return v >= 0 && v <= 100; }, // [0, 100]
        },
      },
    },

    adapt: { // default: false
      // if population should adapt during each generation
      [Config.value]: false,

      [Config.filter](v) { return typeof v === 'boolean'; }, // must be boolean

      iterations: { // default: 10
        // size of adaptation pool
        [Config.default]: 10,
        [Config.deleter]: true, // allow deletion

        [Config.filter](v) { return Number.isInteger(v) && v > 0; }, // integers [1,∞)

        [Config.disabler]() {
          if (this.root.mutate.adapt[Config.get]()) return false;
          else return 'Adaptive mutation is disabled! (Enable with mutate.adapt[Config.set](true))';
        },
      },

      neuron: {
        [Config.method]() {
          const mutations = new Map();
          for (const k of Object.keys(this.local))
            if (this.local[k][Config.isCallable]) // check if random chance is callable
              mutations.set(k, this.local[k][Config.call]()); // get random chance

          return mutations; // return all mutations
        },

        [Config.disabler]() {
          if (this.root.mutate.adapt[Config.get]()) return false;
          else return 'Adaptive mutation is disabled! (Enable with mutate.adapt[Config.set](true))';
        },

        change: {
          [Config.method]() {
            if (this.local.chance[Config.call]()) // check if random change chance is met
              return this.local.amount[Config.call](); // return random change value
            return 0; // return no change
          },

          [Config.disabler]() {
            if (this.root.mutate.adapt[Config.get]()) return false;
            else return 'Adaptive mutation is disabled! (Enable with mutate.adapt[Config.set](true))';
          },

          chance: { // default: 7
            // chance of changing a neuron (percentage)
            [Config.default]: 7,
            [Config.getter](v) { return v / 100; }, // convert to percentage
            [Config.deleter]: true, // allow deletion

            [Config.method](v) { return Ξif(v); }, // check if random chance is met

            [Config.filter](v) { return v >= 0 && v <= 100; }, // [0, 100]
            [Config.disabler]() {
              if (this.root.mutate.adapt[Config.get]()) return false;
              else return 'Adaptive mutation is disabled! (Enable with mutate.adapt[Config.set](true))';
            },
          },
          amount: { // default: 0.3
            // amount of change
            [Config.default]: 0.3,
            [Config.deleter]: true, // allow deletion

            [Config.method](v) { return Ξsign(0, v); }, // get value in range [-v, v]

            [Config.filter](v) { return Number.isFinite(v) && v >= 0; }, // positive (or zero) and finite
            [Config.disabler]() {
              if (this.root.mutate.adapt[Config.get]()) return false;
              else return 'Adaptive mutation is disabled! (Enable with mutate.adapt[Config.set](true))';
            },
          },
        },
      },

      synapse: {
        [Config.method]() {
          const mutations = new Map();
          for (const k of Object.keys(this.local))
            if (this.local[k][Config.isCallable]) // check if random chance is callable
              mutations.set(k, this.local[k][Config.call]()); // get random chance

          return mutations; // return all mutations
        },

        [Config.disabler]() {
          if (this.root.mutate.adapt[Config.get]()) return false;
          else return 'Adaptive mutation is disabled! (Enable with mutate.adapt[Config.set](true))';
        },

        change: {
          [Config.method]() {
            if (this.local.chance[Config.call]()) // check if random change chance is met
              return this.local.amount[Config.call](); // return random change value
            return 0; // return no change
          },

          [Config.disabler]() {
            if (this.root.mutate.adapt[Config.get]()) return false;
            else return 'Adaptive mutation is disabled! (Enable with mutate.adapt[Config.set](true))';
          },

          chance: { // default: 15
            // chance of changing a synapse (percentage)
            [Config.default]: 15,
            [Config.getter](v) { return v / 100; }, // convert to percentage
            [Config.deleter]: true, // allow deletion

            [Config.method](v) { return Ξif(v); }, // check if random chance is met

            [Config.filter](v) { return v >= 0 && v <= 100; }, // [0, 100]
            [Config.disabler]() {
              if (this.root.mutate.adapt[Config.get]()) return false;
              else return 'Adaptive mutation is disabled! (Enable with mutate.adapt[Config.set](true))';
            },
          },
          amount: { // default: 0.2
            // amount of change
            [Config.default]: 0.2,
            [Config.deleter]: true, // allow deletion

            [Config.method](v) { return Ξsign(0, v); }, // get value in range [-v, v]

            [Config.filter](v) { return Number.isFinite(v) && v >= 0; }, // positive (or zero) and finite
            [Config.disabler]() {
              if (this.root.mutate.adapt[Config.get]()) return false;
              else return 'Adaptive mutation is disabled! (Enable with mutate.adapt[Config.set](true))';
            },
          },
        },
      },
    },
  },
});