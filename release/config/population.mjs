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
      [Config.require]: v => Number.isInteger(v) && v > 0, // positive integer
    },
    equality: { // default: 10
       // how close leaderboard distribution should be (percentage)
      [Config.value]: 10,
      [Config.require]: v => v >= 0 && v < 100, // [0, 100)

      [Config.get]: v => v / 100, // convert to percentage
    },
  },

  network: {
    dynamic: { // default: true
      // if amount of layers and neurons per layer can change
      [Config.value]: false,
      [Config.require]: 'boolean', // must be boolean
    },

    inputs: { // default: 2
       // number of input neurons when dynamic network configuration is enabled
      [Config.value]: 2,
      [Config.require]: v => Number.isInteger(v) && v >= 0, // integers [1,∞)
      [Config.disabled]: $ => !$`get network.dynamic` && 'Dynamic network configuration is disabled! (Inputs count set by network.layers[0])',
    },
    outputs: { // default: 1
       // number of output neurons when dynamic network configuration is enabled
      [Config.value]: 1,
      [Config.require]: v => Number.isInteger(v) && v > 0, // integers [1,∞)
      [Config.disabled]: $ => !$`get network.dynamic` && 'Dynamic network configuration is disabled! (Outputs count set by network.layers[-1])',
    },

    layers: { // default: [ 2, 2, 1 ]
      // neurons per layer when dynamic network configuration is disabled (input, ...hidden, output)
      [Config.value]: [ 1, 2, 1 ],
      [Config.require]: v => Array.isArray(v) && v.length > 1 && v.every(n => Number.isInteger(n) && n > 0), // array[2+] of positive integers [1,∞)
      [Config.disabled]: $ => $`get network.dynamic` && 'Dynamic network configuration is enabled! (Variable layer sizes)',

      [Config.get]: v => [ ...v ], // clone array
      [Config.set]: v => [ ...v ], // clone array
    },

    reward: {
      function: { // default: mean of outputs function
        [Config.value]: function(...outputs) {
          return μ(outputs); // mean of outputs
        },
        [Config.require]: 'function', // must be function
      },
    },
  },

  neuron: {
    activation: {
      function: { // default: <sigmoid function>
        // activation function
        [Config.value]: function(v) { return 1 / (1 + Math.exp(-v)); }, // sigmoid function
        [Config.require]: 'function', // must be function

        [Config.set]: (fn, defined, reject) => { // set function
          let vars = [];
          if (typeof fn === 'function') return v; // return function
          else if (typeof fn === 'object'){
            fn = fn?.function; // get function from object
            vars = fn?.with.map(v => Number.isFinite(v) ? v : reject.handle('Invalid activation function "with" value! (Expected number)', v, fn.with)) || []; // get variables
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

            default: reject.handle('Activation function not predefined!', fn); // reject invalid function
          }

          return reject.handle('Invalid activation function!', fn); // reject invalid function
        }
      },
    },

    bias: {
      [Config.direct]: 'range', // inherit range

      range: { // default: { min: -1, max: 1 }
        // range of neuron bias
        [Config.value]: null,
        [Config.get]: (v, reject, $) => { // get range
          const { min: { value: min }, max: { value: max } } = $`parse neuron.bias.range`.object;

          return { min, max }; // return range
        },
        [Config.set]: (v, reject, $, config) => { // set range
          try {
            $`set neuron.bias.range.min`($`get neuron.bias.range.min`); // set min
            $`set neuron.bias.range.max`($`get neuron.bias.range.max`); // set max
          } catch (e) { reject(e); } // reject error
        },
        [Config.delete]: (v, reject, $, config) => { // delete range
          try {
            $`delete neuron.bias.range.min`; // delete min
            $`delete neuron.bias.range.max`; // delete max
          } catch (e) { reject(e); } // reject error
        },

        [Config.method]: (v, reject, $) => {
          const { min: { value: min }, max: { value: max } } = $`parse neuron.bias.range`.object;

          return Ξ(min, max); // return random value
        },

        min: { // default: -1
          // minimum bias value
          [Config.value]: -1,
          [Config.default]: -Infinity, // default: -∞
          [Config.require]: (v, defined, reject, $) => {
            console.log($);
            if (defined) {
              if (Number.isFinite(v)) return v <= $`get neuron.bias.range.max` && v <= 0; // require min <= max and min <= 0
              else return false; // reject non-finite values
            } else return true; // allow deletion
          },
        },
        max: { // default: 1
          // maximum bias value
          [Config.value]: 1,
          [Config.default]: Infinity, // default: ∞
          [Config.require]: (v, defined, reject, $) => {
            if (defined) {
              if (Number.isFinite(v)) return v >= $`get neuron.bias.range.min` && v >= 0; // require max >= min and max >= 0
              else return false; // reject non-finite values
            } else return true; // allow deletion
          }
        },
      },
    },
  },

  synapse: {
    weight: {
      [Config.direct]: 'range', // inherit range

      range: { // default: { min: -1, max: 1 }
        // range of synapse weight
        [Config.value]: null,
        [Config.get]: (v, reject, $) => { // get range
          const { min: { value: min }, max: { value: max } } = $`parse synapse.weight.range`.object;

          return { min, max }; // return range
        },
        [Config.set]: (v, reject, $, config) => { // set range
          try {
            $`set synapse.weight.range.min`(v?.min); // set min
            $`set synapse.weight.range.max`(v?.max); // set max
          } catch (e) { reject(e); } // reject error
        },
        [Config.delete]: (v, reject, $, config) => { // delete range
          try {
            $`delete synapse.weight.range.min`; // delete min
            $`delete synapse.weight.range.max`; // delete max
          } catch (e) { reject(e); } // reject error
        },

        [Config.method]: (v, reject, $) => {
          const { min: { value: min }, max: { value: max } } = $`parse synapse.weight.range`.object;

          return Ξ(min, max); // return random value
        },

        min: { // default: -1
          // minimum weight value
          [Config.value]: -1,

          [Config.require]: (v, defined, reject, $) => {
            if (defined) {
              if (Number.isFinite(v)) return v <= $`get synapse.weight.range.max` && v <= 0; // require min <= max and min <= 0
              else return false; // reject non-finite values
            } else return true; // allow deletion
          },
        },
        max: { // default: 1
          // maximum weight value
          [Config.value]: 1,
          [Config.require]: (v, defined, reject, $) => {
            if (defined) {
              if (Number.isFinite(v)) return v >= $`get synapse.weight.range.min` && v >= 0; // require max >= min and max >= 0
              else return false; // reject non-finite values
            } else return true; // allow deletion
          }
        },
      },
    },
  },

  mutate: {
    evolve: { // default: true
      layer: {
        [Config.method]: (v, reject, $) => {
          const ξs = Object.keys($`parse mutate.evolve.layer`.object); // get all random chances

          const mutations = new Map();
          for (const k of ξs)
            try {
              mutations.set(k, $`run mutate.evolve.layer.>${k}`); // get random chance\
            } catch { }

          return mutations; // return all mutations
        },

        [Config.disabled]: $ => !$`get network.dynamic` && 'Dynamic network configuration is enabled! (Variable layer sizes)',

        add: { // default: 10
          // chance of adding a layer (percentage)
          [Config.value]: 10,
          [Config.require]: v => Number.isFinite(v) && v >= 0 && v <= 100, // [0, 100]
          [Config.get]: v => v / 100, // convert to percentage
          [Config.method]: v => Ξlog(v) | 0, // check if random chance is met
          [Config.disabled]: $ => !$`get network.dynamic` && 'Dynamic network configuration is enabled! (Variable layer sizes)',
        },
        remove: { // default: 10
          // chance of removing a layer (percentage)
          [Config.value]: 10,
          [Config.require]: v => Number.isFinite(v) && v >= 0 && v <= 100, // [0, 100]
          [Config.get]: v => v / 100, // convert to percentage
          [Config.method]: v => Ξlog(v) | 0, // check if random chance is met
          [Config.disabled]: $ => !$`get network.dynamic` && 'Dynamic network configuration is enabled! (Variable layer sizes)',
        },
      },

      neuron: {
        [Config.method]: (v, reject, $) => {
          const ξs = Object.keys($`parse mutate.evolve.neuron`.object); // get all random chances

          const mutations = new Map();
          for (const k of ξs)
            try {
              mutations.set(k, $`run mutate.evolve.neuron.>${k}`); // get random chance
            } catch { }

          return mutations; // return all mutations
        },

        add: { // default: 10
          // chance of adding a neuron (percentage)
          [Config.value]: 10,
          [Config.require]: v => Number.isFinite(v) && v >= 0 && v <= 100, // [0, 100]
          [Config.get]: v => v / 100, // convert to percentage
          [Config.method]: v => Ξlog(v) | 0, // check if random chance is met

          [Config.disabled]: $ => !$`get network.dynamic` && 'Dynamic network configuration is enabled! (Variable layer sizes)',
        },
        change: {
          [Config.direct]: 'chance', // inherit chance

          [Config.method]: (v, reject, $) => {
            if ($`run mutate.evolve.neuron.change.chance`) // check if random change chance is met
              return $`run mutate.evolve.neuron.change.amount`; // return random change value

            return null; // return no change (different from 0 but evaluates the same)
          },

          chance: { // default: 10
            // chance of changing a neuron (percentage)
            [Config.value]: 10,
            [Config.require]: v => Number.isFinite(v) && v >= 0 && v <= 100, // [0, 100]
            [Config.get]: v => v / 100, // convert to percentage
            [Config.method]: v => Ξif(v), // check if random chance is met
          },
          amount: { // default: 0.1
            // amount of change
            [Config.value]: 0.1,
            [Config.require]: v => Number.isFinite(v) && v >= 0, // positive (or zero) and finite
            [Config.method]: v => Ξsign(0, v), // get value in range [-by, by]
          },
        },
        remove: { // default: 10
          // chance of removing a neuron (percentage)
          [Config.value]: 10,
          [Config.require]: v => Number.isFinite(v) && v >= 0 && v <= 100, // [0, 100]
          [Config.get]: v => v / 100, // convert to percentage
          [Config.method]: v => Ξlog(v) | 0, // check if random chance is met

          [Config.disabled]: $ => !$`get network.dynamic` && 'Dynamic network configuration is enabled! (Variable layer sizes)',
        },
      },

      synapse: {
        [Config.method]: (v, reject, $) => {
          const ξs = Object.keys($`parse mutate.evolve.synapse`.object); // get all random chances

          const mutations = new Map();
          for (const k of ξs)
            try {
              mutations.set(k, $`run mutate.evolve.synapse.>${k}`); // get random chance
            } catch { }

          return mutations; // return all mutations
        },

        add: { // default: 10
          // chance of adding a synapse (percentage)
          [Config.value]: 10,
          [Config.require]: v => Number.isFinite(v) && v >= 0 && v <= 100, // [0, 100]
          [Config.get]: v => v / 100, // convert to percentage
          [Config.method]: v => Ξif(v), // check if random chance is met
        },
        change: {
          [Config.direct]: 'chance', // inherit chance

          [Config.method]: (v, reject, $) => {
            if ($`run mutate.evolve.synapse.change.chance`) // check if random change chance is met
              return $`run mutate.evolve.synapse.change.amount`; // return random change value

            return null; // return no change (different from 0 but evaluates the same)
          },

          chance: { // default: 10
            // chance of changing a synapse (percentage)
            [Config.value]: 10,
            [Config.require]: v => Number.isFinite(v) && v >= 0 && v <= 100, // [0, 100]
            [Config.get]: v => v / 100, // convert to percentage
            [Config.method]: v => Ξif(v), // check if random chance is met
          },
          amount: { // default: 0.1
            // amount of change
            [Config.value]: 0.1,
            [Config.require]: v => Number.isFinite(v) && v >= 0, // positive (or zero) and finite
            [Config.method]: v => Ξsign(0, v), // get value in range [-by, by]
          },
        },
        remove: { // default: 10
          // chance of removing a synapse (percentage)
          [Config.value]: 10,
          [Config.require]: v => Number.isFinite(v) && v >= 0 && v <= 100, // [0, 100]
          [Config.get]: v => v / 100, // convert to percentage
          [Config.method]: v => Ξif(v), // check if random chance is met
        },
      },
    },

    adapt: { // default: false
      // if population should adapt during each generation
      [Config.value]: false,
      [Config.require]: 'boolean', // must be boolean

      iterations: { // default: 10
        // size of adaptation pool
        [Config.value]: 10,
        [Config.require]: v => Number.isInteger(v) && v > 0, // positive integer
      },

      neuron: {
        [Config.method]: (v, reject, $) => {
          const ξs = Object.keys($`parse mutate.adapt.neuron`.object); // get all random chances

          const mutations = new Map();
          for (const k of ξs)
            try {
              mutations.set(k, $`run mutate.adapt.neuron.>${k}`); // get random chance
            } catch { }

          return mutations; // return all mutations
        },

        change: {
          [Config.direct]: 'chance', // inherit chance

          [Config.method]: (v, reject, $) => {
            if ($`run mutate.adapt.neuron.change.chance`) // check if random change chance is met
              return $`run mutate.adapt.neuron.change.amount`; // return random change value

            return null; // return no change (different from 0 but evaluates the same)
          },

          chance: { // default: 10
            // chance of changing a neuron (percentage)
            [Config.value]: 10,
            [Config.require]: v => Number.isFinite(v) && v >= 0 && v <= 100, // [0, 100]
            [Config.get]: v => v / 100, // convert to percentage
            [Config.method]: v => Ξif(v), // check if random chance is met
          },
          amount: { // default: 0.1
            // amount of change
            [Config.value]: 0.1,
            [Config.require]: v => Number.isFinite(v) && v >= 0, // positive (or zero) and finite
            [Config.method]: v => Ξsign(0, v), // get value in range [-by, by]
          },
        },
      },

      synapse: {
        [Config.method]: (v, reject, $) => {
          const ξs = Object.keys($`parse mutate.adapt.`.object); // get all random chances

          const mutations = new Map();
          for (const k of ξs)
            try {
              mutations.set(k, $`run mutate.adapt.synapse.>${k}`); // get random chance
            } catch { }

          return mutations; // return all mutations
        },

        change: {
          [Config.direct]: 'chance', // inherit chance

          [Config.method]: (v, reject, $) => {
            if ($`run mutate.adapt.synapse.change.chance`) // check if random change chance is met
              return $`run mutate.adapt.synapse.change.amount`; // return random change value

            return null; // return no change (different from 0 but evaluates the same)
          },

          chance: { // default: 10
            // chance of changing a synapse (percentage)
            [Config.value]: 10,
            [Config.require]: v => Number.isFinite(v) && v >= 0 && v <= 100, // [0, 100]
            [Config.get]: v => v / 100, // convert to percentage
            [Config.method]: v => Ξif(v), // check if random chance is met
          },
          amount: { // default: 0.1
            // amount of change
            [Config.value]: 0.1,
            [Config.require]: v => Number.isFinite(v) && v >= 0, // positive (or zero) and finite
            [Config.method]: v => Ξsign(0, v), // get value in range [-by, by]
          },
        },
      },
    },
  },
});