const config = {
  global: {
    path: {
      min: 0,
      max: 100,
    },
  },
  random: {
    path: {
      form: { chance: 50 },
    },
  },
  mutate: {
    path: {
      form: { chance: 0.5 },
      edit: { chance: 0.1 },
      change: { chance: 2, amount: 2.5 },
      deform: { chance: 0.5 },
    }
  }
}

function rng(min, max) {
  min = min?.min ?? min;
  max = max?.max ?? max ?? -min;

  return Math.random() * (max - min) + min;
}

function ifrng(chance) {
  return Math.random() < chance;
}

class Hive {
  
}

class Network {
  static random(...layers) {
    const network = new Network();
    for (let i = 0; i < layers.length; i++) {
      const size = layers[i];
      network.Layer.new(size);

      if (i > 0)
        for (let j = 1; j <= size; j++)
          for (let k = 1; k <= layers[i - 1]; k++)
            if (Math.random() < config.random.path.form)
              network.Path.form(i - 1, k, 1, rng(config.global.path));
    }

    return network;
  }

  static duplicate(network) {
    const newNetwork = new Network();
    for (let i = 0; i < network.layers.length; i++) {
      const layer = network.layers[i];
      newNetwork.Layer.new(layer.size);

      for (const neuron of layer)
        for (const [ from, path ] of neuron.From)
          newNetwork.Path.form(i - 1, from, neuron, path.weight);
    }

    return newNetwork;
  }

  static asexual(network) {
    const newNetwork = new Network();

    for (let i = 0; i < network.layers.length; i++) {
      const layer = network.layers[i];
      newNetwork.Layer.new(layer.size);

      if (i > 0) {
        for (let j = 1; j <= size; j++) {
          for (let k = 1; k <= network.layers[i - 1]; k++) {
            if (network.Path.has(i - 1, k, 1)) {
              if (ifrng(config.mutate.path.deform.chance)) {
                newNetwork.Path.deform(i - 1, k, 1);
                continue;
              } else if (ifrng(config.mutate.path.edit.chance))
                newNetwork.Path.edit(i - 1, k, 1, rng(config.global.path));

              if (ifrng(config.mutate.path.change.chance))
                newNetwork.Path.change(i - 1, k, 1, network.Path.get(i - 1, k, 1).weight += rng(config.mutate.path.change.amount));
            } else if (ifrng(config.random.path.form))
              newNetwork.Path.form(i - 1, k, 1, rng(config.global.path));
          }
        }
      }
    }
  }

  #layers;
  constructor() {
    this.#layers = [];
  }

  get layers() {
    return this.#layers;
  }

  get Layer() {
    const network = this;
    return Object.freeze(Object.defineProperties({}, {
      new: {
        value: function(size, i) {
          const layer = new Set();
          if (typeof size === 'number')
            for (let i = 0; i < size; i++) layer.add(new Neuron());

          if (i === undefined) network.#layers.push(layer);
          else network.#layers.splice(i, 0, layer);
        }
      },
      get: {
        get: function(i) {
          return [ ...network.#layers[i] ];
        }
      },
      delete: {
        value: function(i) {
          network.#layers.splice(i, 1);
        }
      }
    }));
  }

  get Neuron() {
    const network = this;
    return Object.freeze(Object.defineProperties({}, {
      new: {
        value: function(d) {
          const layer = network.#layers[d];
          if (layer instanceof Set) {
            const neuron = new Neuron();
            layer.add(neuron);
            return neuron;
          } else throw new Error('Layer not found');
        }
      },
      get: {
        value: function(layer, i) {
          return [ ...network.#layers[layer] ][i];
        }
      },
      delete: {
        value: function(layer, i) {
          const neuron = [ ...network.#layers[layer] ][i];
          neuron?.deconstruct();

          network.#layers[layer].delete(neuron);
        }
      }
    }));
  }

  #getNeuronsForPath(layer, i, d) {
    const layer1 = this.#layers[layer];
    if (!(layer1 instanceof Set)) throw new Error('Layer 1 not found');

    let layer2;
    if (d >= 0) layer2 = this.#layers[layer + 1];
    else layer2 = this.#layers[layer - 1];

    if (layer2 instanceof Set) {
      let neuron1, neuron2;
      if (d >= 0) {
        neuron1 = layer1.has(i) ? i : [ ...layer1 ][i];
        neuron2 = layer2.has(d) ? d : [ ...layer2 ][Math.abs(d) - 1];
      } else {
        neuron1 = layer2.has(d) ? d : [ ...layer2 ][Math.abs(d) - 1];
        neuron2 = layer1.has(i) ? i : [ ...layer1 ][i];
      }

      return [ neuron1, neuron2 ];
    } else throw new Error('Layer 2 not found');
  }

  get Path() {
    const network = this;
    return Object.freeze(Object.defineProperties({}, {
      form: {
        value: function(layer, i, d, w = Math.random()) {
          try {
            const [ neuron1, neuron2 ] = network.#getNeuronsForPath(layer, i, d);
            return new Path(neuron1, neuron2, w);
          } catch (e) { throw new Error(e); };
        }
      },
      edit: {
        value: function(layer, i, d, w) {
          try {
            const [ neuron1, neuron2 ] = network.#getNeuronsForPath(layer, i, d);
            Path.recall(neuron1, neuron2).weight = w;
          } catch (e) { throw new Error(e); };
        }
      },
      change: {
        value: function(layer, i, d, w) {
          try {
            const [ neuron1, neuron2 ] = network.#getNeuronsForPath(layer, i, d);
            Path.recall(neuron1, neuron2).change = w;
          } catch (e) { throw new Error(e); };
        }
      },
      has: {
        value: function(layer, i, d) {
          try {
            const [ neuron1, neuron2 ] = network.#getNeuronsForPath(layer, i, d);
            return Path.exists(neuron1, neuron2);
          } catch (e) { throw new Error(e); };
        }
      },
      get: {
        value: function(layer, i, d) {
          try {
            const [ neuron1, neuron2 ] = network.#getNeuronsForPath(layer, i, d);
            return Path.recall(neuron1, neuron2);
          } catch (e) { throw new Error(e); };
        }
      },
      deform: {
        value: function(layer, i, d) {
          try {
            const [ neuron1, neuron2 ] = network.#getNeuronsForPath(layer, i, d);
            Path.recall(neuron1, neuron2).deconstruct();
          } catch (e) { throw new Error(e); };
        }
      },
    }));
  }

  input(...vs) {
    const layer = this.#layers[0];
    if (layer instanceof Set) {
      if (vs.length === layer.size) {
        let i = 0;
        for (const neuron of layer) neuron.value = vs[i++];
      } else throw new Error('Invalid input size');
    } else throw new Error('Input layer not found');
  }

  get output() {
    const layer = this.#layers[this.#layers.length - 1];
    if (layer instanceof Set) return [ ...layer ].map(neuron => neuron.value);
    else throw new Error('Output layer not found');
  }
}

class Neuron {
  static #ids = new Set();
  static #generateID() {
    let id;
    do
      id = crypto.getRandomValues(new Uint32Array(1))[0];
    while (Neuron.#ids.has(id));

    Neuron.#ids.add(id);
    return id;
  }
  static #deleteID(id) {
    Neuron.#ids.delete(id);
  }

  #id = Neuron.#generateID();

  #from = new Map();
  #to = new Map();

  #value = NaN;

  constructor() { }

  get ID() {
    return this.#id;
  }

  get From() {
    const neuron = this;
    return Object.freeze(Object.defineProperties({}, {
      add: {
        value: function(from, path) {
          neuron.#from.set(from, path);
        }
      },
      remove: {
        value: function(from) {
          neuron.#from.delete(from);
        }
      },
    }));
  }

  get To() {
    const neuron = this;
    return Object.freeze(Object.defineProperties({}, {
      add: {
        value: function(to, path) {
          neuron.#to.set(to, path);
        }
      },
      remove: {
        value: function(to) {
          neuron.#to.delete(to);
        }
      },
    }));
  }

  get value() {
    return this.#value;
  }

  set value(v) {
    this.#value = v;
    for (const [ neuron ] of this.#to) neuron.update();
  }

  update() {
    let sum = 0;
    for (const [ neuron, path ] of this.#from) sum += neuron.value * path.weight;
    this.value = 1 / (1 + Math.exp(-sum));
  }

  deconstruct() {
    for (const [ neuron, path ] of this.#from) {
      neuron.To.remove(this);
      path.deconstruct();
    }

    for (const [ neuron, path ] of this.#to) {
      neuron.From.remove(this);
      path.deconstruct();
    }

    Neuron.#deleteID(this.#id);
  }
}

class Path {
  static paths = {};
  static remember(path) {
    Path.paths[`${path.from.ID}-${path.to.ID}`] = path;
  }
  static exists(from, to) {
    return Path.paths.hasOwnProperty(`${from.ID}-${to.ID}`);
  }
  static recall(from, to) {
    return Path.paths[`${from.ID}-${to.ID}`];
  }
  static forget(from, to) {
    delete Path.paths[`${from.ID}-${to.ID}`];
  }

  #from;
  #to;

  #weight;

  constructor(from, to, weight) {
    if (Path.exists(from, to)) throw new Error('Path already exists');

    this.#from = from;
    this.#to = to;

    this.#weight = weight;

    from.To.add(to, this);
    to.From.add(from, this);

    Path.remember(this);

    to.update();
  }

  get from() {
    return this.#from;
  }

  get to() {
    return this.#to;
  }

  get weight() {
    return this.#weight;
  }

  set weight(w) {
    this.#weight = w;
    this.#to.update();
  }

  get change() { return this.#weight; }
  set change(w) {
    this.#weight += w;
    this.#to.update();

    return this.#weight;
  }

  deconstruct() {
    this.#from.To.remove(this.#to);
    this.#to.From.remove(this.#from);

    Path.forget(this.#from, this.#to);

    this.#from = undefined;
    this.#to = undefined;

    this.#weight = undefined;
  }
}

// test
const network = new Network();
network.Layer.new(1);
network.Layer.new(1);
network.Layer.new(1);
network.Path.form(0, 1, 1, 1);
network.Path.form(1, 1, 1, 1);

network.input(1);
console.log(network.output);

network.Path.reform(0, 1, 1, 100);
network.Path.reform(2, 1, -1, 100);
console.log(network.output);