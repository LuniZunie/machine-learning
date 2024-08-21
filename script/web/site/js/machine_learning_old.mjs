class Neuron {
  #layer = null;

  #value = NaN;

  #paths = new Map();
  #inputs = new Map();
  #outputs = new Map();

  get value() {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    if (this.#layer === null) return NaN;

    return this.#value;
  }

  set value(v) {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    if (this.#layer instanceof InputNeuralLayer) {
      this.#value = +v;

      this.#outputs.forEach(path => path.update());
    }
  }

  get layer() {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    return this.#layer;
  }

  set layer(layer) {
    if (this.#layer !== null) throw new Error('Neuron already belongs to a layer');

    if (layer instanceof NeuralLayer) this.#layer = layer;
  }

  get depth() {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    return this.#layer?.depth ?? NaN;
  }

  get paths() {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    return this.#paths;
  }

  get inputs() {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    return this.#inputs;
  }

  get inputNeurons() {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    return this.#inputs.keys();
  }

  get inputPaths() {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    return this.#inputs.values();
  }

  get outputs() {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    return this.#outputs;
  }

  get outputNeurons() {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    return this.#outputs.keys();
  }

  get outputPaths() {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    return this.#outputs.values();
  }

  update() {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    if (this.#layer instanceof InputNeuralLayer) {
      this.#value = this.#inputs.reduce((s, { value }) => s + value, 0);
      this.#outputs.forEach(path => path.update());
    } else if (this.#layer instanceof HiddenNeuralLayer)
      this.#value = this.#inputs.reduce((s, { value }) => s + value, 0);
  }

  path(neuron) {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    return this.#paths.get(neuron);
  }

  connect(neuron, w = 'random') {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    function getWeight(w) {
      if (w === 'random') return Math.random();
      else if (typeof w === 'number') return +w;
      else throw new Error('Invalid weight');
    }

    if (this.#paths.has(neuron)) return;
    else if (neuron instanceof Neuron) {
      let path = null;
      if (neuron.depth === this.depth - 1)
        this.#inputs.set(neuron, (path = new Neural.Path(neuron, this, getWeight(w), true)));
      else if (neuron.depth === this.depth + 1)
        this.#outputs.set(neuron, (path = new Neural.Path(this, neuron, getWeight(w), true)));
      else throw new Error('Invalid connection');

      this.#paths.set(neuron, path);
    } else if (
      neuron === 'all' ||
      neuron === 'all_in' ||
      neuron === 'all_out'
    ) {
      if ((neuron === 'all' || neuron === 'all_in') && this.depth > 0) {
        const prevLayer = this.#layer.network.indexedLayers.get(this.depth - 1);
        prevLayer.neurons.forEach(neuron => this.connect(neuron, w));
      }

      if ((neuron === 'all' || neuron === 'all_out') && this.depth < this.#layer.network.layers.size - 1) {
        const nextLayer = this.#layer.network.indexedLayers.get(this.depth + 1);
        nextLayer.neurons.forEach(neuron => this.connect(neuron, w));
      }
    } else throw new Error('Invalid neuron');
  }

  disconnect(neuron) {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    if (this.#paths.has(neuron)) {
      const path = this.#paths.get(neuron);
      if (neuron.depth === this.depth - 1)
        this.#inputs.delete(neuron);
      else if (neuron.depth === this.depth + 1)
        this.#outputs.delete(neuron);

      this.#paths.delete(neuron);
      path.delete();
    } else if (
      neuron === 'all' ||
      neuron === 'all_in' ||
      neuron === 'all_out'
    ) {
      if ((neuron === 'all' || neuron === 'all_in') && this.depth > 0) {
        const prevLayer = this.#layer.network.indexedLayers.get(this.depth - 1);
        prevLayer.neurons.forEach(neuron => this.disconnect(neuron));
      }

      if ((neuron === 'all' || neuron === 'all_out') && this.depth < this.#layer.network.layers.size - 1) {
        const nextLayer = this.#layer.network.indexedLayers.get(this.depth + 1);
        nextLayer.neurons.forEach(neuron => this.disconnect(neuron));
      }
    } else throw new Error('Invalid neuron');
  }

  delete() {
    if (this.#layer === null) throw new Error('Neuron does not belong to a layer');

    const tempLayer = this.#layer;
    this.#layer = null;
    tempLayer.remove(this);

    this.#value = NaN;

    this.#paths.forEach(path => path.delete());
    this.#paths.clear();
    this.#inputs.clear();
    this.#outputs.clear();
  }
}

class NeuralLayer {
  #network = null;

  #neurons = new Set();

  constructor(network) {
    if (network instanceof Neural.Network) this.#network = network;
  }

  get network() {
    return this.#network;
  }

  get depth() {
    return this.#network.layers.get(this);
  }

  get neurons() {
    return this.#neurons;
  }

  add(neuron = new Neural.Neuron()) {
    if (neuron instanceof Neuron) {
      neuron.layer = this;
      this.#neurons.add(neuron);
    } else if (neuron === 'all') {
      neuron = new Neural.Neuron();
      neuron.layer = this;
      neuron.connect('all');
      this.#neurons.add(neuron);
    } else if (typeof neuron === 'number') return new Array(neuron).fill(0).map(() => this.add());
    else if (Array.isArray(neuron)) return neuron.map(neuron => this.add(neuron));
    else throw new Error('Invalid neuron');

    return neuron;
  }

  remove(neuron) {
    if (this.#neurons.has(neuron)) {
      this.#neurons.delete(neuron);
      neuron.delete();
    } else if (neuron === 'all')
      this.#neurons.forEach(neuron => this.remove(neuron));
    else if (Array.isArray(neuron)) neuron.forEach(neuron => this.remove(neuron));
    else throw new Error('Invalid neuron');
  }
}

class InputNeuralLayer extends NeuralLayer { };
class HiddenNeuralLayer extends NeuralLayer { };
class OutputNeuralLayer extends NeuralLayer { };

const Neural = Object.freeze(Object.defineProperties({}, {
  Path: { value: class NeuralPath {
    #from = null;
    #to = null;

    #weight = NaN;
    #value = NaN;

    constructor(from, to, w = NaN, anarchy = false) {
      if (
        from instanceof Neuron &&
        to instanceof Neuron &&
        from.layer.depth === to.layer.depth - 1
      ) {
        this.#from = from;
        this.#to = to;

        if (!anarchy || anarchy === 'from') this.#from.connect(this.#to, w);
        if (!anarchy || anarchy === 'to') this.#to.connect(this.#from, w);
      } else throw new Error('Invalid path');

      this.#weight = +w;
      this.update();
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
      this.#weight = +w;
      this.update();
    }

    get value() {
      return this.#value;
    }

    update() {
      this.#value = this.#from.value * this.#weight;
      this.#to.update();
    }

    delete() {
      this.#from.disconnect(this.#to);
      this.#to.disconnect(this.#from);

      this.#from = null;
      this.#to = null;
    }
  } },
  Neuron: { value: Neuron },
  Layer: { value: {
    Input: InputNeuralLayer,
    Hidden: HiddenNeuralLayer,
    Output: OutputNeuralLayer,
  } },
  Network: { value: class NeuralNetwork {
    #layers = new Map();
    #indexedLayers = new Map();

    constructor(layers) {
      this.layers = layers;
    }

    get layers() {
      return this.#layers;
    }

    set layers(layers) {
      this.#layers.forEach(
        (_, layer) => layer.neurons.forEach(neuron => neuron.delete())
      );

      this.#layers.clear();
      this.#indexedLayers.clear();
      for (let i = 0; i < layers; i++) {
        let layer = null;
        if (i === 0) {
          layer = new Neural.Layer.Input(this);
          this.#indexedLayers.set('input', layer);
        } else if (i === layers - 1) {
          layer = new Neural.Layer.Output(this);
          this.#indexedLayers.set('output', layer);
        } else layer = new Neural.Layer.Hidden(this);

        this.#layers.set(layer, i);
        this.#indexedLayers.set(i, layer);
      }
    }

    get indexedLayers() {
      return this.#indexedLayers;
    }

    get inputLayer() {
      return this.#indexedLayers.get('input');
    }

    layer(n) {
      return this.#indexedLayers.get(n);
    }

    get outputLayer() {
      return this.#indexedLayers.get('output');
    }

    get inputs() {
      return this.#indexedLayers.get('input').neurons;
    }

    get outputs() {
      return this.#indexedLayers.get('output').neurons;
    }

    input(...values) {
      if (values.length === this.inputs.neurons.size) {
        this.inputs.neurons.forEach((neuron, i) => neuron.value = values[i]);
        return true;
      } else return false;
    }

    output() {
      return this.outputs.neurons.map(neuron => neuron.value);
    }

    connectAll(w = 'random') {
      this.#layers.forEach(
        (_, layer) => layer.neurons.forEach(neuron => neuron.connect('all', w))
      );
    }
  } },
  Hive: { value: class NeuralHive {

  } },
}));

export default Neural;

// test
const network = new Neural.Network(3);
network.inputLayer.add();
network.layer(1).add(1);
network.outputLayer.add();

network.connectAll(1);

network.input(1);
console.log(network.output());
network.input(2);
console.log(network.output());