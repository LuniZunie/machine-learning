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

const cache = new Map();

class Population {
  static #config = import('./config/population.mjs');
  #config = Population.#config;

  #running = false;
  #networks = new Map();
  constructor(config) {
    const reject = new RejectionHandler('Could not construct Population!');

    this.#Network.prototype.population = this; // set population to network

    if (config)
      try {
        this.#config = this.#config(config); // push object values to config
      } catch (e) { reject.handle(e, config, e); }; // handle error
  }

  get config() {
    return this.#config;
  }

  set config(c) {
    const reject = new RejectionHandler('Could not set Population.config!');
    try {
      this.#config = this.#config(c); // push object values to config
    } catch (e) { reject.handle(e, c, e); }; // handle error
  }

  get running() {
    return this.#running;
  }

  start(safeMode) { // TODO: Implement Population.prototype.start()
    const reject = new RejectionHandler('Could not start Population!');
    if (safeMode) { // if safe mode
      if (this.#running) return false; // if already running and is in safe mode return false
    } else if (this.#running) reject.handle('Population is already running!'); // if already running and is not in safe mode

    this.#networks.clear(); // reset networks
    // ...

    this.#running = true; // set running to true
    return true;
  }

  restart(safeMode) {
    const reject = new RejectionHandler('Could not restart Population!');
    if (safeMode) { // if safe mode
      if (!this.#running) return false; // if not running and is in safe mode return false
    } else if (!this.#running) reject.handle('Population is not running!'); // if not running and not safe mode

    this.#networks.forEach(network => network.reset()); // reset networks // TODO: Implement Network.prototype.reset()
    return true;
  }

  resume(safeMode) {
    const reject = new RejectionHandler('Could not resume Population!');
    if (safeMode) { // if safe mode
      if (this.#running) return false; // if already running and is in safe mode return false
    } else if (this.#running) reject.handle('Population is already running!'); // if already running and is not in safe mode

    this.#running = true; // set running to true
    return true;
  }

  pause(safeMode) {
    const reject = new RejectionHandler('Could not pause Population!');
    if (safeMode) { // if safe mode
      if (!this.#running) return false; // if not running and is in safe mode return false
    } else if (!this.#running) reject.handle('Population is not running!'); // if not running and not safe mode

    this.#running = false; // set running to false
    return true;
  }

  evolve(safeMode) { // TODO: Implement Population.prototype.evolve()
    const reject = new RejectionHandler('Could not evolve Population!');
    if (safeMode) { // if safe mode
      if (!this.#running) return false; // if not running and is in safe mode return false
    } else if (!this.#running) reject.handle('Population is not running!'); // if not running and not safe mode

    // ...
    return true;
  }

  #Network = class NeuralNetwork {
    #score = 0;

    #layers = new Map();
    #height;

    #updateMap = new Map(); // map of neurons to update
    constructor() { }

    get score() {
      return this.#score;
    }

    set score(s) { // set score
      if (typeof s !== 'number') new RejectionHandler('Could not set NeuralNetwork.score!').handle('Score must be a number!');
      return this.#score = s; // set score
    }

    get reward() { };
    set reward(δ) { // set reward
      if (typeof δ !== 'number') new RejectionHandler('Could not set NeuralNetwork.reward!').handle('Reward must be a number!');
      return this.#score += δ; // add reward to score
    }

    get depth() { // get depth of network
      return this.#layers.size;
    }

    get height() { // get height of network
      return this.#height;
    }

    get heights() { // get heights of layers
      return [ ...this.#layers.values().map(layer => layer.height) ] // get heights of layers
    }

    #CalculateUpdateMap() { // calculate map of neurons to update
      for (const layer of [ ...this.#layers.values() ].reverse()) // iterate through layers in reverse
        for (const neuron of layer.values()) // iterate through neurons in layer
          neuron.UpdateOutputSynapse(); // TODO: Implement Neuron.prototype.UpdateOutputSynapse()

      for (const layer of this.#layers.values()) // iterate through layers
        for (const neuron of layer.values()) {
          neuron.UpdateInputSynapse(); // TODO: Implement Neuron.prototype.UpdateInputSynapse()

          const synapses = [ ...neuron.synapses ]; // get synapses // TODO: Implement Neuron.prototype.synapses
          for (const synapse of synapses) { // iterate through synapses, returns y value of neuron connected to
            if (!this.#updateMap.has(synapse)) this.#updateMap.set(synapse, new Set()); // if synapse not in map, add it
            this.#updateMap.get(synapse).add(neuron); // add neuron to synapse
          }
        }
    }

    #GetUpdateSet(...ks) { // get set of neurons to update
      let set = new Set(); // create set
      for (const k of ks) // iterate through keys
        set = set.union(this.#updateMap.get(k)); // add neurons to set

      return set; // return set
    }
  }
}