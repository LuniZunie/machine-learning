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

import './module/utility.mjs';
import './module/logic_gate.mjs';
import './module/math.mjs';
import RejectionHandler from './module/debug.mjs';
import Config from './module/config.mjs';

export default new Config({
  population: {
    size: { // default: 100
      $value: 100, // number of neural networks

      $require(v) { return Number.isInteger(v) && v > 0; }, // must be positive integer
    },
    equality: { // default: 10
      $value: 10,  // how close distribution should be (percentage)

      $get(v) { return v / 100; }, // convert to percentage

      $require(v) { return Number.isInteger(v) && v > 0; }, // must be positive integer
    },
  },
  network: {
    dynamic: { // default: true
      $value: true, // dynamic network configuration

      $require: 'boolean', // must be boolean
    },

    inputs: { // default: 2
      $value: 2, // number of input neurons

      $require(v) { return Number.isInteger(v) && v > 0; }, // must be positive integer
      $disabled($) { // disable if dynamic network configuration is disabled
        return !$`get network.dynamic` &&
          'Dynamic network configuration is disabled! (Inputs count set by network.layers[0])';
      },
    },
    outputs: { // default: 1
      $value: 1, // number of output neurons

      $require(v) { return Number.isInteger(v) && v > 0; }, // must be positive integer
      $disabled($) { // disable if dynamic network configuration is disabled
        return !$`get network.dynamic` &&
          'Dynamic network configuration is disabled! (Outputs count set by network.layers[-1])';
      },
    },

    layers: { // default: [ 2, 2, 1 ]
      $value: [ 2, 2, 1 ], // input, ...hidden, output

      $get(v) { return [ ...v ]; }, // clone array
      $set(v) { return [ ...v ]; }, // clone array

      $require(v) { return Array.isArray(v) && v.length > 1 && v.every(n => Number.isInteger(n) && n > 0); }, // must be array of positive integers
      $disabled($) { // disable if dynamic network configuration is enabled
        return $`get network.dynamic` &&
          'Dynamic network configuration is enabled! (Variable layer sizes)';
      },

      mutate: { // mutate layers
        $method(v, reject, $) { // get all mutations
          const ξs = Object.entries($`parse network.layers.mutate`.object); // get all random chances

          const mutations = new Set();
          for (const [ k, { object: { chance: value } } ] of ξs)
            if (Ξif(value)) mutations.add(k); // add mutation if random chance is met

          return mutations; // return all mutations
        },

        add: { // add a layer
          $direct: 'chance', // inherit chance

          $disabled($) { // disable if dynamic network configuration is enabled
            return $`get network.dynamic` &&
              'Dynamic network configuration is enabled! (Variable layer sizes)';
          },

          chance: { // default: 10
            // EXPERIMENT config.network.layers.mutate.add.chance
            $value: 10, // chance of a added layer (percentage)

            $get(v) { return v / 100; }, // convert to percentage

            $method(v) { return Ξif(v); }, // check if random chance is met

            $require(v) { return Number.isFinite(v) && v >= 0 && v <= 100; }, // must be in range [0, 100]
            $disabled($) { // disable if dynamic network configuration is enabled
              return $`get network.dynamic` &&
                'Dynamic network configuration is enabled! (Variable layer sizes)';
            },
          },
        },
        remove: { // remove a layer
          $direct: 'chance', // inherit chance

          $disabled($) { // disable if dynamic network configuration is enabled
            return $`get network.dynamic` &&
              'Dynamic network configuration is enabled! (Variable layer sizes)';
          },

          chance: { // default: 10
            // EXPERIMENT config.network.layers.mutate.remove.chance
            $value: 10, // chance of a removed layer (percentage)

            $get(v) { return v / 100; }, // convert to percentage

            $method(v) { return Ξif(v); }, // check if random chance is met

            $require(v) { return Number.isFinite(v) && v >= 0 && v <= 100; }, // must be in range [0, 100]
            $disabled($) { // disable if dynamic network configuration is enabled
              return $`get network.dynamic` &&
                'Dynamic network configuration is enabled! (Variable layer sizes)';
            },
          },
        },
      },
    },
  },
  neuron: {
    value: {
      function: { // default: <sigmoid function>
        $value: function(σ, bias) { return 1 / (1 + Math.exp(-σ - bias)); }, // sigmoid function

        $require: 'function', // must be function
      },
    },

    bias: { // neuron bias
      $direct: 'range', // inherit range

      range: { // range of neuron bias
        $get(v, reject, $) { // get range
          const { min: { value: min }, max: { value: max } } = $`parse neuron.bias.range`;

          return { min, max }; // return range
        },

        $method(v, reject, $) { // get random value
          const { min: { value: min }, max: { value: max } } = $`parse neuron.bias.range`;

          return Ξ(min, max); // return random value
        },

        min: { // default: -1
          $value: -1, // minimum bias value

          $require: 'finite', // must be finite
        },
        max: { // default: 1
          $value: 1, // maximum bias value

          $require: 'finite', // must be finite
        },
      },
    },

    mutate: { // mutate neurons
      $method(v, reject, $) { // get all mutations
        const ξs = Object.entries($`parse neuron.mutate`.object); // get all random chances

        const mutations = new Set();
        for (const [ k, { object: { chance: value } } ] of ξs)
          if (Ξif(value)) mutations.add(k); // add mutation if random chance is met

        return mutations; // return all mutations
      },

      add: {
        $direct: 'chance', // inherit chance

        chance: { // default: 10
          // EXPERIMENT config.neuron.mutate.add.chance
          $value: 10, // chance of a added neuron (percentage)

          $get(v) { return v / 100; }, // convert to percentage

          $method(v) { return Ξif(v); }, // check if random chance is met

          $require(v) { return Number.isFinite(v) && v >= 0 && v <= 100; }, // must be in range [0, 100]
        },
      },
      change: {
        $direct: 'chance', // inherit chance

        $method(v, reject, $) { // get all mutations
          if ($`run neuron.mutate.change.chance`) // check if random change chance is met
            return $`run neuron.mutate.change.δ`; // return random change value

          return null; // return no change (different from 0 but evaluates the same)
        },

        chance: { // default: 10
          // EXPERIMENT config.neuron.mutate.change.chance
          $value: 10, // chance of a changed neuron (percentage)

          $get(v) { return v / 100; }, // convert to percentage

          $method(v) { return Ξif(v); }, // check if random chance is met

          $require(v) { return Number.isFinite(v) && v >= 0 && v <= 100; }, // must be in range [0, 100]
        },
        δ: { // default: 0.1
          // EXPERIMENT config.neuron.mutate.change.δ
          $value: 0.1, // change δ

          $method(v) { return ξsign(0, v) }, // get value in range [ -δ, δ ]

          $require(v) { return Number.isFinite(v) && v >= 0; } // must be positive (or zero) and finite
        },
      },
      remove: {
        $direct: 'chance', // inherit chance

        chance: { // default: 10
          // EXPERIMENT config.neuron.mutate.remove.chance
          $value: 10, // chance of a removed neuron (percentage)

          $get(v) { return v / 100; }, // convert to percentage

          $method(v) { return Ξif(v); }, // check if random chance is met

          $require(v) { return Number.isFinite(v) && v > 0; }, // must be positive and finite
        },
      },
    },
  },
  synapse: {
    weight: { // synapse weight
      $direct: 'range', // inherit range

      range: { // range of synapse weight
        $get(v, reject, $) { // get range
          const { min: { value: min }, max: { value: max } } = $`parse synapse.weight.range`;

          return { min, max }; // return range
        },

        $method(v, reject, $) { // get random value
          const { min: { value: min }, max: { value: max } } = $`parse synapse.weight.range`;

          return Ξ(min, max); // return random value
        },

        min: { // default: -1
          $value: -1, // minimum bias value

          $require: 'finite', // must be finite
        },
        max: { // default: 1
          $value: 1, // maximum bias value

          $require: 'finite', // must be finite
        },
      },
    },

    mutate: {
      $method(v, reject, $) { // get all mutations
        const ξs = Object.entries($`parse neuron.mutate`.object); // get all random chances

        const mutations = new Set();
        for (const [ k, { object: { chance: value } } ] of ξs)
          if (Ξif(value)) mutations.add(k); // add mutation if random chance is met

        return mutations; // return all mutations
      },

      add: {
        $direct: 'chance', // inherit chance

        chance: { // default: 10
          // EXPERIMENT config.synapse.mutate.add.chance
          $value: 10, // chance of a added synapse (percentage)

          $get(v) { return v / 100; }, // convert to percentage

          $method(v) { return Ξif(v); }, // check if random chance is met

          $require(v) { return Number.isFinite(v) && v >= 0 && v <= 100; }, // must be in range [0, 100]
        },
      },
      change: {
        $direct: 'chance', // inherit chance

        $method(v, reject, $) { // get all mutations
          if ($`run synapse.mutate.change.chance`) // check if random change chance is met
            return $`run synapse.mutate.change.δ`; // return random change value

          return null; // return no change (different from 0 but evaluates the same)
        },

        chance: { // default: 10
          // EXPERIMENT config.synapse.mutate.change.chance
          $value: 10, // chance of a changed synapse (percentage)

          $get(v) { return v / 100; }, // convert to percentage

          $method(v) { return Ξif(v); }, // check if random chance is met

          $require(v) { return Number.isFinite(v) && v >= 0 && v <= 100; }, // must be in range [0, 100]
        },
        δ: { // default: 0.1
          // EXPERIMENT config.synapse.mutate.change.δ
          $value: 0.1, // change δ

          $method(v) { return ξsign(0, v) }, // get value in range [-δ, δ]

          $require(v) { return Number.isFinite(v) && v >= 0; } // must be positive (or zero) and finite
        },
      },
      remove: {
        $direct: 'chance', // inherit chance

        chance: { // default: 10
          // EXPERIMENT config.synapse.mutate.remove.chance
          $value: 10, // chance of a removed synapse (percentage)

          $get(v) { return v / 100; }, // convert to percentage

          $method(v) { return Ξif(v); }, // check if random chance is met

          $require(v) { return Number.isFinite(v) && v >= 0 && v <= 100; }, // must be in range [0, 100]
        },
      },
    },
  },
});