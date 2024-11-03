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

  #status = 0; // 0: stopped, 1: idle, 2: running

  #networks = new Map();

  constructor(config) {
    const reject = new RejectionHandler('Could not construct Population!');

    this.#Network.prototype.population = this; // set population to network

    if (config)
      try {
        this.#config = this.#config(config); // push object values to config
      } catch (e) { reject.handle(e, config, e); }; // handle error

    this.#Network.prototype.config = this.#config; // set config to network

    this.#UpdatePreloaded(); // update preloaded values
  }

  get config() { return this.#config`parse $`; }
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

      rewardFunction: this.#config`get network.reward.function`, // reward function
      updateFunction: this.#config`get network.update.function`, // update function

      activationFunction: this.#config`get neuron.activation.function`, // value function

      adapt: this.#config`get mutate.adapt`, // adapt network
      adaptIterations: this.#config`get mutate.adapt.iterations`, // number of iterations to adapt network
    };
  }

  get size() { return this.#preloaded.size; }
  get alive() { return this.#networks.filter(network => !network.dead).length; }
  get dead() { return this.#networks.filter(network => network.dead).length; }

  get status() { return [ 'stopped', 'idle', 'running' ][this.#status]; }

  Start(safeMode) { // start population
    const reject = new RejectionHandler('Could not start Population!');
    if (safeMode) { // if safe mode
      if (this.#status !== 0) return false; // if not stopped and is in safe mode return false
    } else if (this.#status !== 0) reject.handle('Population must be in a stopped state!', this.#status, safeMode); // if not stopped and not safe mode

    for (const network of this.#networks.values()) // iterate through networks
      network.Deconstruct(); // deconstruct network
    this.#networks.clear(); // clear networks

    const size = this.#config`get population.size`; // get size
    for (let i = 0; i < size; i++) {
      const network = new this.#Network(); // create network
      this.#networks.set(network.id, network); // set network

      network.Evolve(); // evolve network
    }

    this.#status = 2; // set status to running
    return true;
  }

  Restart(safeMode) { // restart population
    const reject = new RejectionHandler('Could not restart Population!');
    if (safeMode) { // if safe mode
      if (this.#status !== 1) return false; // if not idle and is in safe mode return false
    } else if (this.#status !== 1) reject.handle('Population must be in an idle state!', this.#status, safeMode); // if not idle and not safe mode

    this.#status = 0; // set status to stopped
    return this.Start(safeMode); // start population
  }

  Resume(safeMode) { // resume population
    const reject = new RejectionHandler('Could not resume Population!');
    if (safeMode) { // if safe mode
      if (this.#status !== 1) return false; // if not idle and is in safe mode return false
    } else if (this.#status !== 1) reject.handle('Population must be in an idle state!', this.#status, safeMode); // if not idle and not safe mode

    this.#status = 2; // set status to running
    return true;
  }

  Pause(safeMode) { // pause population
    const reject = new RejectionHandler('Could not pause Population!');
    if (safeMode) { // if safe mode
      if (this.#status !== 2) return false; // if not running and is in safe mode return false
    } else if (this.#status !== 2) reject.handle('Population must be in a running state!', this.#status, safeMode); // if not running and not safe mode

    this.#status = 1; // set status to idle
    return true;
  }

  Stop(safeMode) { // stop population
    const reject = new RejectionHandler('Could not stop Population!');
    if (safeMode) { // if safe mode
      if (this.#status === 0) return false; // if stopped and is in safe mode return false
    } else if (this.#status === 0) reject.handle('Population is already stopped!', this.#status, safeMode); // if stopped and not safe mode

    this.#status = 0; // set status to stopped
    return true;
  }

  Evolve(safeMode) { // evolve population
    const reject = new RejectionHandler('Could not evolve Population!');
    if (safeMode) { // if safe mode
      if (this.#status !== 2) return false; // if not running and is in safe mode return false
    } else if (this.#status !== 2) reject.handle('Population must be in a running state!', this.#status, safeMode); // if not running and not safe mode

    this.#status = 1; // set status to idle

    const equality = this.#config`get population.equality`; // get equality value
    const { maxScore, minScore, scores } = [ ...this.#networks.entries() ]
      .reduce(function({ maxScore, minScore, scores }, [ id, network ]) { // get scores
        return {
          maxScore: Math.max(maxScore, network.score),
          minScore: Math.min(minScore, network.score),
          scores: [ ...scores, [ id, network.score ] ]
        };
      }, { maxScore: -Infinity, minScore: Infinity, scores: [] }); // get scores

    const weights = scores.reduce(function(weights, [ id, score ]) { // iterate through scores
      return weights.set(id, (score - minScore) / (maxScore - minScore) * (1 - equality) + equality); // distribute weights based on score and equality
    }, new Map());

    const networks = new Map(); // new networks
    for (let i = this.#config`get population.size`; i > 0; i--) { // iterate through population and existing networks
      const reference = this.#networks.get(Ξ(...weights)); // get network

      const network = new this.#Network(reference); // create network
      networks.set(network.id, network); // set network

      network.Evolve(); // evolve network
    }

    for (const network of this.#networks.values()) // iterate through networks
      network.Deconstruct(); // deconstruct network
    this.#networks = networks; // set networks

    this.#status = 2; // set status to running

    return true;
  }

  Input(fn) {
    const reject = new RejectionHandler('Could not input data!');
    if (this.#status !== 2) reject.handle('Population must be in a running state!', this.#status); // if not running
    else if (typeof fn !== 'function') reject.handle('Invalid function!', fn); // if function is invalid

    for (const [ i, network ] of Object.entries([ ...this.#networks.values() ])) // iterate through networks
      if (!network.dead) // if network is alive
        network.Input(...fn(i)); // input data

    return this.alive; // return number of alive networks
  }

  #Network = class NeuralNetwork {
    #ID = ID.new('network');
    #_(reject) {
      if (!(reject instanceof RejectionHandler)) reject = new RejectionHandler('Invalid access to NeuralNetwork!');
      if (!ID.has(this.#ID, 'network')) reject.handle('Invalid network ID!', this.#ID); // if network ID is invalid

      return true;
    }

    #score = 0;
    #dead = false;

    #layers = new Map();
    #neuronMovers = new Map();

    #height;

    #updateMap = new Map(); // map of neurons to update

    #derivativeCache = [];
    #inputCache = [];
    constructor(reference) {
      this.#Neuron.prototype.network = this; // set network to neuron
      this.#Neuron.prototype.population = this.population; // set population to neuron
      this.#Neuron.prototype.config = this.config; // set config to neuron

      this.Reset(reference); // reset network
    }

    Reset(reference) {
      const reject = new RejectionHandler('Could not reset NeuralNetwork!');
      this.#_(reject); // check if network is deconstructed

      if ((!reference instanceof this.constructor) && reference !== undefined) reject.handle('Invalid reference!', reference); // if reference is invalid

      const config = this.config;
      for (const layer of this.#layers.values()) // iterate through layers
        for (const neuron of layer.values()) // iterate through neurons
          neuron.Deconstruct(); // deconstruct neuron

      this.#layers.clear(); // clear layers
      this.#height = 0; // reset height

      if (reference) {
        for (const [ depth, layer ] of reference.#layers.entries()) { // iterate through layers
          const newLayer = new Map(); // create new layer
          for (const [ y, neuron ] of layer.entries()) { // iterate through neurons
            const newNeuron = new this.#Neuron(depth, y, neuron.bias, this.#neuronMoverCallback); // create neuron
            newLayer.set(y, newNeuron); // set neuron

            for (const [ y1, synapse ] of neuron.inputSynapses.entries()) // iterate through synapses
              newNeuron.Connect(y1, synapse.weight); // connect neurons
          }
          this.#layers.set(depth, newLayer); // set layer

          this.#height = Math.max(this.#height, layer.size); // set height
        }

      } else {
        if (config`get network.dynamic`) // if network is dynamic
          for (const k of [ 'input', 'output' ]) { // iterate through input and output
            const height = config`get network.${k}.size`; // get height

            const layer = new Map(); // create layer
            for (let y = 0; y < height; y++) // iterate through size
              layer.set(y, new this.#Neuron(0, y, 0, this.#neuronMoverCallback)); // create neuron with a bias of 0
            this.#layers.set(k, layer); // set layer

            this.#height = Math.max(this.#height, height); // set height
          }
        else { // if network is static
          const heights = config`get network.layers`; // get heights
          for (let depth = 0; depth < heights.length; depth++) { // iterate through depths
            const height = heights[depth]; // get height

            const layer = new Map(); // create layer
            for (let y = 0; y < height; y++) // iterate through size
              layer.set(y, new this.#Neuron(depth, y, 0, this.#neuronMoverCallback)); // create neuron with a bias of 0
            this.#layers.set(depth, layer); // set layer

            this.#height = Math.max(this.#height, height); // set height
          }
        }
      }

      this.#CalculateUpdateMap(); // calculate update map
    }

    get score() { this.#_(); return this.#score; } // get score
    #Reward(output) { // reward
      const reject = new RejectionHandler('Could not reward NeuralNetwork!');
      this.#_(reject); // check if network is deconstructed
      if (this.#dead) reject.handle('Network is dead!', this.#dead); // if network is dead

      const reward = this.population.preloaded.rewardFunction(output); // calculate reward
      if (typeof reward !== 'number') reject.handle('Reward function produced an invalid value!', reward); // if reward is invalid

      if (this.population.preloaded.adapt) {
        const s = this.#score + reward; // calculate new score
        const δ = s - this.#score; // calculate delta (derivative)
        if (δ < 0 && this.#derivativeCache.last > 0) {
          output = this.#Adapt(this.#inputCache.last); // adapt network
          this.#derivativeCache = [ δ ]; // reset cache

          this.#score += this.population.preloaded.rewardFunction(output); // update score
        } else {
          if (Math.sign(δ) === Math.sign(this.#derivativeCache.last)) this.#derivativeCache.push(δ); // cache derivative
          else this.#derivativeCache = [ δ ]; // reset cache

          this.#score = s; // set score
        }
      } else this.#score = s; // set score

      return output; // return output
    }

    get dead() { this.#_(); return this.#dead; } // get dead
    set dead(v) { // set dead
      const reject = new RejectionHandler('Could not set NeuralNetwork.dead!');
      this.#_(reject); // check if network is deconstructed

      if (typeof v !== 'boolean') reject.handle('Dead must be a boolean!', v); // if dead is invalid

      return this.#dead = v; // set dead
    }

    get depth() { this.#_(); return this.#layers.size; } // get depth of network
    get height() { this.#_(); return this.#height; } // get height of network
    get heights() { // get heights of layers
      this.#_();
      return [ ...this.#layers.values().map(layer => layer.size) ] // get heights of layers
    }

    Neuron = { // neuron functions
      get: (depth, y) => this.#_() && this.#layers.get(depth).get(y), // get neuron
    }

    #neuronMoverCallback = {
      callback: (function(id, fn) {
        const reject = new RejectionHandler('Could set neuron mover!');
        this.#_(reject); // check if network is deconstructed

        if (!ID.has(id, 'neuron')) reject.handle('Invalid neuron ID!', id); // if neuron ID is invalid
        else if (typeof fn !== 'function') reject.handle('Invalid function!', fn); // if callback is invalid

        this.#neuronMovers.set(id, fn); // set neuron mover
      }).bind(this),
      onDeconstruction: (function(id) {
        this.#_(new RejectionHandler('Could not deconstruct neuron mover!')); // check if network is deconstructed

        this.#neuronMovers.delete(id); // remove neuron mover
      }).bind(this)
    }

    Evolve() { // evolve network
      this.#_(new RejectionHandler('Could not evolve network!')); // check if network is deconstructed

      const config = this.config;
      const dynamic = config`get network.dynamic`; // get dynamic value
      if (dynamic) { // if dynamic
        const layerMutations = config`run mutate.evolve.layer`; // get layer mutations
        for (let i = Math.min(layerMutations.get('remove'), this.#layers.size - 2); i > 0; i--) // iterate through remove mutations
          this.#RemoveLayer(Ξ(1, this.#layers.size - 1)); // remove layer
        for (let i = layerMutations.get('add'); i > 0; i--) // iterate through add mutations
          this.#AddLayer(); // add layer
      }

      for (let depth = 0; depth < this.depth; depth++) { // iterate through layers
        const layer = this.#layers.get(depth); // get layer
        const lastLayer = this.#layers.get(depth - 1); // get last layer

        if (dynamic && depth > 0 && depth < this.depth - 1) { // if dynamic and not input or output layer
          const neuronMutations = config`run mutate.evolve.neuron`; // get neuron mutations
          for (let i = Math.min(neuronMutations.get('remove'), layer.size - 1); i > 0; i--) // iterate through remove mutations
            this.#RemoveNeuron(layer.depth, Ξ(1, layer.size - 1)); // remove neuron
          for (let i = neuronMutations.get('add'); i > 0; i--) // iterate through add mutations
            this.#AddNeuron(layer.depth); // add neuron
        }

        for (const neuron2 of layer.values()) { // iterate through neurons
          const neuronMutations = config`run mutate.evolve.neuron`; // get neuron mutations
          if (neuronMutations.has('change')) // if change mutation
            neuron2.bias += neuronMutations.get('change'); // change bias

          if (neuron2.isInput) continue; // if input neuron, skip
          for (const neuron1 of lastLayer.values()) { // iterate through neurons in last layer
            const synapseMutations = config`run mutate.evolve.synapse`; // get synapse mutations
            if (neuron1.HasOutputSynapse(neuron2)) { // if synapse exists
              if (synapseMutations.has('remove')) // if remove mutation
                neuron1.RemoveOutputSynapse(neuron2); // remove synapse
              else if (synapseMutations.has('change')) // if change mutation
                neuron1.inputSynapses.get(neuron2).weight += synapseMutations.get('change'); // change synapse
            } else if (synapseMutations.has('add')) // if add mutation
              neuron1.Connect(neuron2.y, config`run synapse.weight.range`); // connect neurons
          }
        }
      }
    }

    #Adapt({ inputs, changed }) { // adapt network // FIX: Unneeded variable (?)
      const reject = new RejectionHandler('Could not adapt network!');
      this.#_(reject); // check if network is deconstructed
      if (this.#dead) reject.handle('Network is dead!', this.#dead); // if network is dead

      const best = { network: '', reward: -Infinity, output: [] }; // best network

      let reset, recreate;
      const iterate = this.population.preloaded.adaptIterations; // get number of iterations
      for (let i = 0; i < iterate; i++) { // iterate through iterations
        reset = '';
        recreate = '';

        const layers = this.#layers.entries(); // get layers
        for (const [ layerK, layer ] of layers) { // iterate through layers
          const neurons = layer.entries(); // get neurons
          for (const [ neuronK, neuron ] of neurons) { // iterate through neurons
            const mutations = this.config`run mutate.evolve.neuron`; // get mutations
            if (mutations.has('change')) { // if change mutation
              reset += `layers.get(${layerK}).get(${neuronK}).bias = ${neuron.bias};`; // reset bias

              neuron.bias += mutations.get('change'); // change bias
              recreate += `layers.get(${layerK}).get(${neuronK}).bias = ${neuron.bias};`; // recreate bias
            }

            const synapses = neuron.inputSynapses; // get input synapses
            for (const [ synapseK, synapse ] of synapses) { // iterate through synapses
              const mutations = this.config`run mutate.evolve.synapse`; // get mutations
              if (mutations.has('change')) { // if change mutation
                reset += `layers.get(${layerK}).get(${neuronK}).inputSynapses.get(${synapseK}).weight = ${synapse.weight};`; // reset weight

                synapse.weight += mutations.get('change'); // change weight
                recreate += `layers.get(${layerK}).get(${neuronK}).inputSynapses.get(${synapseK}).weight = ${synapse.weight};`; // recreate weight
              }
            }
          }
        }

        const updateSet = this.#GetUpdateSet(...changed); // get set of neurons to update
        for (const neuron of updateSet) // iterate through neurons to update
          neuron.Update(); // update neuron

        const output = this.output; // get output
        const reward = this.population.preloaded.rewardFunction(output); // calculate reward
        if (typeof reward !== 'number') reject.handle('Reward function produced an invalid value!', reward); // if reward is invalid
        else if (reward > best.reward) {
          best = { network: recreate, reward, output }; // if reward is better, update best

          if (i === iterate - 1) return output; // if last iteration is best, return output
        }

        new Function('layers', reset)(this.#layers); // reset network
      }

      new Function('layers', best.network)(this.#layers); // recreate best network
      this.#CalculateUpdateMap(); // calculate update map

      return best.output; // return output
    }

    #AddLayer() { // add layer (append)
      const reject = new RejectionHandler('Could not add layer!');
      this.#_(reject); // check if network is deconstructed

      const config = this.config;
      if (!config`get network.dynamic`) reject.handle('Network is not dynamic!', config`get network.dynamic`); // if network is not dynamic

      const depth = this.#layers.size; // get depth of new layer
      const height = this.#layers.last.size; // get height of previous layer

      const layer = new Map(); // create layer
      for (let y = 0; y < height; y++) // iterate through height
        layer.set(y, new this.#Neuron(depth, y, 0, this.#neuronMoverCallback)); // create neuron with a bias of 0

      this.#layers.set(depth, layer); // set layer
      for (const [ y, neuron ] of this.#layers.get(depth - 1).entries()) // iterate through neurons in previous layer
        neuron.Connect(y, 1); // connect neurons
    }

    #RemoveLayer(depth) { // remove layer
      const reject = new RejectionHandler('Could not remove layer!');
      this.#_(reject); // check if network is deconstructed

      const config = this.config;
      if (!config`get network.dynamic`) reject.handle('Network is not dynamic!', config`get network.dynamic`); // if network is not dynamic
      else if (depth <= 0 || depth >= this.depth - 1) reject.handle('Invalid depth!', depth); // if depth is invalid

      const layer = this.#layers.get(depth); // get layer
      for (const neuron of layer.values()) // iterate through neurons in layer
        neuron.Deconstruct(); // deconstruct neuron
      this.#layers.delete(depth); // delete layer

      for (let i = depth; i < this.depth; i++) { // iterate through layers after removed layer
        const layer = this.#layers.get(i + 1); // get layer
        this.#layers.set(i, layer); // set layer
        this.#layers.delete(i + 1); // delete layer

        for (const neuron of layer.values()) // iterate through neurons in layer
          this.#neuronMovers.get(neuron.id)(i); // move neuron
      }

      this.#height = Math.max(...this.heights); // set height
    }

    #AddNeuron(depth) { // add neuron (append)
      const reject = new RejectionHandler('Could not add neuron!');
      this.#_(reject); // check if network is deconstructed

      const config = this.config;
      if (!config`get network.dynamic`) reject.handle('Network is not dynamic!', config`get network.dynamic`); // if network is not dynamic
      else if (depth <= 0 || depth >= this.depth - 1) reject.handle('Invalid depth!', depth); // if depth is invalid

      const layer = this.#layers.get(depth); // get layer
      const height = layer.size; // get height

      const neuron = new this.#Neuron(depth, height, config`run neuron.bias.range`, this.#neuronMoverCallback); // create neuron
      layer.set(height, neuron); // set neuron

      this.#height = Math.max(this.#height, height + 1); // set heights
    }

    #RemoveNeuron(depth, y) { // remove neuron
      const reject = new RejectionHandler('Could not remove neuron!');
      this.#_(reject); // check if network is deconstructed

      const config = this.config;
      if (!config`get network.dynamic`) reject.handle('Network is not dynamic!', config`get network.dynamic`); // if network is not dynamic
      else if (depth < 0 || depth >= this.depth) reject.handle('Invalid depth!', depth); // if depth is invalid
      else if (depth === 0) reject.handle('Cannot remove neuron from input layer!', depth); // if depth is input layer
      else if (depth === this.depth - 1) reject.handle('Cannot remove neuron from output layer!', depth); // if depth is output layer

      const layer = this.#layers.get(depth); // get layer
      if (!layer.has(y)) reject.handle('Neuron does not exist!', depth, y); // if neuron does not exist

      layer.get(y).Deconstruct(); // deconstruct neuron
      layer.delete(y); // delete neuron

      for (let i = y; i < layer.size; i++) // iterate through neurons after removed neuron
        this.#neuronMovers.get(layer.get(i).id)(depth, i); // move neuron

      this.#height = Math.max(...this.heights); // set height
    }

    #CalculateUpdateMap() { // calculate map of neurons to update
      this.#_(new RejectionHandler('Could not calculate update map!')); // check if network is deconstructed

      this.#updateMap.clear(); // clear update map
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
      this.#_(new RejectionHandler('Could not get update set!')); // check if network is deconstructed

      let set = new Set(); // create set
      for (const k of ks) // iterate through keys
        set = set.union(this.#updateMap.get(k)); // add neurons to set

      return set; // return set
    }

    Input(...inputs) {
      const reject = new RejectionHandler('Could not input data!');
      this.#_(reject); // check if network is deconstructed
      if (this.#dead) reject.handle('Network is dead!', this.#dead); // if network

      const inputNeurons = this.#layers.first; // get input neurons
      if (inputs.length !== inputNeurons.size) reject.handle('Invalid number of inputs!', inputs); // if invalid number of inputs

      const changed = [];
      for (const i in inputs) {
        const input = inputs[i]; // get input
        if (typeof input !== 'number') reject.handle('Invalid input!', input); // if input is invalid
        else if (input !== inputNeurons.get(i).value) changed.push(i); // if input has changed

        inputNeurons.get(i).value = input; // set input
      }

      this.#inputCache.push({ inputs, changed }); // cache inputs

      const updateSet = this.#GetUpdateSet(...changed); // get set of neurons to update
      for (const neuron of updateSet) // iterate through neurons to update
        neuron.Update(); // update neuron

      const bestOutput = this.#Reward(this.output); // reward network
      this.population.preloaded.updateFunction(bestOutput); // update function
    }

    get output() {
      this.#_();
      if (this.#dead) new RejectionHandler('Could not get output!').handle('Network is dead!', this.#dead); // if network is dead

      return [ ...this.#layers.last.values() ].map(neuron => neuron.value); // return output values
    }

    Deconstruct() {
      this.#_(new RejectionHandler('Could not deconstruct NeuralNetwork!')); // check if network is deconstructed

      ID.delete(this.#ID, 'network'); // delete network ID
      delete this.#ID; // delete ID

      delete this.#score; // delete score

      for (const layer of this.#layers.values()) // iterate through layers
        for (const neuron of layer.values()) // iterate through neurons
          neuron.Deconstruct(); // deconstruct neuron
      delete this.#layers; // delete layers

      delete this.#neuronMovers; // delete neuron movers

      delete this.#height; // delete height

      delete this.#updateMap; // delete update map

      delete this.#derivativeCache; // delete derivative cache
      delete this.#inputCache; // delete input cache
    }
    #Neuron = class Neuron {
      #id = ID.new('neuron');
      #_(reject) {
        if (!(reject instanceof RejectionHandler)) reject = new RejectionHandler('Invalid access to Neuron!');
        if (this.#id === undefined) reject.handle('Neuron is deconstructed!');

        return true;
      }

      #onDeconstruction; // on deconstruction callback

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

      constructor(depth, y, bias = NaN, { callback, onDeconstruction }) {
        this.#Synapse.prototype.neuron = this; // set neuron to synapse
        this.#Synapse.prototype.network = this.network; // set network to synapse
        this.#Synapse.prototype.population = this.population; // set population to synapse
        this.#Synapse.prototype.config = this.config; // set config to synapse

        const reject = new RejectionHandler('Could not construct Neuron!');
        if (typeof depth !== 'number' || typeof y !== 'number') reject.handle('Invalid depth or y value!', depth, y); // if depth or y value is invalid
        else if (this.network.Neuron.get(depth, y)) reject.handle('Neuron already exists!', depth, y); // if neuron already exists
        else if (typeof bias !== 'number') reject.handle('Invalid bias!', bias); // if bias is invalid
        else if (callback !== 'function') reject.handle('Invalid callback!', callback); // if callback is invalid

        this.#depth = depth; // set depth
        this.#y = y; // set y value

        const { min, max } = this.config`get neuron.bias.range`; // get bias range
        this.#bias = (+bias).clamp(min, max); // set bias

        this.UpdateUpdateFunction(); // update update function

        const neuron = this;
        callback((function(newDepth = this.#depth, newY = this.#y) { // move neuron
          const reject = new RejectionHandler('Could not move Neuron!');
          if (typeof newDepth !== 'number' || typeof newY !== 'number') reject.handle('Invalid depth or y value!', newDepth, newY); // if depth or y value is invalid
          else if (this.network.Neuron.get(newDepth, newY)) reject.handle('Neuron already exists!', newDepth, newY); // if neuron already exists

          this.#depth = newDepth; // set depth
          this.#y = newY; // set y value
        }).bind(neuron));

        this.#onDeconstruction = onDeconstruction; // set on deconstruction callback
      }

      get id() { this.#_(); return this.#id; }

      get depth() { this.#_(); return this.#depth; } // get depth
      get isInput() { this.#_(); return this.#depth === 0; } // get if neuron is input neuron
      get isOutput() { this.#_(); return this.#depth === this.network.depth - 1; } // get if neuron is output neuron

      get y() { this.#_(); return this.#y; } // get y value

      get bias() { this.#_(); return this.#bias; } // get bias
      set bias(b) { // set bias
        const reject = new RejectionHandler('Could not set Neuron.bias!');
        this.#_(reject); // check if neuron is deconstructed

        if (typeof b !== 'number') reject.handle('Bias must be a number!', b); // if bias is invalid

        const { min, max } = this.config`get neuron.bias.range`; // get bias range
        this.#bias = (+b).clamp(min, max); // set bias

        this.UpdateUpdateFunction(); // update update function

        return this.#bias; // return bias
      }

      get value() { return this.#value; } // get value
      set value(v) { // set value
        const reject = new RejectionHandler('Could not set Neuron.value!');
        this.#_(reject); // check if neuron is deconstructed

        if (typeof v !== 'number') reject.handle('Value must be a number!', v); // if value is invalid

        return this.#value = v; // set value
      }

      UpdateUpdateFunction() { // update the update function
        this.#_(new RejectionHandler('Could not update Neuron!')); // check if neuron is deconstructed

        const neurons = new Set(); // create set of neurons
        let i = 0;
        for (const synapse of this.#synapses.input.values()) // iterate through input synapses
          neurons.add(`neurons[${i++}].value * ${synapse.weight}`); // add input synapse to set

        this.#updateFunction = new Function('neurons', 'activationFn' `
          return activationFn(${neurons.join(' + ')}, ${this.#bias});
        `).bind({}, this.#synapses.input.keys()); // return update function
      }

      Update() { // update neuron
        this.#_(new RejectionHandler('Could not update Neuron!')); // check if neuron is deconstructed
        this.#value = this.#updateFunction(this.network.preloaded.activationFunction); // update value
      }

      get inputs() { // get input synapses
        this.#_(); // check if neuron is deconstructed
        return [ ...this.#synapses.input.keys() ].map(neuron => neuron.id); // get input synapses as array of neuron IDs
      }
      get outputs() { // get output synapses
        this.#_(); // check if neuron is deconstructed
        return [ ...this.#synapses.output.keys() ].map(neuron => neuron.id); // get output synapses as array of neuron IDs
      }

      get inputSynapses() { this.#_(); return this.#synapses.input.entries(); } // get input synapses
      get outputSynapses() { this.#_(); return this.#synapses.output.entries(); } // get output synapses

      HasInputSynapse(neuron) {
        this.#_(new RejectionHandler('Could not check for synapse!')); // check if neuron is deconstructed
        return this.#synapses.input.has(neuron);
      } // check if neuron has input synapse with another neuron
      HasOutputSynapse(neuron) { // check if neuron has output synapse with another neuron
        this.#_(new RejectionHandler('Could not check for synapse!')); // check if neuron is deconstructed
        return this.#synapses.output.has(neuron);
      }
      HasSynapse(neuron) {
        this.#_(new RejectionHandler('Could not check for synapse!')); // check if neuron is deconstructed
        return this.#synapses.input.has(neuron) || this.#synapses.output.has(neuron); // check if neuron has synapse with another neuron
      }

      RemoveInputSynapse(neuron) {
        const reject = new RejectionHandler('Could not remove input synapse!', this.#depth, this.#y, neuron);
        this.#_(reject); // check if neuron is deconstructed

        if (!this.#synapses.input.has(neuron))
          reject.handle('Synapse does not exist!'); // if synapse does not exist

        let exists;
        try {
          this.#synapses.input.get(neuron).id; // get synapse ID to check if synapse is deconstructed
          exists = true;
        } catch (e) { this.#synapses.input.delete(neuron); } // if synapse is deconstructed, delete synapse

        if (exists) reject.handle('Synapse not deconstructed!'); // if synapse still exists
        this.UpdateUpdateFunction(); // update update function
      }

      RemoveOutputSynapse(neuron) {
        const reject = new RejectionHandler('Could not remove output synapse!', this.#depth, this.#y, neuron);
        this.#_(reject); // check if neuron is deconstructed

        if (!this.#synapses.output.has(neuron))
          reject.handle('Synapse does not exist!'); // if synapse does not exist

        let exists;
        try {
          this.#synapses.output.get(neuron).id; // get synapse ID to check if synapse is deconstructed
          exists = true;
        } catch (e) { this.#synapses.output.delete(neuron); } // if synapse is deconstructed, delete synapse

        if (exists) reject.handle('Synapse not deconstructed!'); // if synapse still exists
        this.UpdateUpdateFunction(); // update update function
      }

      Connect(y, weight) {
        const reject = new RejectionHandler('Could not connect Neuron!');
        this.#_(reject); // check if neuron is deconstructed

        if (typeof y !== 'number')
          reject.handle('Invalid y value!', y); // if y value is invalid
        else if (this.isOutput)
          reject.handle('Output neurons cannot connect to other neurons!', this.#depth, y); // if neuron is output neuron
        else if (this.network.heights[this.#depth + 1] >= y)
          reject.handle('No neuron exists at y value!', this.#depth, this.network.heights[this.#depth + 1], y); // if no neuron exists at y value

        const neuron = this.network.Neuron.get(this.#depth + 1, y); // get neuron
        if (this.#synapses.output.has(neuron))
          reject.handle('Connection already exists!', this.#depth, y); // if connection already exists

        const synapse = new this.#Synapse(this, neuron, weight); // create synapse
        this.#synapses.output.set(neuron, synapse); // set output synapse

        neuron.ReceiveConnection(this.#y); // receive connection

        this.UpdateUpdateFunction(); // update update function
      }

      ReceiveConnection(synapse) {
        const reject = new RejectionHandler('Could not receive connection!');
        this.#_(reject); // check if neuron is deconstructed

        if (!(synapse instanceof this.#Synapse))
          reject.handle('Invalid synapse!', synapse); // if synapse is invalid
        else if (this.isInput)
          reject.handle('Input neurons cannot receive connections!', this.#depth, this.#y); // if neuron is input neuron

        const input = synapse.input; // get input neuron
        if (this.#synapses.input.has(input))
          reject.handle('Connection already received!', this.#depth, input); // if connection already exists
        else if (!neuron.hasOutputSynapse(this))
          reject.handle('Connection does not exist!', this.#depth, y); // if connection does not exist

        this.#synapses.input.set(input, synapse); // set input synapse

        this.UpdateUpdateFunction(); // update update function
      }

      Disconnect(y) {
        const reject = new RejectionHandler('Could not disconnect Neuron!');
        this.#_(reject); // check if neuron is deconstructed

        if (typeof y !== 'number')
          reject.handle('Invalid y value!', y); // if y value is invalid
        else if (this.isInput)
          reject.handle('Input neurons cannot disconnect from other neurons!', this.#depth, y); // if neuron is input neuron
        else if (this.network.heights[this.#depth + 1] >= y)
          reject.handle('No neuron exists at y value!', this.#depth, this.network.heights[this.#depth + 1], y); // if no neuron exists at y value

        const neuron = this.network.Neuron.get(this.#depth + 1, y); // get next neuron
        if (!this.#synapses.output.has(neuron))
          reject.handle('Connection does not exist!', this.#depth, y); // if connection does not exist

        this.#synapses.output.get(neuron).Deconstruct(); // deconstruct synapse
      }

      get pointOnInputPath() { this.#_(); return this.#pointsOnInputPath.size > 0; } // get point on input path
      get inputPaths() { this.#_(); return this.#pointsOnInputPath.copy(); } // get input paths

      get pointOnOutputPath() { this.#_(); return this.#pointsOnOutputPath.size > 0; } // get point on output path
      get outputPaths() { this.#_(); return this.#pointsOnOutputPath.copy(); } // get output paths

      get updateGroups() { // get update groups
        this.#_(new RejectionHandler('Could not get update groups!')); // check if neuron is deconstructed

        if (this.#pointsOnOutputPath.size === 0) return new Set(); // if not connected to any output neurons, don't update
        else return this.#pointsOnInputPath.copy(); // update based on what input neurons are connected to
      }

      UpdateInputPath() { // check if neuron is a point on input path
        this.#_(new RejectionHandler('Could not update input path!')); // check if neuron is deconstructed

        this.#pointsOnInputPath.clear(); // clear input paths
        if (this.isInput) this.#pointsOnInputPath.add(this.#y); // if neuron is input neuron, add to input paths
        else for (const [ neuron ] of this.#synapses.input) // iterate through input synapses
          this.#pointsOnInputPath = this.#pointsOnInputPath.union(neuron.inputPaths); // add input paths

        return this.#pointsOnInputPath.copy(); // return input paths
      }

      UpdateOutputPath() { // check if neuron is a point on output path
        this.#_(new RejectionHandler('Could not update output path!')); // check if neuron is deconstructed

        this.#pointsOnOutputPath.clear(); // clear output paths
        if (this.isOutput) this.#pointsOnOutputPath.add(this.#y); // if neuron is output neuron, add to output paths
        else for (const [ neuron ] of this.#synapses.output) // iterate through output synapses
          this.#pointsOnOutputPath = this.#pointsOnOutputPath.union(neuron.outputPaths); // add output paths

        return this.#pointsOnOutputPath.copy(); // return output paths
      }

      Deconstruct() { // deconstruct neuron
        this.#_(new RejectionHandler('Could not deconstruct Neuron!')); // check if neuron is deconstructed

        ID.delete(this.#id, 'neuron'); // delete ID

        this.#onDeconstruction(this.#id); // run on deconstruction callback
        delete this.#onDeconstruction; // delete on deconstruction callback

        delete this.#id; // delete ID

        delete this.#depth; // delete depth
        delete this.#y; // delete y value

        delete this.#bias; // delete bias
        delete this.#value; // delete value

        delete this.#updateFunction; // delete update function

        for (const synapse of this.#synapses.input.values()) // iterate through input synapses
          synapse.Deconstruct(); // deconstruct input synapse
        delete this.#synapses.input; // delete input synapses

        for (const synapse of this.#synapses.output.values()) // iterate through output synapses
          synapse.Deconstruct(); // deconstruct output synapse
        delete this.#synapses.output; // delete output synapses

        delete this.#pointsOnInputPath; // delete input paths
        delete this.#pointsOnOutputPath; // delete output paths

        return true; // return true
      }

      #Synapse = class Synapse {
        #id = ID.new('synapse');
        #_(reject) {
          if (!(reject instanceof RejectionHandler)) reject = new RejectionHandler('Invalid access to Synapse!');
          if (this.#id === undefined) reject.handle('Synapse is deconstructed!');

          return true;
        }

        #input; // input neuron
        #output; // output neuron

        #weight; // weight of synapse

        constructor(input, output, weight = NaN) {
          this.#input = input; // set input neuron
          this.#output = output; // set output neuron

          const reject = new RejectionHandler('Could not construct Synapse!');
          if (!(input instanceof this.neuron.constructor))
            reject.handle('Invalid input neuron!', input); // if input neuron is invalid
          else if (!(output instanceof this.neuron.constructor))
            reject.handle('Invalid output neuron!', output); // if output neuron is invalid
          else if (input.hasOutputSynapse(output))
            reject.handle('Synapse already exists!', input, output); // if synapse already exists
          else if (typeof weight !== 'number')
            reject.handle('Weight must be a number!', weight); // if weight is invalid

          const { min, max } = this.config`get synapse.weight.range`; // get weight range
          this.#weight = (+weight).clamp(min, max); // set weight
        }

        get id() { this.#_(); return this.#id; }

        get input() { this.#_(); return this.#input; } // get input neuron
        get output() { this.#_(); return this.#output; } // get output neuron

        get weight() { this.#_(); return this.#weight; } // get weight
        set weight(w) { // set weight
          const reject = new RejectionHandler('Could not set Synapse.weight!');
          this.#_(reject); // check if synapse is deconstructed

          if (typeof w !== 'number') reject.handle('Weight must be a number!', w); // if weight is invalid

          cache.set('weight', this.#weight); // cache weight
          const { min, max } = this.config`get synapse.weight.range`; // get weight range
          this.#weight = (+w).clamp(min, max); // set weight

          if (w !== cache.get('weight')) { // if weight has changed
            this.input.UpdateUpdateFunction(); // update input neuron update function
            this.output.UpdateUpdateFunction(); // update output neuron update function
          }

          cache.delete('weight'); // delete weight cache
          return this.#weight; // return weight
        }

        Deconstruct() { // deconstruct synapse
          this.#_(new RejectionHandler('Could not deconstruct Synapse!')); // check if synapse is deconstructed

          ID.delete(this.#id, 'synapse'); // delete ID
          delete this.#id; // delete ID

          this.#input.RemoveOutputSynapse(this.#output); // remove output synapse
          delete this.#input; // delete input neuron

          this.#output.RemoveInputSynapse(this.#input); // remove input synapse
          delete this.#output; // delete output neuron

          delete this.#weight; // delete weight

          return true; // return true
        }
      };
    }
  }
}