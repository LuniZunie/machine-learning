const cache = new Map();

function rng(min, max) {
  min = min?.min ?? min;
  min = min?.chance ?? min;

  max = max?.max ?? max ?? -min;
  max = max?.chance ?? max;

  return Math.random() * (max - min) + min;
}

function ifrng(chance) {
  return Math.random() < (chance?.chance ?? chance);
}

Math.wrandom = function(weights) { // weighted random
  const sum = weights.sum();
  const r = Math.random() * sum;

  let i = 0;
  for (let w of weights) {
    w = +w;
    if (r < w) return i;
    r -= w;
    i++;
  }
}

Math.iwrandom = function(weights) { // inverted weighted random
  const sum = weights.sum();
  const r = Math.random() * sum;

  let i = 0;
  for (let w of weights) {
    w = sum - w;
    if (r < +w) return i;
    r -= +w;
    i++;
  }
}

Array.prototype.sum = function() {
  return this.reduce((a, b) => a + b, 0);
}

Array.prototype.random = function() {
  return this[Math.random() * this.length | 0];
}

Array.prototype.weight = function(m = 1) {
  const sum = this.sum();
  return this.map(v => v / sum * m);
}

Array.prototype.iweight = function(m = 1) { // inverted weight
  const sum = this.sum();
  return this.map(v => (sum - v) / sum * m);
}

Array.prototype.fit = function(min = 0, max = 1) {
  const range = max - min;

  const aMin = Math.min(...this);
  const aRange = Math.max(...this) - aMin;

  return this.map(v => (v - aMin) / aRange * range + min);
}

Map.prototype.weight = function(m = 1) {
  const sum = [ ...this.values() ].sum();
  return new Map(Array.from(this, ([ k, v ]) => [ k, v / sum * m ]));
}

Map.prototype.iweight = function(m = 1) { // inverted weight
  const sum = [ ...this.values() ].sum();
  return new Map(Array.from(this, ([ k, v ]) => [ k, (sum - v) / sum * m ]));
}

Map.prototype.wrandom = function() {
  return [ ...this.keys() ][Math.wrandom([ ...this.values() ])];
}

Map.prototype.iwrandom = function() {
  return [ ...this.keys() ][Math.iwrandom([ ...this.values() ])];
}

class Config {
  static #default = Object.freeze({
    population: {
      size: {
        value: {
          _val_: 100,

          $: 'number',
        },

        $default: 'value',
      },
      equality: {
        value: {
          _val_: 10 /100,

          $: 'number', $dat: 'percent',
        },

        $default: 'value',
      },
      natural_selection: {
        dictionary: {
          _val_: { '1-5': 'sexual', '6-15': 'asexual' },

          $: '!object', $set: function(v, config, population) {
            const o = {
              sexual: new Set([ ]),
              asexual: new Set([ ]),

              map: new Map([ ]),
            };

            Object.entries(v).forEach(function([ k, v ]) {
              let s, e;
              if (typeof k === 'string' && k.includes('-'))
                [ s, e ] = k.split('-').map(v => +v);
              else s = e = +k;

              if (s > e) throw new Error('Invalid range');

              for (let i = s; i <= e; i++) {
                if (o.map.has(i)) throw new Error('Duplicate index');
                else if (i < 0 || (i | 0) !== i) throw new Error('Indexes must be positive integers');
                else if (!(v in o) && v !== 'map') throw new Error('Invalid value');
                else {
                  o[v].add(i);
                  o.map.set(i, v);
                };
              }
            });

            config.population.natural_selection.data._val_ = o;

            return v;
          },
        },
        data: {
          _val_: {
            sexual: new Set([ 0,1,2,3,4 ]),
            asexual: new Set([ 5,6,7,8,9,10,11,12,13,14,15 ]),

            map: new Map([
              [0,'sexual'],[1,'sexual'],[2,'sexual'],[3,'sexual'],[4,'sexual'],
              [5,'asexual'],[6,'asexual'],[7,'asexual'],[8,'asexual'],[9,'asexual'],
              [10,'asexual'],[11,'asexual'],[12,'asexual'],[13,'asexual'],[14,'asexual'],[15,'asexual'],
            ])
          },

          $: '!object', $set: false, $get: function(o, config, population) {
            return new Map([ ...o.map ]);
          },
        },
        algorithm: {
          _val_: 'linear',

          $: 'defined', $values: new Set([ 'linear', 'proportional', 'weighted', 'random' ]),
        },

        _exe_(config, population) {
          if (population === undefined) throw new Error('Configuration has not yet been attached to a population');

          const scores = population.scores;

          const algorithm = this.algorithm._val_;
          const data = this.data._val_;

          const sexualScores = [ ...data.sexual ].map(i => scores[i]);
          const mapScores = new Map([ ...data.map ].map(([ k ]) => [ k, scores[k] ]));

          const sexualEquality = sexualScores.fit(config.population.equality.value._val_, 1);

          cache.set('sum', sexualEquality.sum());
          cache.set('columnSums', []);

          const sexualTension2DMap = data.sexual.map(() => new Map());
          for (let x = 0; x < data.sexual.length; x++) {
            cache.get('columnSums')[x] = cache.get('sum') - sexualEquality[x];
            for (let y = 0; y < x; y++) {
              const Δ = sexualEquality[x] - sexualEquality[y];
              sexualTension2DMap[x].set(y, Δ / cache.get('columnSums')[x]);
              sexualTension2DMap[y].set(x, Δ / cache.get('columnSums')[y]);
            }
          }

          cache.clear();

          function FindPartner(i) {
            return sexualTension2DMap[i].iwrandom();
          }

          const parentGroups = [];
          switch (algorithm) {
            case 'linear': {
              for (let i = 0; i < config.population.size.value._val_; ) {
                for (const [ k, dat ] of data.map) {
                  if (i++ >= config.population.size.value._val_) break;

                  switch (dat) {
                    case 'sexual': newGeneration.push([ dat, k, FindPartner(k) ]); break;
                    case 'asexual': newGeneration.push([ dat, k ]); break;
                  }
                }
              }
            } break;
            case 'proportional': {
              const proportions = mapScores.weight(config.population.size.value._val_);
              let roundUp = true;
              proportions.forEach((v, k) => {
                if (v % 1 === 0.5) {
                  v |= 0;
                  if ((roundUp = !roundUp)) v++;
                } else v = Math.round(v);

                for (let i = 0; i < v; i++) {
                  const dat = data.map.get(k);
                  switch (dat) {
                    case 'sexual': newGeneration.push([ dat, k, FindPartner(k) ]); break;
                    case 'asexual': newGeneration.push([ dat, k ]); break;
                  }
                }
              });
            } break;
            case 'weighted': {
              for (let i = 0; i < config.population.size.value._val_; i++) {
                const k = mapScores.wrandom();

                const dat = data.map.get(k);
                switch (dat) {
                  case 'sexual': newGeneration.push([ dat, k, FindPartner(k) ]); break;
                  case 'asexual': newGeneration.push([ dat, k ]); break;
                }
              }
            } break;
            case 'random': {
              const keys = [ ...data.map.keys() ];
              for (let i = 0; i < config.population.size.value._val_; i++) {
                const k = keys.random();

                const dat = data.map.get(k);
                switch (dat) {
                  case 'sexual': newGeneration.push([ dat, k, FindPartner(k) ]); break;
                  case 'asexual': newGeneration.push([ dat, k ]); break;
                }
              }
            } break;
          }

          return parentGroups;
        },

        $default: 'dictionary',
      },
    },
    network: {
      layers: {
        list: {
          _val_: [ 1, 1, 1 ],

          $: 'array'
        },

        $default: 'list',
      },
    },
    neuron: { },
    path: {
      weight: {
        min: {
          value: {
            _val_: 0,

            $: 'number'
          },

          $default: 'value',
        },
        max: {
          value: {
            _val_: 100,

            $: 'number'
          },

          $default: 'value',
        },

        _exe_(config, population) {
          return Math.random() * (this.max.value._val_ - this.min.value._val_) + this.min.value._val_;
        },
      },
      birth: {
        form: {
          chance: {
            _val_: 50 /100,
            _exe_(config, population) {
              return Math.random() < this._val_;
            },

            $: 'number', $dat: 'percent',
          },

          $default: 'chance',
        },

        _exe_(config, population) {
          const set = new Set();
          if (Math.random() < this.form.chance._val_) set.add('form');

          return set;
        },
      },
      mutate: {
        form: {
          chance: {
            _val_: 1 / 100,
            _exe_(config, population) {
              return Math.random() < this._val_;
            },

            $: 'number', $dat: 'percent',
          },

          $default: 'chance',
        },
        edit: {
          chance: {
            _val_: 2 / 100,
            _exe_(config, population) {
              return Math.random() < this._val_;
            },

            $: 'number', $dat: 'percent',
          },

          $default: 'chance',
        },
        change: {
          chance: {
            _val_: 5 / 100,
            _exe_(config, population) {
              return Math.random() < this._val_;
            },

            $: 'number', $dat: 'percent',
          },
          amount: {
            _val_: 2.5,
            _exe_(config, population) {
              return Math.random() - 0.5 * this._val_ * 2;
            },

            $: 'number',
          },

          _exe_(config, population) {
            return Math.random() < this.chance._val_ ?
              Math.random() - 0.5 * this.amount._val_ * 2 :
              0;
          },

          $default: 'chance',
        },
        deform: {
          chance: {
            _val_: 1 / 100,
            _exe_(config, population) {
              return Math.random() < this._val_;
            },

            $: 'number', $dat: 'percent',
          },

          $default: 'chance',
        },

        _exe_(config, population) {
          const set = new Set();

          if (Math.random() < this.form.chance._val_) set.add('form');
          if (Math.random() < this.edit.chance._val_) set.add('edit');
          if (Math.random() < this.change.chance._val_) set.add('change');
          if (Math.random() < this.deform.chance._val_) set.add('deform');

          return set;
        },
      },
    },
  });

  #config;
  #population;

  constructor(config = {}) {
    const handle = (k, v, o, path) => {
      function keyCheck(k, o) {
        return typeof k === 'string' && !k.startsWith('$') && !k.startsWith('_') && k in o;
      }

      if (typeof v === 'object' && !Array.isArray(v) && v !== null) {
        if ('_val_' in o) this.set(path.join('.'), v);
        else if (Object.keys(o).some(k2 => keyCheck(k2, v))) {
          for (const [ k2, v2 ] of Object.entries(v))
            if (keyCheck(k2, o)) handle(k2, v2, o[k2], [ ...path, k2 ]);
        } else if ('$default' in o) {
          k = o.$default;
          handle(k, v, o[k], [ ...path, k ]);
        }
      } else this.set(path.join('.'), v);
    }

    this.#config = Config.#default;
    if (typeof config === 'object' && !Array.isArray(config) && config !== null)
      for (const [ k, v ] of Object.entries(config)) handle(k, v, this.#config[k], [ k ]);
    else throw new Error('Invalid configuration object');
  }

  #set(o, v) {
    const config = this;
    try {
      o._val_ = structuredClone((function(v) {
        switch (o.$dat) {
          case 'percent': return v / 100;
          default: return v;
        }
      })(o.$set instanceof Function ? o.$set(v, config.#config, config.#population) : v));
    } catch (e) { throw new Error('Error configuring value (must be structured cloneable)'); }
  }

  set(k, v) {
    if (typeof k !== 'string' || k?.includes('$')) throw new Error('Invalid configuration key');

    const path = k.split('.');
    let o = this.#config;
    for (const k2 of path) {
      if (k2 in o) o = o[k2];
      else throw new Error('Cannot find configuration key');
    }

    while ('$default' in o && !('_val_' in o)) o = o[o.$default];
    if (o.$set === false) throw new Error('Cannot configure this key');

    if ('_val_' in o) {
      switch (o.$) {
        case 'defined': {
          if (o.$values && !o.$values.has(v)) throw new Error('Invalid value configured');
        } break;
        case '!object': {
          if (v === null || typeof v !== 'object') throw new Error('Invalid value type configured');
        } break;
        case 'array': {
          if (!Array.isArray(v)) throw new Error('Invalid value type configured');
        } break;
        case null:
        case 'null': {
          if (v !== null) throw new Error('Invalid value type configured');
        } break;
        case undefined: break;
        default: {
          if (typeof v !== o.$) throw new Error('Invalid value type configured');
        } break;
      }

      this.#set(o, v);
    } else throw new Error('Cannot configure this key');
  };

  run(k) {
    if (typeof k !== 'string' || k?.includes('$')) throw new Error('Invalid configuration key');

    const path = k.split('.');
    let o = this.#config;
    for (const k2 of path) {
      if (k2 in o) o = o[k2];
      else throw new Error('Cannot find configuration key');
    }

    while ('$default' in o && !('_exe_' in o)) o = o[o.$default];
    if (o.$run === false) throw new Error('Cannot execute this key');

    if ('_exe_' in o) return o._exe_(this.#config, this.#population);
    else throw new Error('Cannot execute this key');
  };

  #get(o) {
    const config = this;
    try {
      return structuredClone((function(v) {
        switch (o.$dat) {
          case 'percent': return o._val_ * 100;
          default: return o._val_;
        }
      })(o.$get instanceof Function ? o.$get(o._val_, config.#config, config.#population) : o._val_));
    } catch (e) { throw new Error('Error getting value (was not structured cloneable)'); };
  }

  get(k) {
    if (typeof k !== 'string' || k?.includes('$')) throw new Error('Invalid configuration key');

    const path = k.split('.');
    let o = this.#config;
    for (const k2 of path) {
      if (k2 in o) o = o[k2];
      else throw new Error('Cannot find configuration key');
    }

    while ('$default' in o && !('_val_' in o)) o = o[o.$default];
    if (o.$get === false) throw new Error('Cannot get this key');

    if ('_val_' in o) return this.#get(o);
    else throw new Error('Cannot get this key');
  };

  simplify() {
    const simplify = o => {
      if (typeof o === 'object' && !Array.isArray(o) && o !== null) {
        if ('_val_' in o) {
          if (o.$get === false) throw new Error('Cannot get this key');
          return this.#get(o);
        } else {
          const temp = {};
          let empty = true;
          for (const [ k, v ] of Object.entries(o))
            if (!k.startsWith('$') && !k.startsWith('_'))
              try {
                temp[k] = simplify(v);
                empty = false;
              } catch (e) { }

          if (empty) throw new Error('Empty object');
          else return temp;
        }
      }

      return o;
    }

    return simplify(this.#config);
  }

  get population() {
    return this.#population;
  }

  set population(v) {
    if (!(v instanceof Population)) throw new Error('Invalid population object');
    else if (!Object.is(v.config, this)) throw new Error('Configuration mismatch');
    else this.#population = v;
  }
}

//% Config test
const config = new Config({
  population: {
    size: 75,
    equality: {
      value: 15,
    },
  },
});
config.set('path.birth.form', 75);
console.log(config.get('path.mutate.form'));
console.log(config.simplify());

cache.clear();

class Population {
  #config;

  #networks = [];
  constructor(config = new Config()) {
    if (config instanceof Config) {
      this.#config = config;
      config.population = this;
    } else throw new Error('Invalid configuration object');
  }

  get config() {
    return this.#config;
  }

  set config(c) {
    if (config instanceof Config) {
      this.#config = config;
      config.population = this;
    } else throw new Error('Invalid configuration object');
  }

  network(i) {
    return this.#networks[i];
  }

  get networks() {
    return [ ...this.#networks ];
  }

  get scores() {
    return this.#networks.map(network => network.score);
  }

  get rankings() {
    return this.#networks
      .map((_, i) => i)
      .sort((a, b) => this.#networks[a].score - this.#networks[b].score);
  }

  get best() {
    return this.#networks.sort((a, b) => b.score - a.score)[0];
  }

  evolve() {
    const rankings = this.rankings;
    const parentGroups = this.#config.run('population.natural_selection');

    const load = i => this.#networks[rankings[i]];

    const newGeneration = [];
    for (const parents of parentGroups) newGeneration.push(this[parents.shift()](...parents.map(load)));
  }

  asexual(network) {
    const newNetwork = new Network();

    for (let i = 0; i < network.layers.length; i++) {
      const layer = network.layers[i];
      newNetwork.Layer.new(layer.size);

      if (i > 0) {
        for (let j = 1; j <= size; j++) {
          for (let k = 1; k <= network.layers[i - 1]; k++) {
            const mutations = this.#config.run('path.mutate');
            if (network.Path.has(i - 1, k, 1)) {
              if (mutations.has('deform')) continue;
              else if (mutations.has('edit'))
                newNetwork.Path.form(i - 1, k, 1, this.#config.run('path.weight'));
              else if (mutations.has('change'))
                newNetwork.Path.form(i - 1, k, 1, network.Path.get(i - 1, k, 1).weight + this.#config.run('path.mutate.change'));
            } else {
              if (mutations.has('form'))
                newNetwork.Path.form(i - 1, k, 1, this.#config.run('path.weight'));
            }
          }
        }
      }
    }

    return newNetwork;
  }

  sexual(network1, network2) {
    const newNetwork = new Network();

    const strength = () => Math.random() < 0.5 ? Math.random() + 1 : 0; // dominant score : recessive score

    for (let i = 0; i < network1.layers.length; i++) {
      const layer1 = network1.layers[i];
      newNetwork.Layer.new(layer1.size);

      if (i > 0) {
        for (let j = 1; j <= size; j++) {
          for (let k = 1; k <= network1.layers[i - 1]; k++) {
            const mutations = this.#config.run('path.mutate');
            let child = null;

            const path1 = network1.Path.get(i - 1, k, 1);
            const path2 = network2.Path.get(i - 1, k, 1);
            if (path1 || path2) {
              if (mutations.has('deform')) continue;
              if (mutations.has('edit')) {
                newNetwork.Path.form(i - 1, k, 1, this.#config.run('path.weight'));
                continue;
              }

              const strength1 = strength();
              const strength2 = strength();

              const weights = [ strength1, strength2 ]
                .fit(this.#config.get('population.equality'), 1)
                .weight();

              if (path1 && path2)
                child = newNetwork.Path.form(i - 1, k, 1, path1.weight * weights[0] + path2.weight * weights[1]);
              else if (path1 && Math.random() < weights[0])
                child = newNetwork.Path.form(i - 1, k, 1, path1.weight);
              else if (path2 && Math.random() < weights[1])
                child = newNetwork.Path.form(i - 1, k, 1, path2.weight);

              if (mutations.has('change'))
                child.change = this.#config.run('path.mutate.change');
            } else {
              if (mutations.has('form'))
                newNetwork.Path.form(i - 1, k, 1, this.#config.run('path.weight'));
            }
          }
        }
      }
    }

    return newNetwork;
  }
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
            if (ifrng(config.random.path.form))
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

  #score = NaN;

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

  get score() {
    return this.#score;
  }

  set score(n) {
    this.#score = +n;
  }

  get reward() { }
  set reward(n) {
    this.#score = +(this.#score + n);
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
            return new Path(network, neuron1, neuron2, w);
          } catch (e) { throw new Error(e); };
        }
      },
      edit: {
        value: function(layer, i, d, w) {
          try {
            const [ neuron1, neuron2 ] = network.#getNeuronsForPath(layer, i, d);
            network.Path.recall(neuron1, neuron2).weight = w;
          } catch (e) { throw new Error(e); };
        }
      },
      change: {
        value: function(layer, i, d, w) {
          try {
            const [ neuron1, neuron2 ] = network.#getNeuronsForPath(layer, i, d);
            network.Path.recall(neuron1, neuron2).change = w;
          } catch (e) { throw new Error(e); };
        }
      },
      has: {
        value: function(layer, i, d) {
          try {
            const [ neuron1, neuron2 ] = network.#getNeuronsForPath(layer, i, d);
            return network.Paths.exists(neuron1, neuron2);
          } catch (e) { throw new Error(e); };
        }
      },
      get: {
        value: function(layer, i, d) {
          try {
            const [ neuron1, neuron2 ] = network.#getNeuronsForPath(layer, i, d);
            return network.Paths.recall(neuron1, neuron2);
          } catch (e) { throw new Error(e); };
        }
      },
      deform: {
        value: function(layer, i, d) {
          try {
            const [ neuron1, neuron2 ] = network.#getNeuronsForPath(layer, i, d);
            network.Paths.recall(neuron1, neuron2).deconstruct();
          } catch (e) { throw new Error(e); };
        }
      },
    }));
  }

  get Paths() {
    return {
      dictionary: new Map(),

      remember(path) {
        this.dictionary.set(`${path.from.ID}-${path.to.ID}`, path);
      },
      exists(from, to) {
        return this.dictionary.has(`${from.ID}-${to.ID}`);
      },
      recall(from, to) {
        return this.dictionary.get(`${from.ID}-${to.ID}`);
      },
      forget(from, to) {
        this.dictionary.delete(`${from.ID}-${to.ID}`);
      },
    };
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
  #bias = NaN;

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

  get bias() {
    return this.#bias;
  }

  set bias(b) {
    this.#bias = b;
    this.update();
  }

  update() {
    let sum = 0;
    for (const [ neuron, path ] of this.#from) sum += neuron.value * path.weight;
    this.value = 1 / (1 + Math.exp(-(sum + this.#bias)));
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
  #network;

  #from;
  #to;

  #weight;

  constructor(network, from, to, weight) {
    if (!(network instanceof Network)) throw new Error('Invalid network');
    this.#network = network;

    if (network.Paths.exists(from, to)) throw new Error('Path already exists');

    this.#from = from;
    this.#to = to;

    this.#weight = weight;

    from.To.add(to, this);
    to.From.add(from, this);

    network.Paths.remember(this);

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

    this.#network.Paths.forget(this.#from, this.#to);

    this.#from = undefined;
    this.#to = undefined;

    this.#weight = undefined;
  }
}

// test
/* const network = new Network();
network.Layer.new(1);
network.Layer.new(1);
network.Layer.new(1);
network.Path.form(0, 1, 1, 1);
network.Path.form(1, 1, 1, 1);

network.input(1);
console.log(network.output);

network.Path.reform(0, 1, 1, 100);
network.Path.reform(2, 1, -1, 100);
console.log(network.output); */