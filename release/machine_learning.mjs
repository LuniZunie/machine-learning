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
import Rejection from './module/debug.mjs';
import ID from './module/id.mjs';

import Config from './module/config.mjs';
import config from './config/population.mjs';

export default class Population {
  #networks = new Map();
  #idRef = new Map();

  #statistics = {
    'generation': 0, // current generation

    'best': null, // highest network reward
    'worst': null, // lowest network reward

    'graph': {}, // graph of best, worst, average, and median reward
  };

  #outputFunction = null;

  #status = 0; // 0: off, 1: idle, 2: active
  constructor(cfg) { // create new Population (cfg: object)
    if (cfg) config.put(cfg); // merge config with default config
  }

  // get config() { return this.#config; } // get config //FIXME: reimplement, need to make it so config cannot be changed while population is active
  set config(cfg) {
    config.put(cfg); // merge config with default config
  }

  get statistics() {
    const alive = [ ...this.#networks.values() ].filter(network => network.alive).length;
    return {
      'generation': this.#statistics.generation,

      'population': this.#networks.size,
      'alive': alive,
      'dead': this.#networks.size - alive,

      'best': this.#statistics.best,
      'worst': this.#statistics.worst,

      'graph': structuredClone(this.#statistics.graph),
    }
  }

  #StatisticsCallback = (function(obj) {
    return; // do nothing
    if (obj.score > this.#statistics.best) this.#statistics.best = obj.score;
    if (obj.score < this.#statistics.worst) this.#statistics.worst = obj.score;
    if (obj.graph) {
      this.#statistics.graph[obj.graph.index] ??= [];
      this.#statistics.graph[obj.graph.index].push([ obj.graph.id, obj.graph.timestamp, obj.graph.score ]);
    }
  }).bind(this);

  get status() { return [ 'off', 'idle', 'active' ][this.#status]; } // get status as string
  Start(safeMode) { // start population (safeMode: boolean)
    const reject = new Rejection('Could not start Population', 'safe_mode', safeMode); // create rejection handler
    if (this.#status !== 0) // if status is not equal to off, return false (if safeMode is true) or throw error (if safeMode is false)
      return !safeMode && reject.handle('Population status other than "off"', 'status', this.status);

    this.#statistics = {
      'generation': 0,

      'best': null,
      'worst': null,

      'graph': {},
    };

    for (const network of this.#networks.values()) network.Destruct(); // reset all networks
    this.#networks.clear(); // clear network map
    this.#idRef.clear(); // clear id reference

    const $size = config.root.population.size[Config.get](); // get population size
    for (let i = 0; i < $size; i++) { // create networks
      const network = this.#ConstructNeuralNetwork(i); // construct network
      this.#networks.set(network.id, network); // add network to network map
      network.Evolve(); // evolve network

      this.#idRef.set(i, network.id); // set id reference
    }
    this.#status = 2; // set status to active

    return true;
  }

  Resume(safeMode) { // resume population (safeMode: boolean)
    const reject = new Rejection('Could not resume Population', 'safe_mode', safeMode); // create rejection handler
    if (this.#status !== 1) // if status is not equal to idle, return false (if safeMode is true) or throw error (if safeMode is false)
      return !safeMode && reject.handle('Population status other than "idle"', 'status', this.status);
    this.#status = 2; // set status to active

    return true;
  }

  Pause(safeMode) { // pause population (safeMode: boolean)
    const reject = new Rejection('Could not pause Population', 'safe_mode', safeMode); // create rejection handler
    if (this.#status !== 2) // if status is not equal to active, return false (if safeMode is true) or throw error (if safeMode is false)
      return !safeMode && reject.handle('Population status other than "active"', 'status', this.status);
    this.#status = 1; // set status to idle

    return true;
  }

  Restart(safeMode) { // restart population (safeMode: boolean)
    const reject = new Rejection('Could not restart Population', 'safe_mode', safeMode); // create rejection handler
    if (this.#status === 0) // if status is equal to off, return false (if safeMode is true) or throw error (if safeMode is false)
      return !safeMode && reject.handle('Population status is "off"', 'status', this.status);
    this.#status = 0; // set status to off

    return this.Start(safeMode); // start population
  }

  Stop(safeMode) { // stop population (safeMode: boolean)
    const reject = new Rejection('Could not stop Population', 'safe_mode', safeMode); // create rejection handler
    if (this.#status === 0) // if status is equal to off, return false (if safeMode is true) or throw error (if safeMode is false)
      return !safeMode && reject.handle('Population status is "off"', 'status', this.status);
    this.#status = 0; // set status to off

    return true;
  }

  Evolve() { // evolve population
    const reject = new Rejection('Could not evolve Population'); // create rejection handler
    if (this.#status !== 2) // if status is not equal to active
      return reject.handle('Population status other than "active"', 'status', this.status);
    this.#status = 1; // set status to idle

    const $equality = config.root.population.equality[Config.get](); // get equality config
    const { maxScore, minScore, scores } = [ ...this.#networks.entries() ]
      .reduce(function({ maxScore, minScore, scores }, [ id, network ]) { // get scores
        return {
          maxScore: Math.max(maxScore, network.score),
          minScore: Math.min(minScore, network.score),
          scores: [ ...scores, [ id, network.score ] ],
        };
      }, { maxScore: -Infinity, minScore: Infinity, scores: [] }); // initialize scores

    const weights = scores.reduce(function(weights, [ id, score ]) { // iterate over scores
      const weight = (score - minScore) / (maxScore - minScore); // calculate weight
      const equalize = weight * (1 - $equality) + $equality; // equalize weight
      return weights.set(id, equalize); // set equalized weight
    }, new Map()); // initialize weights

    this.#idRef.clear(); // clear id reference
    const networks = new Map(); // create new network map
    for (let i = config.root.population.size[Config.get]() - 1; i >= 0; i--) { // iterate over population size
      const ref = this.#networks.get(weights.Ξweighted()); // get reference network

      const network = this.#ConstructNeuralNetwork(i, ref); // construct network
      networks.set(network.id, network); // add network to network map
      network.Evolve(); // evolve network

      this.#idRef.set(i, network.id); // set id reference
    }

    for (const network of this.#networks.values()) network.Destruct(); // destruct all networks
    this.#networks = networks; // set networks to new network map

    this.#statistics.generation++; // increment generation
    this.#status = 2; // set status to active

    return true;
  }

  Input(fn) { // input function (fn: function)
    const reject = new Rejection('Could not input data into Population', 'function', fn); // create rejection handler
    if (this.#status !== 2) // if status is not equal to active
      return reject.handle('Population status other than "active"', 'status', this.status);
    else if (typeof fn !== 'function') return reject.handle('Input data is not a function'); // if input is not a function, throw error

    for (const network of this.#networks.values()) // iterate over networks
      if (network.alive) network.Input(...fn(network.index)); // input data into network if network is alive

    return true;
  }

  Output(fn) {
    const reject = new Rejection('Could not output data from Population', 'function', fn); // create rejection handler
    if (typeof fn !== 'function') return reject.handle('Output data is not a function'); // if output is not a function, throw error

    this.#outputFunction = fn; // set output function
    return true;
  }

  Kill(i) { // kill NeuralNetwork
    const reject = new Rejection('Could not kill NeuralNetwork', 'index', i); // create rejection handler
    if (this.#status !== 2) // if status is not equal to active
      return reject.handle('Population status other than "active"', 'status', this.status);
    else if (typeof i !== 'number') return reject.handle('Invalid index type'); // if index is not a number, throw error
    else if (i < 0 || i >= this.#networks.size) return reject.handle('No network at index'); // if index is invalid, throw error

    this.#networks.get(this.#idRef.get(i)).alive = false; // kill network
    return true;
  }

  KillAll() { // kill all NeuralNetworks
    const reject = new Rejection('Could not kill all NeuralNetworks'); // create rejection handler
    if (this.#status !== 2) // if status is not equal to active
      return reject.handle('Population status other than "active"', 'status', this.status);

    for (const network of this.#networks.values()) network.alive = false; // kill all networks
    return true;
  }

  get alive() { return [ ...this.#networks.values() ].filter(network => network.alive).length; } // get number of alive networks
  get dead() { return [ ...this.#networks.values() ].filter(network => network.dead).length; } // get number of dead networks

  get size() { return config.root.population.size[Config.get](); } // get population size

  #OutputCallback = (function(index, ...outputs) {
    if (this.#outputFunction) this.#outputFunction(index, ...outputs); // call output function if it exists
  }).bind(this);

  #ConstructNeuralNetwork(index, ref) { // construct network (index: number, ref: NeuralNetwork)
    const reject = new Rejection('Could not construct network', 'index', index, 'ref', ref); // create rejection handler
    if (typeof index !== 'number') return reject.handle('Invalid index type'); // if index is not a number, throw error
    else if (!(ref instanceof NeuralNetwork) && ref !== undefined) return reject.handle('Invalid reference type'); // if reference is not a NeuralNetwork, throw error

    return new NeuralNetwork(
      { population: this }, // pass
      { Output: this.#OutputCallback, Statistics: this.#StatisticsCallback }, // callback
      index, // index
      ref // reference
    ); // create new network
  }
}

class NeuralNetwork {
  #id = ID.new('network'); // create new network id
  #_(reject) {
    if (!(reject instanceof Rejection)) reject = new Rejection('Invalid access to NeuralNetwork'); // create rejection handler
    if (!ID.has('network', this.#id)) reject.handle('Network does not exist', 'id', this.#id); // if network does not exist, throw error

    return true;
  }

  #index = 0; // network index

  #alive = true; // network alive status

  #score = 0; // network score
  #rewards = []; // newest reward at index 0

  #height = 0; // network height
  #layers = new Map(); // network layers
  #expectedHeights = []; // expected layer heights for error handling

  #updateMap = new Map(); // map of neurons to update
  #neuronMovers = new Map(); // id map of neuron movers

  #cache = {
    'input': [],
    'rewardDerivative': [],
  };

  #callback = { // network callback
    'Output': null,
    'Statistics': null,
  };
  constructor(pass, callback, index, ref) { // create new NeuralNetwork (callback: object, index: number, ref: NeuralNetwork)
    for (const [ k, v ] of Object.entries(pass)) // iterate over pass
      this[k] = v; // set value passed

    const reject = new Rejection('Could not construct NeuralNetwork', 'pass', pass, 'callback', callback, 'index', index, 'ref', ref); // create rejection handler
    if (typeof pass !== 'object' || pass === null) return reject.handle('Invalid pass type'); // if pass is not an object, throw
    else if (typeof callback !== 'object' || callback === null) return reject.handle('Invalid callback type'); // if callback is not an object, throw error
    else if (typeof index !== 'number') return reject.handle('Invalid index type'); // if index is not a number, throw error
    else if (!(ref instanceof NeuralNetwork) && ref !== undefined) return reject.handle('Invalid reference type'); // if reference is not a NeuralNetwork, throw error

    for (const [ k, fn ] of Object.entries(callback)) // iterate over callback
      if (typeof fn !== 'function' || !(k in this.#callback)) return reject.handle('Invalid callback type', 'callback/key', k); // if callback is not a function or key is invalid, throw error
      else this.#callback[k] = fn; // set callback

    this.#index = index; // set network index

    this.Reset(ref); // reset network
  }

  get id() { return this.#id; } // get network id
  get index() { return this.#index; } // get network index

  get score() { this.#_(new Rejection('Could not access network score')); return this.#score; } // get network score

  get alive() { this.#_(new Rejection('Could not access network alive status')); return this.#alive; } // get network alive status
  set alive(b) {
    const reject = new Rejection('Could not set network alive status', 'alive', b); // create rejection handler
    this.#_(reject); // check network existence

    if (typeof b !== 'boolean') return reject.handle('Invalid status type'); // if status is not a boolean, throw error
    return this.#alive = b; // set network alive status
  }

  get dead() { this.#_(new Rejection('Could not access network alive status')); return !this.#alive; } // get network dead status
  set dead(b) {
    const reject = new Rejection('Could not set network alive status', 'dead', b); // create rejection handler
    this.#_(reject); // check network existence

    if (typeof b !== 'boolean') return reject.handle('Invalid status type'); // if status is not a boolean, throw error
    return this.#alive = !b; // set network dead status
  }

  get depth() { this.#_(new Rejection('Could not access network depth')); return this.#layers.size; } // get network depth

  get height() { this.#_(new Rejection('Could not access network height')); return this.#height; } // get network height
  get heights() {  // get network heights
    this.#_(new Rejection('Could not access network heights'));
    return [ ...this.#layers.values() ].map(layer => layer.size); // return array of layer sizes
  }

  get expectedDepth() { this.#_(new Rejection('Could not access network expected depth')); return this.#expectedHeights.length; } // get network expected depth
  expectedHeight(depth) { // get network expected height (depth: number)
    const reject = new Rejection('Could not access network expected height', 'depth', depth); // create rejection handler
    this.#_(reject); // check network existence

    if (typeof depth !== 'number') return reject.handle('Invalid depth type'); // if depth is not a number, throw error
    else if (depth < 0 || depth >= this.#expectedHeights.length) return reject.handle('No expected height at depth'); // if depth is invalid, throw error

    return this.#expectedHeights[depth]; // return expected height
  }

  Layer = { } // public layer functions

  #Layer = { // private layer functions
    New: (function() { // create new layer (append)
      const reject = new Rejection('Could not create new layer'); // create rejection handler
      this.#_(reject); // check network existence

      const $dynamic = config.root.network.dynamic[Config.get](); // get dynamic config
      if (!$dynamic) return reject.handle('Network is not dynamic', 'dynamic', $dynamic); // if network is not dynamic, throw error

      const depth = this.#layers.size; // get layer depth
      const height = this.#layers.last.size; // get height of previous layer

      this.#expectedHeights[depth] = height; // set expected height

      const layer = new Map(); // create new layer
      for (let y = 0; y < height; y++)
        layer.set(y, this.#ConstructNeuron(depth, y, 0)); // create new neuron with bias 0

      this.#layers.set(depth, layer); // set layer in network
      for (const [ y, neuron ] of this.#layers.get(depth - 1).entries()) // iterate over previous layer
        neuron.Synapse.Connect(y, 1); // connect neuron to new layer with weight 1
    }).bind(this),
    Delete: (function(depth) { // delete layer (depth: number)
      const reject = new Rejection('Could not delete layer', 'depth', depth); // create rejection handler
      this.#_(reject); // check network existence

      const $dynamic = config.root.network.dynamic[Config.get](); // get dynamic config
      if (!$dynamic) return reject.handle('Network is not dynamic', 'dynamic', $dynamic); // if network is not dynamic, throw error
      else if (depth < 0 || depth >= this.#layers.size) return reject.handle('No layer at depth'); // if depth is invalid, throw error
      else if (depth === 0) return reject.handle('Cannot delete input layer'); // if depth is input layer, throw error
      else if (depth === this.#layers.size - 1) return reject.handle('Cannot delete output layer'); // if depth is output layer, throw error

      this.#expectedHeights.splice(depth, 1); // remove expected height

      for (const neuron of this.#layers.get(depth).values()) neuron.Destruct(); // destruct all neurons in layer
      this.#layers.delete(depth); // delete layer from network

      for (let i = depth; i < this.#layers.size; i++) { // iterate over layers after deleted layer
        const layer = this.#layers.get(i + 1); // get layer
        this.#layers.set(i, layer); // set layer at previous index

        for (const neuron of layer.values())
          this.#neuronMovers.get(neuron.id)(i); // move neuron to previous layer
        this.#layers.delete(i + 1); // delete layer
      }

      this.#height = Math.max(...this.heights); // update network height
    }).bind(this),
  }

  Neuron = { // public neuron functions
    Get: (function(depth, y) { // get neuron (depth: number, y: number)
      const reject = new Rejection('Could not get neuron', 'depth', depth, 'y', y); // create rejection handler
      this.#_(reject); // check network existence

      if (typeof depth !== 'number') return reject.handle('Invalid depth type'); // if depth is not a number, throw error
      else if (depth < 0 || depth >= this.expectedDepth) return reject.handle('No layer at depth'); // if depth is invalid, throw error
      else if (typeof y !== 'number') return reject.handle('Invalid y type'); // if y is not a number, throw error
      else if (y < 0 || y >= this.expectedHeight(depth)) return reject.handle('No neuron at y'); // if y is invalid, throw error

      return this.#layers.get(depth).get(y); // return neuron
    }).bind(this),
  }

  #Neuron = { // private neuron functions
    New: (function(depth) { // create new neuron (depth: number) (append)
      const reject = new Rejection('Could not create neuron', 'depth', depth); // create rejection handler
      this.#_(reject); // check network existence

      const $dynamic = config.root.network.dynamic[Config.get](); // get dynamic config
      if (!$dynamic) return reject.handle('Network is not dynamic', 'dynamic', $dynamic); // if network is not dynamic, throw error
      else if (depth < 0 || depth >= this.#layers.size) return reject.handle('No layer at depth'); // if depth is invalid, throw error
      else if (depth === 0) return reject.handle('Cannot create neuron in input layer'); // if depth is input layer, throw error
      else if (depth === this.#layers.size - 1) return reject.handle('Cannot create neuron in output layer'); // if depth is output layer, throw error

      this.#expectedHeights[depth]++; // increment expected height

      const layer = this.#layers.get(depth); // get layer
      const neuron = this.#ConstructNeuron(depth, layer.size, config.root.neuron.bias.range[Config.call]()); // create new neuron with random bias

      layer.set(layer.size, neuron); // set neuron in layer
      this.#height = Math.max(this.#height, layer.size); // update network height
    }).bind(this),
    Delete: (function(depth, y) { // delete neuron (depth: number, y: number)
      const reject = new Rejection('Could not delete neuron', 'depth', depth, 'y', y); // create rejection handler
      this.#_(reject); // check network existence

      const $dynamic = config.root.network.dynamic[Config.get](); // get dynamic config
      if (!$dynamic) return reject.handle('Network is not dynamic', 'dynamic', $dynamic); // if network is not dynamic, throw error
      else if (depth < 0 || depth >= this.#layers.size) return reject.handle('No layer at depth'); // if depth is invalid, throw error
      else if (depth === 0) return reject.handle('Cannot delete neuron in input layer'); // if depth is input layer, throw error
      else if (depth === this.#layers.size - 1) return reject.handle('Cannot delete neuron in output layer'); // if depth is output layer, throw error

      const layer = this.#layers.get(depth); // get layer
      if (typeof y !== 'number' || y < 0 || y >= layer.size) return reject.handle('Invalid y'); // if y is invalid, throw error

      this.#expectedHeights[depth]--; // decrement expected height

      layer.get(y).Destruct(); // destruct neuron
      layer.delete(y); // delete neuron from layer

      for (let i = y; i < layer.size; i++) {// iterate over neurons after deleted neuron
        const neuron = layer.get(i + 1); // get neuron
        this.#neuronMovers.get(neuron.id)(undefined, i); // move neuron to previous index
        layer.set(i, neuron); // set neuron at previous index
        layer.delete(i + 1); // delete neuron
      }
      this.#height = Math.max(...this.heights); // update network height
    }).bind(this),

    Mover: { // neuron mover callback
      Callback: (function(id, fn) { // neuron mover callback (id: number, fn: function)
        const reject = new Rejection('Could not set neuron mover callback', 'id', id, 'function', fn); // create rejection handler
        this.#_(reject); // check network existence

        if (!ID.has('neuron', id)) return reject.handle('Neuron does not exist', 'id', id); // if neuron does not exist, throw error
        else if (typeof fn !== 'function') return reject.handle('Invalid function type'); // if function is not a function, throw error

        this.#neuronMovers.set(id, fn); // set neuron mover
      }).bind(this),
      OnDestruction: (function(id) { // neuron mover destruction callback (id: number)
        this.#_(new Rejection('Could not destroy neuron mover', 'id', id)); // check network existence
        this.#neuronMovers.delete(id); // delete neuron mover
      }).bind(this),
    }
  }

  #CalculateUpdateMap() { // calculate map of neurons to update
    const reject = new Rejection('Could not calculate update map'); // create rejection handler
    this.#_(reject); // check network existence

    this.#updateMap.clear(); // clear update map
    for (const layer of [ ...this.#layers.values() ].reverse()) // iterate over layers in reverse
      for (const neuron of layer.values()) // iterate over neurons
        neuron.UpdateOutputPaths(); // update neuron output paths

    for (const layer of this.#layers.values()) // iterate over layers in order
      for (const neuron of layer.values()) { // iterate over neurons
        neuron.UpdateInputPaths(); // update neuron input paths

        const updateGroups = [ ...neuron.updateGroups ]; // get update groups (groups based on input neurons "y" values)
        for (const group of updateGroups) {
          if (!this.#updateMap.has(group)) this.#updateMap.set(group, new Set()); // create new group if it does not exist
          this.#updateMap.get(group).add(neuron); // add neuron to group
        }
      }
  }

  #GetUpdateSet(...ks) { // get update set (ks: number)
    const reject = new Rejection('Could not get update set', 'keys', ks); // create rejection handler
    this.#_(reject); // check network existence

    let set = new Set(); // create new set
    for (const k of ks)
      set = set.union(this.#updateMap.get(+k) ?? new Set()); // get union of sets
    return set; // return set
  }

  #UpdateAll() { // update all neurons
    const reject = new Rejection('Could not update all neurons'); // create rejection handler
    this.#_(reject); // check network existence

    for (const layer of this.#layers.values()) // iterate over layers
      for (const neuron of layer.values()) // iterate over neurons
        neuron.Update(); // update neuron
  }

  Input(...inputs) { // input data (inputs: number[])
    const reject = new Rejection('Could not input data into NeuralNetwork', 'inputs', inputs); // create rejection handler
    this.#_(reject); // check network existence

    const inputNeurons = [ ...this.#layers.get(0).values() ]; // get input neurons
    if (!this.#alive) return reject.handle('Network is dead', 'alive', this.#alive); // if network is dead, throw error
    else if (inputs.length !== inputNeurons.length) return reject.handle('Invalid input size'); // if input size is invalid, throw error

    const changed = new Set(); // create new set
    for (const i in inputs) { // iterate over inputs
      const input = inputs[i]; // get input
      if (typeof input !== 'number') return reject.handle('Input must be a number', 'input', input); // if input is not a number, throw error
      else if (input !== inputNeurons[i].value) changed.add(i); // if input is different, add neuron to changed set

      inputNeurons[i].value = input; // set input value
    }
    this.#cache.input.push({ changed }); // add input to cache

    const updateSet = this.#GetUpdateSet(...changed); // get update set
    for (const neuron of updateSet) neuron.Update(); // update neurons in set

    const bestOutput = this.#Reward(this.output); // reward network and possibly adapt
    this.#callback.Output(this.#index, ...bestOutput); // call output callback to output data
  }

  get output() { // get network output
    const reject = new Rejection('Could not get network output'); // create rejection handler
    this.#_(reject); // check network existence

    if (!this.#alive) return reject.handle('Network is dead', 'alive', this.#alive); // if network is dead, throw error

    return [ ...this.#layers.last.values() ].map(neuron => neuron.value); // return output values
  }

  #Reward(output) { // reward network (output: number[])
    const reject = new Rejection('Could not reward NeuralNetwork', 'output', output); // create rejection handler
    this.#_(reject); // check network existence

    if (!this.#alive) return reject.handle('Network is dead', 'alive', this.#alive); // if network is dead, throw error

    const $rewardFunction = config.root.network.reward.function[Config.get](); // get reward function
    const reward = $rewardFunction(this.#index, ...output) || 0; // get reward
    if (typeof reward !== 'number') return reject.handle('Reward function did not return a number', 'reward', reward); // if reward is not a number, throw error

    let score = this.#score + reward; // calculate new score
    if (config.root.mutate.adapt[Config.get]()) { // if network should adapt and at least 1 score derivative exists
      const δ = reward - (this.#rewards[0] || 0); // calculate score change
      if (δ < 0 && this.#cache.rewardDerivative.last > 0) { // if last score was a relative maximum
        output = this.#Adapt(this.#cache.input.last); // adapt network and get best adaptation
        this.#cache.rewardDerivative = []; // clear score derivatives

        const reward = $rewardFunction(this.#index, ...output) || 0; // get reward
        if (typeof reward !== 'number') return reject.handle('Reward function did not return a number', 'reward', reward); // if reward is not a number, throw error

        score = this.#score + reward; // calculate new score
      } else { // if last score was not a relative maximum – help with lowering memory usage
        if (Math.sign(δ) === Math.sign(this.#cache.rewardDerivative.last ?? δ)) this.#cache.rewardDerivative.push(δ); // add score derivative
        else this.#cache.rewardDerivative = [ δ ]; // reset score derivatives
      }
    }
    this.#score = score; // set score
    this.#rewards.unshift(reward); // add reward to rewards

    const statisticsObject = { score }; // create statistics object
    statisticsObject.graph = { index: this.#index, id: this.#id, timestamp: Date.now(), score }; // update graph
    this.#callback.Statistics(statisticsObject); // call statistics callback

    return output; // return output
  }

  #Adapt({ changed }) { // adapt network (changed: Set<number>)
    const reject = new Rejection('Could not adapt NeuralNetwork', 'changed', changed); // create rejection handler
    this.#_(reject); // check network existence

    if (!this.#alive) return reject.handle('Network is dead', 'alive', this.#alive); // if network is dead, throw error

    const $rewardFunction = config.root.network.reward.function[Config.get](); // get reward function
    let best = { network: '', reward: -Infinity, output: [] }; // create best adaptation object
    for (let i = config.root.mutate.adapt.iterations[Config.get](); i > 0; i--) { // iterate over adaptation iterations
      let reset = ''; // create reset function string
      let recreate = ''; // create recreation function string

      for (const [ depth, layer ] of this.#layers.entries()) // iterate over layers
        for (const [ y, neuron ] of layer.entries()) { // iterate over neurons
          const mutations = config.root.mutate.adapt.neuron[Config.call](); // get neuron adaptations
          if (mutations.get('change')) { // if change adaptation exists
            reset += `layers.get(${depth}).get(${y}).bias = ${neuron.bias};\n`; // reset neuron value

            neuron.bias += mutations.get('change'); // change neuron value
            recreate += `layers.get(${depth}).get(${y}).bias = ${neuron.bias};\n`; // recreate neuron value
          }

          const synapses = neuron.Synapse.input.list.entries(); // get neuron input synapses
          for (const [ input, synapse ] of synapses) { // iterate over synapses
            const mutations = config.root.mutate.adapt.synapse[Config.call](); // get synapse adaptations
            if (mutations.get('change')) { // if change adaptation exists
              reset += `layers.get(${depth}).get(${neuron.y}).Synapse.input.Get(layers.get(${depth - 1}).get(${input.y})).weight = ${synapse.weight};\n`; // reset synapse value

              synapse.weight += mutations.get('change'); // change synapse value
              recreate += `layers.get(${depth}).get(${neuron.y}).Synapse.input.Get(layers.get(${depth - 1}).get(${input.y})).weight = ${synapse.weight};\n`; // recreate synapse value
            }
          }

          neuron.CalculateUpdateFunction(); // calculate update function //TEST
        }

      this.#CalculateUpdateMap(); // recalculate update map
      const updateSet = this.#GetUpdateSet(...changed); // get update set
      for (const neuron of updateSet) neuron.Update(); // update neurons in set

      const output = this.output; // get network output
      const reward = $rewardFunction(this.#index, ...output) || 0; // get reward
      if (typeof reward !== 'number') return reject.handle('Reward function did not return a number', 'reward', reward); // if reward is not a number, throw error
      else if (reward > best.reward) {
        best = { network: recreate, reward, output }; // update best adaptation
        if (i === 1) return output; // return output if first iteration, slight optimization
      }

      new Function('layers', reset)(this.#layers); // reset network
    }

    new Function('layers', best.network)(this.#layers); // recreate best adaptation
    this.#CalculateUpdateMap(); // recalculate update map

    return best.output; // return best output
  }

  Evolve() { // evolve network
    const reject = new Rejection('Could not evolve NeuralNetwork'); // create rejection handler
    this.#_(reject); // check network existence

    const $dynamic = config.root.network.dynamic[Config.get](); // get dynamic config
    if ($dynamic) {
      const mutations = config.root.mutate.evolve.layer[Config.call](); // get network evolutions
      for (let i = Math.min(mutations.get('remove'), this.#layers.size - 2); i > 0; i--) // iterate over layer removals
        this.#Layer.Delete(Ξ.ℤ.ee(0, this.#layers.size - 1)); // delete random layer
      for (let i = mutations.get('add'); i > 0; i--) this.#Layer.New(); // iterate over layer additions
    }

    for (let depth = 0; depth < this.#layers.size; depth++) { // iterate over layers
      const layer = this.#layers.get(depth); // get layer
      const lastLayer = this.#layers.get(depth - 1); // get last layer

      if ($dynamic && depth > 0 && depth < this.#layers.size - 1) { // if network is dynamic and layer is not input or output layer
        const mutations = config.root.mutate.evolve.neuron[Config.call](); // get layer evolutions
        for (let i = Math.min(mutations.get('remove'), layer.size - 1); i > 0; i--) // iterate over neuron removals
          this.#Neuron.Delete(depth, Ξ.ℤ.ie(0, layer.size - 1)); // delete random neuron
        for (let i = mutations.get('add'); i > 0; i--) this.#Neuron.New(depth); // iterate over neuron additions
      }

      for (const neuron2 of layer.values()) { // iterate over neurons
        const mutations = config.root.mutate.evolve.neuron[Config.call](); // get neuron evolutions
        if (mutations.get('change')) // if change evolutions exists
          neuron2.bias += mutations.get('change'); // change neuron value

        if (neuron2.isInput) continue; // skip input neurons
        for (const neuron1 of lastLayer.values()) { // iterate over neurons in last layer
          const mutations = config.root.mutate.evolve.synapse[Config.call](); // get synapse evolutions
          if (neuron1.Synapse.output.Has(neuron2)) { // if synapse exists
            if (mutations.get('remove')) // if remove evolutions exists
              neuron1.Synapse.output.Delete(neuron2); // remove synapse
            else if (mutations.get('change')) // if change evolutions exists
              neuron1.Synapse.output.Get(neuron2).weight += mutations.get('change'); // change synapse value
          } else if (mutations.get('add')) // if add evolutions exists
            neuron1.Synapse.Connect(neuron2.y, config.root.synapse.weight.range[Config.call]()); // connect neurons
        }

        neuron2.CalculateUpdateFunction(); // calculate update function //TEST
      }
    }

    this.#CalculateUpdateMap(); // calculate update map
  }

  Reset(ref) { // reset network (ref: NeuralNetwork)
    const reject = new Rejection('Could not reset NeuralNetwork', 'ref', ref); // create rejection handler
    this.#_(reject); // check network existence

    if (!(ref instanceof NeuralNetwork) && ref !== undefined) return reject.handle('Invalid reference type'); // if reference is not a NeuralNetwork, throw error

    this.#score = 0; // reset score
    this.#rewards = []; // reset rewards
    this.#cache = { 'input': [], 'rewardDerivative': [] }; // reset cache

    for (const layer of this.#layers.values()) // iterate over layers
      for (const neuron of layer.values()) neuron.Destruct(); // destruct neurons in layer
    this.#layers.clear(); // clear layers
    this.#expectedHeights = []; // reset expected heights
    this.#height = 0; // reset height

    if (ref)
      for (const [ depth, layer ] of ref.#layers.entries()) { // iterate over reference layers
        this.#expectedHeights[depth] = layer.size; // set expected height

        const newLayer = new Map(); // create new layer
        for (const [ y, neuron1 ] of layer.entries()) { // iterate over neurons
          const newNeuron = this.#ConstructNeuron(depth, y, neuron1.bias); // create new neuron
          newLayer.set(y, newNeuron); // set neuron in layer
        }
        this.#layers.set(depth, newLayer); // set layer in network
        this.#height = Math.max(this.#height, newLayer.size); // update network height

        for (const [ y, neuron1 ] of layer.entries())
          for (const [ neuron2, synapse ] of neuron1.Synapse.input.list.entries()) // iterate over synapses
            this.#layers.get(depth - 1).get(neuron2.y).Synapse.Connect(y, synapse.weight); // connect neurons
      }
    else {
      if (config.root.network.dynamic[Config.get]()) // if network is dynamic
        for (const k of [ 'inputs', 'outputs' ]) { // iterate over input and output layers
          const $height = config.root.network[k][Config.get](); // get layer height
          const depth = { 'inputs': 0, 'outputs': 1 }[k]; // get layer depth
          this.#expectedHeights[depth] = $height; // set expected height

          const layer = new Map(); // create new layer
          for (let y = 0; y < $height; y++) // iterate over height
            layer.set(y, this.#ConstructNeuron(+depth, y, 0)); // create new neuron with bias 0
          this.#layers.set(+depth, layer); // set layer in network based on input or output
          this.#height = Math.max(this.#height, $height); // update network height
        }
      else { // if network is static
        const $heights = config.root.network.layers[Config.get]();
        for (const depth in $heights) { // iterate over layer heights
          const height = $heights[depth]; // get layer height
          this.#expectedHeights[depth] = height; // set expected height

          const layer = new Map(); // create new layer
          for (let y = 0; y < height; y++) // iterate over height
            layer.set(y, this.#ConstructNeuron(+depth, y, 0)); // create new neuron with bias 0
          this.#layers.set(+depth, layer); // set layer in network
          this.#height = Math.max(this.#height, height); // update network height
        }
      }
    }

    this.#CalculateUpdateMap(); // calculate update map
  }

  #ConstructNeuron(depth, y, bias) { // construct neuron (depth: number, y: number, bias: number)
    const reject = new Rejection('Could not construct neuron', 'depth', depth, 'y', y, 'bias', bias); // create rejection handler
    this.#_(reject); // check network existence

    if (typeof depth !== 'number') return reject.handle('Invalid depth type'); // if depth is not a number, throw error
    else if (depth < 0 || depth >= this.#expectedHeights.length) return reject.handle('No layer at depth'); // if depth is invalid, throw error
    else if (typeof y !== 'number') return reject.handle('Invalid y type'); // if y is not a number, throw error
    else if (y < 0 || y >= this.#expectedHeights[depth]) return reject.handle('No neuron at y'); // if y is invalid, throw error
    else if (typeof bias !== 'number') return reject.handle('Invalid bias type'); // if bias is not a number, throw error

    return new Neuron(
      { population: this.population, network: this },
      this.#Neuron.Mover,
      depth,
      y,
      bias,
    );
  }

  Destruct() { // destruct network
    const reject = new Rejection('Could not destruct NeuralNetwork'); // create rejection handler
    this.#_(reject); // check network existence

    ID.delete('network', this.#id); // delete network id
    this.#id = undefined; // reset network id

    this.#index = undefined; // reset network index

    this.#alive = undefined; // reset network alive status

    this.#score = undefined; // reset network score
    this.#rewards = undefined; // reset network rewards

    this.#height = undefined; // reset network height
    for (const layer of this.#layers.values()) // iterate over layers
      for (const neuron of layer.values()) neuron.Destruct(); // destruct neurons in layer
    this.#layers = undefined; // reset network layers

    this.#updateMap = undefined; // reset update map
    this.#neuronMovers = undefined; // reset neuron movers

    this.#cache = undefined; // reset cache

    this.#callback = undefined; // reset network callback

    return true;
  }
}

class Neuron {
  #id = ID.new('neuron'); // create new neuron id
  #_(reject) {
    if (!(reject instanceof Rejection)) reject = new Rejection('Invalid access to Neuron'); // create rejection handler
    if (!ID.has('neuron', this.#id)) reject.handle('Neuron does not exist', 'id', this.#id); // if neuron does not exist, throw error

    return true;
  }

  #depth; // neuron depth
  #y; // neuron y value

  #bias = NaN; // neuron bias
  #value = NaN; // neuron value
  #updateFunction = null; // calculate neuron value function for optimization

  #synapses = {
    input: new Map(),
    output: new Map(),
  };
  #pointsOnPath = {
    input: new Set(),
    output: new Set(),
  };

  #callback = { // neuron callback
    'Callback': null,
    'OnDestruction': null,
  };
  constructor(pass, callback, depth, y, bias = NaN) { // create new Neuron (pass: object, callback: object, depth: number, y: number, bias: number)
    for (const [ k, v ] of Object.entries(pass)) // iterate over pass
      this[k] = v; // set pass values

    const reject = new Rejection('Could not construct Neuron', 'pass', pass, 'callback', callback, 'depth', depth, 'y', y, 'bias', bias); // create rejection handler
    if (typeof pass !== 'object' || pass === null) return reject.handle('Invalid pass type'); // if pass is not an object, throw error
    else if (typeof callback !== 'object' || callback === null) return reject.handle('Invalid callback type'); // if callback is not an object, throw
    else if (typeof depth !== 'number') return reject.handle('Invalid depth type'); // if depth is not a number, throw error
    else if (depth < 0 || depth >= this.network.expectedDepth) return reject.handle('No layer at depth'); // if depth is invalid, throw error
    else if (typeof y !== 'number') return reject.handle('Invalid y type'); // if y is not a number, throw error
    else if (y < 0 || y >= this.network.expectedHeight(depth)) return reject.handle('No neuron at y'); // if y is invalid, throw error
    else if (typeof bias !== 'number') return reject.handle('Invalid bias type'); // if bias is not a number, throw error

    for (const [ k, fn ] of Object.entries(callback)) // iterate over callback
      if (typeof fn !== 'function' || !(k in this.#callback)) return reject.handle('Invalid callback type', 'callback/key', k); // if callback is not a function or key is invalid, throw error
      else this.#callback[k] = fn; // set callback

    this.#depth = depth; // set neuron depth
    this.#y = y; // set neuron y value

    this.#bias = bias.clamp(...config.root.neuron.bias.range[Config.get]()); // set neuron bias
    this.CalculateUpdateFunction(); // calculate neuron value function

    const neuron = this; // create neuron reference
    this.#callback.Callback(this.#id, (function(depth = neuron.#depth, y = neuron.#y) { // neuron mover callback
      const reject = new Rejection('Could not move neuron', 'depth', depth, 'y', y); // create rejection handler
      if (typeof depth !== 'number') return reject.handle('Invalid depth type'); // if depth is not a number, throw error
      else if (depth < 0 || depth >= this.network.expectedDepth) return reject.handle('No layer at depth'); // if depth is invalid, throw error
      else if (typeof y !== 'number') return reject.handle('Invalid y type'); // if y is not a number, throw error
      else if (y < 0 || y >= this.network.expectedHeight(depth)) return reject.handle('No neuron at y'); // if y is invalid, throw error

      this.#depth = depth; // set neuron depth
      this.#y = y; // set neuron y value
    }).bind(neuron)); // set neuron mover callback
  }

  get id() { this.#_(new Rejection('Could not access neuron id')); return this.#id; } // get neuron id

  get depth() { this.#_(new Rejection('Could not access neuron depth')); return this.#depth; } // get neuron depth
  get y() { this.#_(new Rejection('Could not access neuron y value')); return this.#y; } // get neuron y value

  get isInput() { this.#_(new Rejection('Could not access neuron input status')); return this.#depth === 0; } // get neuron input status
  get isHidden() { this.#_(new Rejection('Could not access neuron hidden status')); return this.#depth > 0 && this.#depth < this.network.depth - 1; } // get neuron hidden status
  get isOutput() { this.#_(new Rejection('Could not access neuron output status')); return this.#depth === this.network.depth - 1; } // get neuron output status

  get bias() { this.#_(new Rejection('Could not access neuron bias')); return this.#bias; } // get neuron bias
  set bias(n) { // set neuron bias
    const reject = new Rejection('Could not set neuron bias', 'bias', n); // create rejection handler
    this.#_(reject); // check neuron existence

    if (typeof n !== 'number') return reject.handle('Invalid bias type'); // if bias is not a number, throw error

    return this.#bias = n.clamp(...config.root.neuron.bias.range[Config.get]()); // return neuron bias
  }

  get value() { this.#_(new Rejection('Could not access neuron value')); return this.#value; } // get neuron value
  set value(n) { // set neuron value
    const reject = new Rejection('Could not set neuron value', 'value', n); // create rejection handler
    this.#_(reject); // check neuron existence

    if (typeof n !== 'number') return reject.handle('Invalid value type'); // if value is not a number, throw error
    return this.#value = n; // set neuron value
  }

  Synapse = { // public synapse functions
    input: Object.defineProperties({}, { // public input synapse functions
      list: {
        get: (function() { // get input synapses list
          this.#_(new Rejection('Could not access neuron input synapses list')); // check neuron existence
          return this.#synapses.input.copy(); // return copy of input synapses
        }).bind(this)
      },
      neurons: {
        get: (function() { // get input synapse neuron
          this.#_(new Rejection('Could not access neuron input synapse neuron')); // check neuron existence
          return [ ...this.#synapses.input.keys() ].map(neuron => neuron.id); // return array of input synapse neuron ids
        }).bind(this)
      },
      Has: {
        value: (function(neuron) { // check if input synapse exists (neuron: Neuron)
          const reject = new Rejection('Could not check if input synapse exists', 'neuron', neuron); // create rejection handler
          this.#_(reject); // check neuron existence

          if (!(neuron instanceof Neuron)) return reject.handle('Invalid neuron type'); // if neuron is not a Neuron, throw error
          return this.#synapses.input.has(neuron); // return if input synapse exists
        }).bind(this)
      },
      Get: {
        value: (function(neuron) { // get input synapse (neuron: Neuron)
          const reject = new Rejection('Could not get input synapse', 'neuron', neuron); // create rejection handler
          this.#_(reject); // check neuron existence

          if (!(neuron instanceof Neuron)) return reject.handle('Invalid neuron type'); // if neuron is not a Neuron, throw error
          else if (!this.#synapses.input.has(neuron)) return reject.handle('Input synapse does not exist'); // if input synapse does not exist, throw error

          return this.#synapses.input.get(neuron); // return input synapse
        }).bind(this)
      },
      Delete: {
        value: (function(neuron) { // delete input synapse (neuron: Neuron)
          const reject = new Rejection('Could not delete input synapse', 'neuron', neuron); // create rejection handler
          this.#_(reject); // check neuron existence

          if (!(neuron instanceof Neuron)) return reject.handle('Invalid neuron type'); // if neuron is not a Neuron, throw error
          else if (!this.#synapses.input.has(neuron)) return reject.handle('Input synapse does not exist'); // if input synapse does not exist, throw error

          let exists;
          try {
            void this.#synapses.input.get(neuron).id; // check if synapse exists
            this.#synapses.input.delete(neuron); // delete synapse
            exists = true; // if program did not throw error, synapse exists
          } catch { } // if program threw error, synapse does not exist

          if (!exists) return reject.handle('Input synapse does not exist'); // if synapse exists, throw error
        }).bind(this),
      },
    }),
    output: Object.defineProperties({}, { // public output synapse functions
      list: {
        get: (function() { // get output synapses list
          this.#_(new Rejection('Could not access neuron output synapses list')); // check neuron existence
          return this.#synapses.output.copy(); // return copy of output synapses
        }).bind(this)
      },
      neurons: {
        get: (function() { // get output synapse neuron
          this.#_(new Rejection('Could not access neuron output synapse neuron')); // check neuron existence
          return [ ...this.#synapses.output.keys() ].map(neuron => neuron.id); // return array of output synapse neuron ids
        }).bind(this)
      },
      Has: {
        value: (function(neuron) { // check if output synapse exists (neuron: Neuron)
          const reject = new Rejection('Could not check if output synapse exists', 'neuron', neuron); // create rejection handler
          this.#_(reject); // check neuron existence

          if (!(neuron instanceof Neuron)) return reject.handle('Invalid neuron type'); // if neuron is not a Neuron, throw error
          return this.#synapses.output.has(neuron); // return if output synapse exists
        }).bind(this)
      },
      Get: {
        value: (function(neuron) { // get output synapse (neuron: Neuron)
          const reject = new Rejection('Could not get output synapse', 'neuron', neuron); // create rejection handler
          this.#_(reject); // check neuron existence

          if (!(neuron instanceof Neuron)) return reject.handle('Invalid neuron type'); // if neuron is not a Neuron, throw error
          else if (!this.#synapses.output.has(neuron)) return reject.handle('Output synapse does not exist'); // if output synapse does not exist, throw error

          return this.#synapses.output.get(neuron); // return output synapse
        }).bind(this)
      },
      Delete: {
        value: (function(neuron) { // delete output synapse (neuron: Neuron)
          const reject = new Rejection('Could not delete output synapse', 'neuron', neuron); // create rejection handler
          this.#_(reject); // check neuron existence

          if (!(neuron instanceof Neuron)) return reject.handle('Invalid neuron type'); // if neuron is not a Neuron, throw error
          else if (!this.#synapses.output.has(neuron)) return reject.handle('Output synapse does not exist'); // if output synapse does not exist, throw error

          let exists;
          try {
            void this.#synapses.output.get(neuron).id; // check if synapse exists
            this.#synapses.output.delete(neuron); // delete synapse
            exists = true; // if program did not throw error, synapse exists
          } catch { } // if program threw error, synapse does not exist

          if (!exists) return reject.handle('Output synapse does not exist'); // if synapse exists, throw error
        }).bind(this),
      },
    }),

    Has: (function(neuron) { // check if synapse exists (neuron: Neuron)
      const reject = new Rejection('Could not check if synapse exists', 'neuron', neuron); // create rejection handler
      this.#_(reject); // check neuron existence

      if (!(neuron instanceof Neuron)) return reject.handle('Invalid neuron type'); // if neuron is not a Neuron, throw error
      return this.#synapses.input.has(neuron) || this.#synapses.output.has(neuron); // return if synapse exists
    }).bind(this),

    Connect: (function(y, weight) { // connect neuron (y: number, weight: number)
      const reject = new Rejection('Could not connect neurons', 'y', y, 'weight', weight); // create rejection handler
      this.#_(reject); // check neuron existence

      if (typeof y !== 'number') return reject.handle('Invalid y type'); // if y is not a number, throw error
      else if (y < 0 || y >= this.network.heights[this.#depth + 1]) return reject.handle('No neuron at y'); // if y is invalid, throw error
      else if (this.isOutput) return reject.handle('Cannot connect output neuron'); // if neuron is output neuron, throw error
      else if (typeof weight !== 'number') return reject.handle('Invalid weight type'); // if weight is not a number, throw error

      const neuron = this.network.Neuron.Get(this.#depth + 1, y); // get neuron
      if (this.#synapses.output.has(neuron)) return reject.handle('Output synapse already exists'); // if output synapse exists, throw error

      const synapse = this.#ConstructSynapse(neuron, weight); // construct synapse
      this.#synapses.output.set(neuron, synapse); // create output synapse
      neuron.Synapse.ReceiveConnection(synapse); // receive connection
    }).bind(this),
    ReceiveConnection: (function(synapse) { // receive connection (synapse: Synapse)
      const reject = new Rejection('Could not receive connection', 'synapse', synapse); // create rejection handler
      this.#_(reject); // check neuron existence

      if (!(synapse instanceof Synapse)) return reject.handle('Invalid synapse type'); // if synapse is not a Synapse, throw error

      const input = synapse.input; // get input neuron
      if (this.#synapses.input.has(input)) return reject.handle('Input synapse already exists'); // if input synapse exists, throw error
      else if (!input.Synapse.output.Has(this)) return reject.handle('Output synapse does not exist'); // if output synapse does not exist, throw error

      this.#synapses.input.set(input, synapse); // create input synapse
    }).bind(this),

    Disconnect: (function(y) { // disconnect neuron (y: number)
      const reject = new Rejection('Could not disconnect neurons', 'y', y); // create rejection handler
      this.#_(reject); // check neuron existence

      if (typeof y !== 'number') return reject.handle('Invalid y type'); // if y is not a number, throw error
      else if (y < 0 || y >= this.network.heights[this.#depth + 1]) return reject.handle('No neuron at y'); // if y is invalid, throw error
      else if (this.isOutput) return reject.handle('Cannot disconnect output neuron'); // if neuron is output neuron, throw error

      const neuron = this.network.Get(this.#depth + 1, y); // get neuron
      if (!this.#synapses.output.has(neuron)) return reject.handle('Output synapse does not exist'); // if output synapse does not exist, throw error

      this.#synapses.output.get(neuron).Destruct(); // destruct synapse
    }).bind(this),
  }

  get inputPaths() { this.#_(new Rejection('Could not access neuron input paths')); return this.#pointsOnPath.input.copy(); } // get neuron input paths
  get outputPaths() { this.#_(new Rejection('Could not access neuron output paths')); return this.#pointsOnPath.output.copy(); } // get neuron output paths
  get updateGroups() {
    this.#_(new Rejection('Could not access neuron update groups')); // check neuron existence
    if (this.#pointsOnPath.output.size) return this.#pointsOnPath.input.copy(); // return copy of output paths
    else return new Set(); // if neuron has no output paths, return empty set
  }

  UpdateInputPaths() { // update neuron input paths
    const reject = new Rejection('Could not update neuron input paths'); // create rejection handler
    this.#_(reject); // check neuron existence

    this.#pointsOnPath.input.clear(); // clear input paths
    if (this.isInput) this.#pointsOnPath.input.add(this.#y); // if neuron is input, add neuron to input paths
    else for (const neuron of this.#synapses.input.keys()) // iterate over input synapses
      this.#pointsOnPath.input = this.#pointsOnPath.input.union(neuron.inputPaths); // add input paths
    return this.#pointsOnPath.input.copy(); // return copy of input paths
  }

  UpdateOutputPaths() { // update neuron output paths
    const reject = new Rejection('Could not update neuron output paths'); // create rejection handler
    this.#_(reject); // check neuron existence

    this.#pointsOnPath.output.clear(); // clear output paths
    if (this.isOutput) this.#pointsOnPath.output.add(this.#y); // if neuron is output, add neuron to output paths
    else for (const neuron of this.#synapses.output.keys()) // iterate over output synapses
      this.#pointsOnPath.output = this.#pointsOnPath.output.union(neuron.outputPaths); // add output paths
    return this.#pointsOnPath.output.copy(); // return copy of output paths
  }

  CalculateUpdateFunction() { // calculate neuron value function
    const reject = new Rejection('Could not calculate neuron update function'); // create rejection handler
    this.#_(reject); // check neuron existence

    const calculations = [ ...this.#synapses.input.values() ]
      .map((_, i) => `neurons[${i}].value * synapses[${i}].weight`); // create calculations array

    this.#updateFunction = new Function(
      'activate', 'neuron', 'neurons', 'synapses', // parameters
      `return activate(${calculations.join(' + ') || '0'} + neuron.bias);`, // code
    ).bind(
      {}, // this
      config.root.neuron.activation.function[Config.get](), // activation function
      this, // neuron
      [ ...this.#synapses.input.keys() ], // input neurons
      [ ...this.#synapses.input.values() ], // input synapses
    ); // create neuron value function
  }

  Update() { // update neuron value
    const reject = new Rejection('Could not update neuron value'); // create rejection handler
    this.#_(reject); // check neuron existence

    this.#value = this.#updateFunction(); // update neuron value
  }

  #ConstructSynapse(neuron, weight) { // construct synapse (neuron: Neuron, weight: number)
    const reject = new Rejection('Could not construct synapse', 'neuron', neuron, 'weight', weight); // create rejection handler
    this.#_(reject); // check neuron existence

    if (!(neuron instanceof Neuron)) return reject.handle('Invalid neuron type'); // if neuron is not a Neuron, throw error
    else if (typeof weight !== 'number') return reject.handle('Invalid weight type'); // if weight is not a number, throw error

    return new Synapse(
      { population: this.population, network: this.network, neuron: this }, // pass
      this, // input neuron
      neuron, // output neuron
      weight, // synapse weight
    );
  }

  Destruct() { // destruct neuron
    const reject = new Rejection('Could not destruct Neuron'); // create rejection handler
    this.#_(reject); // check neuron existence

    for (const synapse of this.#synapses.input.values()) synapse.Destruct(); // destruct input synapses
    for (const synapse of this.#synapses.output.values()) synapse.Destruct(); // destruct output synapses

    ID.delete('neuron', this.#id); // delete neuron id
    this.#id = undefined; // reset neuron id

    this.#depth = undefined; // reset neuron depth
    this.#y = undefined; // reset neuron y value

    this.#bias = undefined; // reset neuron bias
    this.#value = undefined; // reset neuron value
    this.#updateFunction = undefined; // reset neuron value function

    this.#synapses = undefined; // reset neuron synapses

    this.#pointsOnPath = undefined; // reset neuron paths

    this.#callback = undefined; // reset neuron callback

    return true;
  }
}

class Synapse {
  #id = ID.new('synapse'); // create new synapse id
  #_(reject) {
    if (!(reject instanceof Rejection)) reject = new Rejection('Invalid access to Synapse'); // create rejection handler
    if (!ID.has('synapse', this.#id)) reject.handle('Synapse does not exist', 'id', this.#id); // if synapse does not exist, throw error

    return true;
  }

  #input; // input neuron
  #output; // output neuron

  #weight = NaN; // synapse weight

  constructor(pass, input, output, weight = NaN) { // create new Synapse (pass: Object, input: Neuron, output: Neuron, weight: number)
    for (const [ k, v ] of Object.entries(pass)) // iterate over pass
      this[k] = v; // set value passed

    const reject = new Rejection('Could not construct Synapse', 'input', input, 'output', output, 'weight', weight); // create rejection handler
    if (typeof pass !== 'object' || pass === null) return reject.handle('Invalid pass type'); // if pass is not an object, throw error
    else if (!(input instanceof Neuron)) return reject.handle('Invalid input type'); // if input is not a Neuron, throw error
    else if (!(output instanceof Neuron)) return reject.handle('Invalid output type'); // if output is not a Neuron, throw error
    else if (typeof weight !== 'number') return reject.handle('Invalid weight type'); // if weight is not a number, throw error

    this.#input = input; // set input neuron
    this.#output = output; // set output neuron

    this.#weight = weight.clamp(...config.root.synapse.weight.range[Config.get]()); // set synapse weight
  }

  get id() { this.#_(new Rejection('Could not access synapse id')); return this.#id; } // get synapse id

  get input() { this.#_(new Rejection('Could not access synapse input neuron')); return this.#input; } // get synapse input neuron
  get output() { this.#_(new Rejection('Could not access synapse output neuron')); return this.#output; } // get synapse output neuron

  get weight() { this.#_(new Rejection('Could not access synapse weight')); return this.#weight; } // get synapse weight
  set weight(n) { // set synapse weight
    const reject = new Rejection('Could not set synapse weight', 'weight', n); // create rejection handler
    this.#_(reject); // check synapse existence

    if (typeof n !== 'number') return reject.handle('Invalid weight type'); // if weight is not a number, throw error

    return this.#weight = n.clamp(...config.root.synapse.weight.range[Config.get]()); // return synapse weight
  }

  Destruct() { // destruct synapse
    const reject = new Rejection('Could not destruct Synapse'); // create rejection handler
    this.#_(reject); // check synapse existence

    this.#output.Synapse.input.Delete(this.#input); // delete input synapse

    const debug = window.debug; // save debug status
    try {
      window.debug = false; // disable debug so that synapse does not debug
      this.#input.Synapse.output.Delete(this.#output); // delete output synapse
    } catch { } // ignore errors
    finally { window.debug = debug; } // restore debug status

    ID.delete('synapse', this.#id); // delete synapse id
    this.#id = undefined; // reset synapse id

    this.#input = undefined; // reset input neuron
    this.#output = undefined; // reset output neuron

    this.#weight = undefined; // reset synapse weight

    return true;
  }
}