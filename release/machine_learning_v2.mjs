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

// TODO: Implement Population.prototype.Input()
// TODO: Implement Population.prototype.Output()
// TODO: Implement Population.prototype.Reward()
// TODO: Implement Population.prototype.Score()
// TODO: Possibly implement automatic reward function
// TODO: Implement Population.prototype.alive

// TODO: Implement NeuralNetwork.prototype.Kill()

// TODO: Remember to add modules to index.html
import './module/proto.mjs';
import './module/utility.mjs';
import './module/logic_gate.mjs';
import './module/math.mjs';
import RejectionHandler from './module/debug.mjs';
import ID from './module/id.mjs';

const cache = new Map();

class Population {
  static #config = import('./config/population.mjs');

  #config = Population.#config;
  #preloaded = { };

  #running = false;
  #networks = new Map();
  constructor(config) {
    const reject = new RejectionHandler('Could not construct Population!');

    this.#Network.prototype.population = this; // set population to network

    if (config)
      try {
        this.#config = this.#config(config); // push object values to config
      } catch (e) { reject.handle(e, config, e); }; // handle error

    this.#UpdatePreloaded(); // update preloaded values
  }

  get config() { return this.#config; }
  set config(c) {
    const reject = new RejectionHandler('Could not set Population.config!');
    try {
      this.#config = this.#config(c); // push object values to config
    } catch (e) { reject.handle(e, c, e); }; // handle error

    this.#UpdatePreloaded(); // update preloaded values
  }

  get preloaded() { return this.#preloaded; }

  #UpdatePreloaded() {
    this.#preloaded = { // preloaded values
      size: this.#config`get population.size`, // size of population

      activationFunction: this.#config`get neuron.activation.function`, // value function
    };
  }

  get size() { return this.#preloaded.size; }

  get running() { return this.#running; }

  Start(safeMode) { // TODO: Implement Population.prototype.Start()
    const reject = new RejectionHandler('Could not start Population!');
    if (safeMode) { // if safe mode
      if (this.#running) return false; // if already running and is in safe mode return false
    } else if (this.#running) reject.handle('Population is already running!', this.#running, safeMode); // if already running and is not in safe mode

    this.#networks.clear(); // reset networks
    // ...

    this.#running = true; // set running to true
    return true;
  }

  Restart(safeMode) {
    const reject = new RejectionHandler('Could not restart Population!');
    if (safeMode) { // if safe mode
      if (!this.#running) return false; // if not running and is in safe mode return false
    } else if (!this.#running) reject.handle('Population is not running!', this.#running, safeMode); // if not running and not safe mode

    this.#networks.forEach(network => network.reset()); // reset networks // TODO: Implement Network.prototype.Reset()
    return true;
  }

  Resume(safeMode) {
    const reject = new RejectionHandler('Could not resume Population!');
    if (safeMode) { // if safe mode
      if (this.#running) return false; // if already running and is in safe mode return false
    } else if (this.#running) reject.handle('Population is already running!', this.#running, safeMode); // if already running and is not in safe mode

    this.#running = true; // set running to true
    return true;
  }

  Pause(safeMode) {
    const reject = new RejectionHandler('Could not pause Population!');
    if (safeMode) { // if safe mode
      if (!this.#running) return false; // if not running and is in safe mode return false
    } else if (!this.#running) reject.handle('Population is not running!', this.#running, safeMode); // if not running and not safe mode

    this.#running = false; // set running to false
    return true;
  }

  Evolve(safeMode) { // TODO: Implement Population.prototype.Evolve()
    const reject = new RejectionHandler('Could not evolve Population!');
    if (safeMode) { // if safe mode
      if (!this.#running) return false; // if not running and is in safe mode return false
    } else if (!this.#running) reject.handle('Population is not running!', this.#running, safeMode); // if not running and not safe mode

    // ...
    return true;
  }

  #Network = class NeuralNetwork {
    #score = 0;

    #layers = new Map();
    #height;

    #updateMap = new Map(); // map of neurons to update
    constructor() {
      this.#Neuron.prototype.network = this; // set network to neuron
    }

    get score() { return this.#score; } // get score
    set score(s) { // set score
      if (typeof s !== 'number') new RejectionHandler('Could not set NeuralNetwork.score!').handle('Score must be a number!', s); // if score is invalid
      return this.#score = s; // set score
    }

    get reward() { };
    set reward(δ) { // set reward
      if (typeof δ !== 'number') new RejectionHandler('Could not set NeuralNetwork.reward!').handle('Reward must be a number!', δ); // if reward is invalid
      return this.#score += δ; // add reward to score
    }

    get depth() { return this.#layers.size; } // get depth of network
    get height() { return this.#height; } // get height of network
    get heights() { // get heights of layers
      return [ ...this.#layers.values().map(layer => layer.height) ] // get heights of layers
    }

    #CalculateUpdateMap() { // calculate map of neurons to update
      for (const layer of [ ...this.#layers.values() ].reverse()) // iterate through layers in reverse
        for (const neuron of layer.values()) // iterate through neurons in layer
          neuron.UpdateOutputPath(); // update output paths

      for (const layer of this.#layers.values()) // iterate through layers
        for (const neuron of layer.values()) {
          neuron.UpdateInputPath(); // update input paths

          const updateGroups = [ ...neuron.updateGroups ]; // get update groups (groups based on input neurons "y" values)
          for (const group of updateGroups) { // iterate through update groups
            if (!this.#updateMap.has(group)) this.#updateMap.set(group, new Set()); // if update group doesn't exist, create it
            this.#updateMap.get(group).add(neuron); // add neuron to update group
          }
        }
    }

    #GetUpdateSet(...ks) { // get set of neurons to update
      let set = new Set(); // create set
      for (const k of ks) // iterate through keys
        set = set.union(this.#updateMap.get(k)); // add neurons to set

      return set; // return set
    }

    #Neuron = class Neuron {
      #id = ID.new('neuron');

      #depth; // depth of neuron
      #y; // y value of neuron

      #bias = NaN; // bias of neuron
      #value = NaN; // value of neuron

      #updateFunction; // update function of neuron

      #synapses = {
        input: new Map(), // synapses of input neurons (key: input neuron, value: synapse)
        output: new Map() // synapses of output neurons (key: output neuron, value: synapse)
      }; // synapses of neuron

      #pointsOnInputPath = new Set(); // point on input paths
      #pointsOnOutputPath = new Set(); // point on output paths

      constructor(depth, y, bias = NaN) {
        const reject = new RejectionHandler('Could not construct Neuron!');
        if (typeof depth !== 'number' || typeof y !== 'number') reject.handle('Invalid depth or y value!', depth, y); // if depth or y value is invalid
        else if (this.network.Neuron.get(depth, y)) reject.handle('Neuron already exists!', depth, y); // if neuron already exists // TODO: Implement NeuralNetwork.prototype.Neuron.get()
        else if (typeof bias !== 'number') reject.handle('Invalid bias!', bias); // if bias is invalid

        this.#depth = depth; // set depth
        this.#y = y; // set y value

        const { min, max } = this.network.config`get neuron.bias.range`; // get bias range
        this.#bias = (+bias).clamp(min, max); // set bias

        this.#UpdateUpdateFunction(); // update update function
      }

      get id() { return this.#id; }

      get depth() { return this.#depth; } // get depth
      get isInput() { return this.#depth === 0; } // get if neuron is input neuron
      get isOutput() { return this.#depth === this.network.depth - 1; } // get if neuron is output neuron

      get y() { return this.#y; } // get y value

      get bias() { return this.#bias; } // get bias
      set bias(b) { // set bias
        if (typeof b !== 'number') new RejectionHandler('Could not set Neuron.bias!').handle('Bias must be a number!', b); // if bias is invalid

        const { min, max } = this.network.config`get neuron.bias.range`; // get bias range
        this.#bias = (+b).clamp(min, max); // set bias

        this.#UpdateUpdateFunction(); // update update function

        return this.#bias; // return bias
      }

      get value() { return this.#value; } // get value
      set value(v) { // set value
        if (typeof v !== 'number') new RejectionHandler('Could not set Neuron.value!').handle('Value must be a number!', v); // if value is invalid

        return this.#value = v; // set value
      }

      #UpdateUpdateFunction() { // update the update function
        const neurons = new Set(); // create set of neurons
        for (let i = 0; i < this.#synapses.input.size; i++) // iterate through input synapses
          neurons.add(`neurons[${i++}].value`); // add neuron to set

        this.#updateFunction = new Function('neurons', 'activationFn' `
          return activationFn(${neurons.join(' + ')}, ${this.#bias});
        `).bind({}, this.#synapses.input.keys()); // return update function
      }

      Update() { // update neuron
        this.#value = this.#updateFunction(this.network.preloaded.activationFunction); // update value
      }

      get inputs() { // get input synapses
        return [ ...this.#synapses.input.keys() ].map(neuron => neuron.id); // get input synapses as array of neuron IDs
      }
      get outputs() { // get output synapses
        return [ ...this.#synapses.output.keys() ].map(neuron => neuron.id); // get output synapses as array of neuron IDs
      }

      HasInputSynapse(neuron) { return this.#synapses.input.has(neuron); } // check if neuron has input synapse with another neuron
      HasOutputSynapse(neuron) { return this.#synapses.output.has(neuron); } // check if neuron has output synapse with another neuron
      HasSynapse(neuron) {
        return this.#synapses.input.has(neuron) || this.#synapses.output.has(neuron); // check if neuron has synapse with another neuron
      }

      Connect(y) { // TODO: add weight parameter
        const reject = new RejectionHandler('Could not connect Neuron!');
        if (typeof y !== 'number')
          reject.handle('Invalid y value!', y); // if y value is invalid
        else if (this.isOutput)
          reject.handle('Output neurons cannot connect to other neurons!', this.#depth, y); // if neuron is output neuron
        else if (this.network.heights[this.#depth + 1] >= y)
          reject.handle('No neuron exists at y value!', this.#depth, this.network.heights[this.#depth + 1], y); // if no neuron exists at y value
        else if (this.#synapses.output.has(this.network.Neuron.get(this.#depth + 1, y)))
          reject.handle('Connection already exists!', this.#depth, y); // if connection already exists

        const synapse = void 0; // TODO: Implement Synapse
        const neuron = this.network.Neuron.get(this.#depth + 1, y); // get neuron // TODO: Implement NeuralNetwork.prototype.Neuron.get()
        this.#synapses.output.set(neuron, synapse); // set output synapse

        neuron.ReceiveConnection(this.#y); // receive connection

        this.#UpdateUpdateFunction(); // update update function
      }

      ReceiveConnection(synapse) {
        const reject = new RejectionHandler('Could not receive connection!');

        if (!(synapse instanceof this.#Synapse)) // TODO: Implement Synapse
          reject.handle('Invalid synapse!', synapse); // if synapse is invalid
        else if (this.isInput)
          reject.handle('Input neurons cannot receive connections!', this.#depth, this.#y); // if neuron is input neuron

        const input = synapse.input; // get input neuron // TODO: Implement Synapse.prototype.input
        if (this.#synapses.input.has(input))
          reject.handle('Connection already received!', this.#depth, input); // if connection already exists
        else if (!neuron.hasOutputSynapse(this))
          reject.handle('Connection does not exist!', this.#depth, y); // if connection does not exist

        this.#synapses.input.set(input, synapse); // set input synapse

        this.#UpdateUpdateFunction(); // update update function
      }

      get pointOnInputPath() { return this.#pointsOnInputPath.size > 0; } // get point on input path
      get inputPaths() { return this.#pointsOnInputPath.copy(); } // get input paths

      get pointOnOutputPath() { return this.#pointsOnOutputPath.size > 0; } // get point on output path
      get outputPaths() { return this.#pointsOnOutputPath.copy(); } // get output paths

      get updateGroups() { // get update groups
        if (this.#pointsOnOutputPath.size === 0) return new Set(); // if not connected to any output neurons, don't update
        else return this.#pointsOnInputPath.copy(); // update based on what input neurons are connected to
      }

      UpdateInputPath() { // check if neuron is a point on input path
        this.#pointsOnInputPath.clear(); // clear input paths
        if (this.isInput) this.#pointsOnInputPath.add(this.#y); // if neuron is input neuron, add to input paths
        else for (const [ neuron ] of this.#synapses.input) // iterate through input synapses
          this.#pointsOnInputPath = this.#pointsOnInputPath.union(neuron.inputPaths); // add input paths

        return this.#pointsOnInputPath.copy(); // return input paths
      }

      UpdateOutputPath() { // check if neuron is a point on output path
        this.#pointsOnOutputPath.clear(); // clear output paths
        if (this.isOutput) this.#pointsOnOutputPath.add(this.#y); // if neuron is output neuron, add to output paths
        else for (const [ neuron ] of this.#synapses.output) // iterate through output synapses
          this.#pointsOnOutputPath = this.#pointsOnOutputPath.union(neuron.outputPaths); // add output paths

        return this.#pointsOnOutputPath.copy(); // return output paths
      }

      Deconstruct() { // deconstruct neuron
        /* ... */ // TODO: Implement Neuron.prototype.deconstruct()
      }
    }
  }
}