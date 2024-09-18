import './module/utility.mjs';
import './module/math.mjs';
import './module/logic_gate.mjs';

const cache = new Map();

Number.prototype.clamp = function(min, max) {
  return Math.min(Math.max(this, min), max);
}

Array.prototype.Σ = function() {
  return Σ(this);
}

Array.prototype.Ξ = function() {
  return this[Ξ(this.length) | 0];
}

Array.prototype.weight = function(m = 1) {
  const σ = Σ(this);
  return this.map(v => v / σ * m);
}

Array.prototype.iweight = function(m = 1) { // inverted weight
  const σ = Σ(this);
  return this.map(v => (σ - v) / σ * m);
}

Array.prototype.fit = function(min = 0, max = 1) {
  const range = max - min;

  const aMin = Math.min(...this);
  const aMax = Math.max(...this);
  const aRange = (aMax - aMin) || 1;

  return this.map(v => (v - aMin) / aRange * range + min);
}

Array.prototype.scopy = function() { // shallow copy
  return this.slice();
}

Set.prototype.scopy = function() { // shallow copy
  return new Set(this);
}

Object.scopy = function(o) { // shallow copy
  return { ...o };
}

Map.prototype.weight = function(m = 1) {
  const σ = Σ(this.values());
  return new Map(Array.from(this, ([ k, v ]) => [ k, v / σ * m ]));
}

Map.prototype.iweight = function(m = 1) { // inverted weight
  const σ = Σ(this.values());
  return new Map(Array.from(this, ([ k, v ]) => [ k, (σ - v) / σ * m ]));
}

Map.prototype.wΞ = function() {
  return [ ...this.keys() ][Math.wΞ([ ...this.values() ])];
}

Map.prototype.iwΞ = function() {
  return [ ...this.keys() ][Math.iwΞ([ ...this.values() ])];
}

Map.prototype.scopy = function() { // shallow copy
  return new Map(this);
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
            sexual: new Set([ ]),
            asexual: new Set([ 0,1,2,3,4,5,6,7,8,9,10 ]),

            map: new Map([
              [0,'asexual'],[1,'asexual'],[2,'asexual'],[3,'asexual'],[4,'asexual'],
              [5,'asexual'],[6,'asexual'],[7,'asexual'],[8,'asexual'],[9,'asexual'],
              [10,'asexual']
            ])
          },

          $: '!object', $set: false, $get: function(o, config, population) {
            return new Map([ ...o.map ]);
          },
        },
        algorithm: {
          _val_: 'proportional',

          $: 'defined', $values: new Set([ 'linear', 'proportional', 'weighted', 'random' ]),
        },

        _exe_(config, population) { //TESTME tied scores accounting
          if (fø(population)) throw new Error('Configuration has not yet been attached to a population');

          const algorithm = this.algorithm._val_;
          function GetLeaderboardNetworks(data) {
            const o = {
              sexual: new Set(),
              asexual: new Set(),

              map: new Map(),
            };

            population.Index.Leaderboard.grouped.forEach(function(set, i) {
              const k = data.map.get(i);
              for (const networkIndex of set) {
                if (k in o) { //i already know k is valid from config.population.natural_selection.dictionary.$set()
                  o[k].add(networkIndex);

                  o.map.set(networkIndex, k);
                }
              }
            });

            return o;
          }

          const data = GetLeaderboardNetworks(this.data._val_);

          const scores = population.Index.scores;

          const sexualScores = [ ...data.sexual ].map(i => scores.get(i - 1));
          const mapScores = new Map([ ...data.map ].map(([ i ]) => [ i, scores.get(i) ]));

          const sexualEquality = sexualScores.fit(config.population.equality.value._val_, 1);

          cache.set('σ', Σ(sexualEquality));
          cache.set('columnΣ', []);

          const sexualTension2DMap = [ ...data.sexual ].map(() => new Map());
          for (let x = 0; x < data.sexual.size; x++) {
            cache.get('columnΣ')[x] = cache.get('σ') - sexualEquality[x];
            for (let y = 0; y < x; y++) {
              const δ = sexualEquality[x] - sexualEquality[y];
              sexualTension2DMap[x].set(y, δ / cache.get('columnΣ')[x]);
              sexualTension2DMap[y].set(x, δ / cache.get('columnΣ')[y]);
            }
          }

          cache.clear();

          function FindPartner(v) {
            const i = [ ...data.sexual ].indexOf(v);

            return sexualTension2DMap[i].iwΞ();
          }

          const parentGroups = [];
          switch (algorithm) {
            case 'linear': {
              for (let i = 0; i < config.population.size.value._val_; ) {
                for (const [ k, dat ] of data.map) {
                  if (i++ >= config.population.size.value._val_) break;

                  switch (dat) {
                    case 'sexual': parentGroups.push([ dat, k, FindPartner(k) ]); break;
                    case 'asexual': parentGroups.push([ dat, k ]); break;
                  }
                }
              }
            } break;
            case 'proportional': {
              const proportions = mapScores.weight(config.population.size.value._val_);

              const remainders = [];
              proportions.forEach((v, k) => {
                remainders.push([ v % 1, k ]);
                v |= 0;

                for (let i = 0; i < v; i++) {
                  const dat = data.map.get(k);
                  switch (dat) {
                    case 'sexual': parentGroups.push([ dat, k, FindPartner(k) ]); break;
                    case 'asexual': parentGroups.push([ dat, k ]); break;
                  }
                }
              });

              remainders.sort((a, b) => a[0] - b[0]);
              for (let i = parentGroups.length; i < config.population.size.value._val_; i++) {
                const k = remainders.shift()[1];

                const dat = data.map.get(k);
                switch (dat) {
                  case 'sexual': parentGroups.push([ dat, k, FindPartner(k) ]); break;
                  case 'asexual': parentGroups.push([ dat, k ]); break;
                }
              }
            } break;
            case 'weighted': {
              for (let i = 0; i < config.population.size.value._val_; i++) {
                const k = mapScores.wΞ();

                const dat = data.map.get(k);
                switch (dat) {
                  case 'sexual': parentGroups.push([ dat, k, FindPartner(k) ]); break;
                  case 'asexual': parentGroups.push([ dat, k ]); break;
                }
              }
            } break;
            case 'random': {
              const keys = [ ...data.map.keys() ];
              for (let i = 0; i < config.population.size.value._val_; i++) {
                const k = keys.Ξ();

                const dat = data.map.get(k);
                switch (dat) {
                  case 'sexual': parentGroups.push([ dat, k, FindPartner(k) ]); break;
                  case 'asexual': parentGroups.push([ dat, k ]); break;
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
    neuron: {
      bias: {
        range: {
          min: {
            value: {
              _val_: -1,

              $: 'number',
            },
          },
          max: {
            value: {
              _val_: 1,

              $: 'number',
            },
          },

          _exe_(config, population) {
            return Ξ(this.min.value._val_, this.max.value._val_);
          },

          $get(o) {
            return { min: o.min.value._val_, max: o.max.value._val_ };
          },
        },
        mutate: { //IDEA: allow for radiation mutation (set weight to NaN)
          edit: {
            chance: {
              _val_: 1 / 100,
              _exe_(config, population) {
                return Ξif(this._val_);
              },

              $: 'number', $dat: 'percent',
            },
          },
          change: {
            chance: {
              _val_: 5 / 100,
              _exe_(config, population) {
                return Ξif(this._val_);
              },

              $: 'number', $dat: 'percent',
            },
            amount: {
              _val_: 0.25,
              _exe_(config, population) {
                return Ξsign(0, this._val_);
              },

              $: 'number',
            },

            _exe_(config, population) {
              return Ξif(this.chance._val_) ?
                Ξsign(0, this.amount._val_) :
                0;
            },

            $default: 'chance',
          },

          _exe_(config, population) {
            const set = new Set();

            if (Ξif(this.edit.chance._val_)) set.add('edit');
            if (Ξif(this.change.chance._val_)) set.add('change');

            return set;
          }
        },

        $default: 'range',
      },
    },
    path: {
      weight: {
        range: {
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
            return Ξ(this.min.value._val_, this.max.value._val_);
          },

          $get(o) {
            return { min: o.min.value._val_, max: o.max.value._val_ };
          }
        },
        birth: {
          form: {
            chance: {
              _val_: 50 /100,
              _exe_(config, population) {
                return Ξif(this._val_);
              },

              $: 'number', $dat: 'percent',
            },

            $default: 'chance',
          },

          _exe_(config, population) {
            const set = new Set();

            if (Ξif(this.form.chance._val_)) set.add('form');

            return set;
          },
        },
        mutate: { //IDEA: allow for radiation mutation (set weight to NaN)
          form: {
            chance: {
              _val_: 2 / 100,
              _exe_(config, population) {
                return Ξif(this._val_);
              },

              $: 'number', $dat: 'percent',
            },

            $default: 'chance',
          },
          edit: {
            chance: {
              _val_: 1 / 100,
              _exe_(config, population) {
                return Ξif(this._val_);
              },

              $: 'number', $dat: 'percent',
            },

            $default: 'chance',
          },
          change: {
            chance: {
              _val_: 25 / 100,
              _exe_(config, population) {
                return Ξif(this._val_);
              },

              $: 'number', $dat: 'percent',
            },
            amount: {
              _val_: 5,
              _exe_(config, population) {
                return Ξsign(0, this._val_);
              },

              $: 'number',
            },

            _exe_(config, population) {
              return Ξif(this.chance._val_) ?
                Ξsign(0, this.amount._val_) :
                0;
            },

            $default: 'chance',
          },
          deform: {
            chance: {
              _val_: 2 / 100,
              _exe_(config, population) {
                return Ξif(this._val_);
              },

              $: 'number', $dat: 'percent',
            },

            $default: 'chance',
          },

          _exe_(config, population) {
            const set = new Set();

            if (Ξif(this.form.chance._val_)) set.add('form');
            if (Ξif(this.edit.chance._val_)) set.add('edit');
            if (Ξif(this.change.chance._val_)) set.add('change');
            if (Ξif(this.deform.chance._val_)) set.add('deform');

            return set;
          },
        },

        $default: 'range',
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

      if (typeof v === 'object' && !Array.isArray(v) && v !== Ø) {
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
    if (typeof config === 'object' && !Array.isArray(config) && config !== Ø)
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
    if (!fø(this.#population) && this.#population.running) throw new Error('Cannot configure while population is running');

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
          if (fØ(v) || typeof v !== 'object') throw new Error('Invalid value type configured');
        } break;
        case 'array': {
          if (!Array.isArray(v)) throw new Error('Invalid value type configured');
        } break;
        case Ø:
        case 'null': {
          if (!fØ(v)) throw new Error('Invalid value type configured');
        } break;
        case ø: break;
        default: {
          if (typeof v !== o.$) throw new Error('Invalid value type configured');
        } break;
      }

      this.#set(o, v);
    } else if ('$set' in o) this.#set(o, v);
    else throw new Error('Cannot configure this key');
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
    else if ('$get' in o) return o.$get(o, this.#config, this.#population);
    else throw new Error('Cannot get this key');
  };

  simplify() {
    const simplify = o => {
      if (typeof o === 'object' && !Array.isArray(o) && !fØ(o)) {
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
    else if (v.running) throw new Error('Cannot attach running population');
    else if (v.config instanceof this.constructor && !Object.is(v.config, this)) throw new Error('Configuration mismatch');
    else this.#population = v;
  }
}

class Population {
  #config;
  #networks = new Map();
  #newNetworks = new Map();

  #running = false;

  #hasValidConfig() {
    if (!(this.#config instanceof Config)) throw new Error('Population configuration not properly attached');
  }

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
    if (c instanceof Config) {
      this.#config = c;
      c.population = this;
    } else throw new Error('Invalid configuration object');
  }

  get running() {
    return this.#running;
  }

  get size() {
    return this.#config.get('population.size');
  }

  start() {
    if (this.#running) throw new Error('Population already running');

    this.#networks.clear();
    const size = this.#config.get('population.size');
    for (let i = 0; i < size; i++) {
      const network = new Network(this, i);
      this.#networks.set(i, network);
      network.Setup.random();
    }

    this.#running = true;

    return true;
  }

  resume() {
    if (this.#running) throw new Error('Population already running');

    this.#running = true;

    return true;
  }

  restart() {
    if (!this.#running) throw new Error('Population not running');

    this.#networks.forEach(network => network.reset());

    return true;
  }

  evolve() {
    if (!this.#running) throw new Error('Population not running');
    this.#running = false;

    const get = (function(i) { return this.get(i) }).bind(this.Network.Leaderboard.ungrouped);

    this.#newNetworks.clear();

    const parentGroups = this.#config.run('population.natural_selection');
    for (const parents of parentGroups)
      this.#Reproduce[parents.shift()](this.#newNetworks.size, ...parents.map(get));

    this.#networks.forEach(network => network.deconstruct());
    this.#networks.clear();

    this.#newNetworks.forEach((network, i) => this.#networks.set(i, network));
    this.#newNetworks.clear();

    this.#running = true;

    return true;
  }

  stop() {
    if (!this.#running) throw new Error('Population not running');

    this.#running = false;

    return true;
  }

  get Network() {
    const population = this;
    return Object.freeze(Object.defineProperties({}, {
      list: { // list of networks
        get() {
          return population.#networks.scopy();
        }
      },
      get: { // get network by index
        value: function(i) {
          return population.#networks.get(i);
        }
      },
      has: { // check if network exists
        value: function(i) {
          return population.#networks.has(i);
        }
      },
      scores: { // get scores of networks, using network as key
        get() {
          return new Map([ ...population.#networks.values() ]
            .map(network => [ network, network.score ]));
        }
      },
      rankings: { // get rankings of networks, using network as key
        get() {
          return new Map([ ...population.#networks.values() ]
            .sort(iΔ.bind('score'))
            .map((network, i) => [ network, i ]));
        }
      },
      Leaderboard: { // get leaderboard of networks, using leaderboard index as key
        value: Object.defineProperties({}, {
          grouped: { //i networks with tied scores are grouped together (ex. 1. 100, 2. 90, 2. 90, 4. 80)
            get() {
              const leaderboard = new Map();
              let i = 0;

              cache.delete('lastScore');
              cache.delete('lastIndex');
              new Map([ ...population.#networks.values() ]
                .sort(iΔ.bind('score'))
                .forEach(network => {
                  if (network.score === cache.get('lastScore')) leaderboard.get(cache.get('lastIndex')).add(network);
                  else {
                    leaderboard.set(i, new Set([ network ]));
                    cache.set('lastIndex', i);
                  }

                  cache.set('lastScore', network.score);

                  i++;
                }));

              cache.delete('lastScore');

              return leaderboard;
            }
          },
          ungrouped: { //i networks with tied scores are not grouped (ex. 1. 100, 2. 90, 3. 90, 4. 80)
            get() {
              return new Map([ ...population.#networks.values() ]
                .sort(iΔ.bind('score'))
                .map((network, i) => [ i, network ]));
            }
          },
        }),
      },
      best: { // get best network
        get() {
          return [ ...population.#networks.values() ]
            .reduce((a, b) => a.score > b.score ? a : b);
        }
      },
    }));
  }

  get NewNetwork() {
    const population = this;
    return Object.freeze(Object.defineProperties({}, {
      list: { // list of new networks
        get() {
          return population.#newNetworks.scopy();
        }
      },
      get: { // get new network by index
        value: function(i) {
          return population.#newNetworks.get(i);
        }
      },
      has: { // check if new network exists
        value: function(i) {
          return population.#newNetworks.has(i);
        }
      },
    }));
  }

  get Index() {
    const population = this;
    return Object.freeze(Object.defineProperties({}, {
      get: {
        value: function(network) {
          return network.index;
        }
      },
      scores: { // get scores of network indices, using index as key
        get() {
          return new Map([ ...population.#networks ]
            .map(([ i, network ]) => [ i, network.score ]));
        }
      },
      rankings: { // get rankings of network indices, using index as key
        get() {
          return new Map([ ...population.#networks.values() ]
            .sort(iΔ.bind('score'))
            .map((network, i) => [ network.index, i ]));
        }
      },
      Leaderboard: { // get leaderboard of network indices, using leaderboard index as key
        value: Object.defineProperties({}, {
          grouped: { //i networks with tied scores are grouped together (ex. 1. 100, 2. 90, 2. 90, 4. 80)
            get() {
              const leaderboard = new Map();
              let i = 0;

              cache.delete('lastScore');
              cache.delete('lastIndex');
              new Map([ ...population.#networks.values() ]
                .sort(iΔ.bind('score'))
                .forEach(network => {
                  if (network.score === cache.get('lastScore')) leaderboard.get(cache.get('lastIndex')).add(network.index);
                  else {
                    leaderboard.set(i, new Set([ network.index ]));
                    cache.set('lastIndex', i);
                  }

                  cache.set('lastScore', network.score);

                  i++;
                }));

              cache.delete('lastScore');

              return leaderboard;
            }
          },
          ungrouped: { //i networks with tied scores are not grouped (ex. 1. 100, 2. 90, 3. 90, 4. 80)
            get() {
              return new Map([ ...population.#networks.values() ]
                .sort(iΔ.bind('score'))
                .map((network, i) => [ i, network.index ]));
            }
          },
        }),
      },
      best: { // get index of best network
        get() {
          return [ ...population.#networks ]
            .reduce((a, b) => a[1].score > b[1].score ? a : b)[0];
        }
      },
    }));
  }

  get #Reproduce() { //TESTME
    const population = this;

    function isReproductionValid(...parents) {
      population.#hasValidConfig();

      for (const parent of parents)
        if (!(parent instanceof Network)) throw new Error('Invalid parent network object');
        else if (!Object.is(parent.population, population)) throw new Error('Parent network not attached to population');
    }

    return Object.freeze(Object.defineProperties({}, {
      sexual: {
        value: function(i, parent1, parent2) {
          isReproductionValid(parent1, parent2);

          const child = new Network(population, i);
          population.#newNetworks.set(i, child);

          const dominance = () => [
            Ξif() ? Ξ() : -1, // parent1 {dom : rec}
            Ξif() ? Ξ() : -1, // parent2 {dom : rec}
          ];

          child.Setup.custom(function(action, ...args) {
            switch (action) {
              case 'neuron': { // args = [ x, y ]
                const [ x, y ] = args;

                const [ score1, score2 ] = dominance();
                const recessive = +(score1 === -1) + +(score2 === -1);
                if (recessive === 2 || recessive === 0) // xx or XX
                  return (parent1.Neuron.get(x, y).bias * score1 + parent2.Neuron.get(x, y).bias * score2) / (score1 + score2);
                else if (score1 === -1) // xX
                  return parent2.Neuron.get(x, y).bias;
                else if (score2 === -1) // Xx
                  return parent1.Neuron.get(x, y).bias;
                else throw new Error('This should never happen');
              } break;
              case 'path': { // args = [ x1, y1, x2, y2 ]
                const [ x1, y1, x2, y2 ] = args;

                const [ score1, score2 ] = dominance();
                const recessive = +(score1 === -1) + +(score2 === -1);

                if (recessive === 2 || recessive === 0) { // xx or XX
                  const weights = [ score1, score2 ].weight();

                  const w1 = parent1.Path.recall(x1, y1, x2, y2)?.weight;
                  const w2 = parent2.Path.recall(x1, y1, x2, y2)?.weight;

                  if (fø(w1) || fø(w2)) return Ξif(weights[0]) ? w1 : w2;
                  else return w1 * weights[0] + w2 * weights[1];
                } else if (score1 === -1) // xX
                  return parent2.Path.recall(x1, y1, x2, y2)?.weight;
                else if (score2 === -1) // Xx
                  return parent1.Path.recall(x1, y1, x2, y2)?.weight;
                else throw new Error('This should never happen');
              } break;
            }
          }, { mutate: true });
        }
      },
      asexual: {
        value: function(i, parent) {
          isReproductionValid(parent);

          const child = new Network(population, i);
          population.#newNetworks.set(i, child);

          child.Setup.custom(function(action, ...args) {
            switch (action) {
              case 'neuron': { // args = [ x, y ]
                return parent.Neuron.get(...args).bias;
              } break;
              case 'path': { // args = [ x1, y1, x2, y2 ]
                return parent.Path.recall(...args)?.weight;
              } break;
            }
          }, { mutate: true });
        }
      },
    }));
  }
}

class Network {
  #population;
  #index;

  #layers = new Map();

  #score = 0;

  #isValid() {
    if (!Object.is(this.#population.Network.get(this.#index), this) && !Object.is(this.#population.NewNetwork.get(this.#index), this))
      throw new Error('Network not properly attached to population');
  }

  constructor(population, index) {
    if (!(population instanceof Population)) throw new Error('Invalid population object');
    this.#population = population;

    this.#index = +index;
  }

  get population() {
    this.#isValid();

    return this.#population;
  }

  get index() {
    this.#isValid();

    return this.#index;
  }

  get score() {
    this.#isValid();

    return this.#score;
  }

  set score(v) {
    this.#isValid();

    if (typeof v !== 'number') throw new Error('Invalid score value');
    this.#score = v;
  }

  get reward() { }
  set reward(δ) {
    this.#isValid();

    if (typeof δ !== 'number') throw new Error('Invalid reward value');
    this.#score += δ;
  }

  get Setup() {
    this.#isValid();

    const network = this;
    return Object.freeze(Object.defineProperties({}, {
      blank: {
        value() {
          network.#isValid();

          if (!(network.#population.config instanceof Config)) throw new Error('Population configuration not properly attached');
          if (network.#population.running) throw new Error('Cannot setup layers while population is running');

          network.#layers.clear();
          network.#score = 0;

          const layers = network.#population.config.get('network.layers.list');
          for (const size of layers) {
            const layer = new Map();
            network.#layers.set(network.#layers.size, layer);

            for (let i = 0; i < size; i++)
              layer.set(i, new Neuron(network, network.#layers.size - 1, i));
          }

          return true;
        }
      },
      random: {
        value() {
          network.#isValid();

          if (!(network.#population.config instanceof Config)) throw new Error('Population configuration not properly attached');
          if (network.#population.running) throw new Error('Cannot setup layers while population is running');

          network.#layers.clear();
          network.#score = 0;

          const layers = network.#population.config.get('network.layers.list');
          for (const size of layers) {
            const layer = new Map();
            network.#layers.set(network.#layers.size, layer);

            for (let i = 0; i < size; i++) {
              layer.set(i, new Neuron(network, network.#layers.size - 1, i, network.#population.config.run('neuron.bias')));

              if (network.#layers.size > 1)
                for (const [ _, neuron ] of network.#layers.get(network.#layers.size - 2))
                  if (network.#population.config.run('path.weight.birth.form'))
                    network.Path.form(
                      network.#layers.size - 2,
                      neuron.y,
                      network.#layers.size - 1,
                      i,
                      network.#population.config.run('path.weight')
                    );
            }
          }

          return true;
        }
      },
      custom: { //TESTME network.Setup.custom mutations
        value(fn, options = {}) {
          network.#isValid();

          if (!(network.#population.config instanceof Config)) throw new Error('Population configuration not properly attached');
          if (network.#population.running) throw new Error('Cannot setup layers while population is running');
          if (typeof fn !== 'function') throw new Error('Invalid setup function');
          if (typeof options !== 'object' || Array.isArray(options) || fØ(options)) throw new Error('Invalid options object');

          network.#layers.clear();
          network.#score = 0;

          const layers = network.#population.config.get('network.layers.list');
          for (const size of layers) {
            const layer = new Map();
            network.#layers.set(network.#layers.size, layer);

            for (let i = 0; i < size; i++) {
              let bias = fn('neuron', network.#layers.size - 1, i); // action, x, y
              if (FØ(bias)) throw new Error('A neuron must have a bias'); //IDEA allow for undefined bias / neurons that don't exist
              else {
                if (options.mutate) {
                  const mutations = network.#population.config.run('neuron.bias.mutate');

                  if (mutations.has('edit')) bias = network.#population.config.run('neuron.bias');
                  else if (mutations.has('change')) bias += network.#population.config.run('neuron.bias.mutate.change.amount');
                }
              }

              layer.set(i, new Neuron(network, network.#layers.size - 1, i, bias));

              if (network.#layers.size > 1)
                for (const [ _, neuron ] of network.#layers.get(network.#layers.size - 2)) {
                  let w = fn('path', network.#layers.size - 2, neuron.y, network.#layers.size - 1, i); // action, x1, y1, x2, y2
                  const mutations = network.#population.config.run('path.weight.mutate');
                  if (FØ(w)) {
                    if (mutations.has('form'))
                      w = network.#population.config.run('path.weight');
                    else continue;
                  } else {
                    if (mutations.has('deform')) continue;
                    else if (mutations.has('edit')) w = network.#population.config.run('path.weight');
                    else if (mutations.has('change')) w += network.#population.config.run('path.weight.mutate.change.amount');
                  }

                  network.Path.form(network.#layers.size - 2, neuron.y, network.#layers.size - 1, i, w); //i only paths to form reach this point
                }
            }
          }

          return true;
        }
      }
    }));
  }

  get Neuron() {
    this.#isValid();

    const network = this;
    return Object.freeze(Object.defineProperties({}, {
      list: {
        get() {
          return new Map([ ...network.#layers.values() ]
            .flatMap(layer => [ ...layer.values() ])
            .map(neuron => [ `${neuron.x},${neuron.y}`, neuron ]));
        }
      },
      get: {
        value: function(x, y) {
          return network.#layers.get(x)?.get(y);
        }
      },
      set: {
        value: function(x, y, bias) {
          if (network.#layers.has(x) && network.#layers.get(x).has(y))
            network.#layers.get(x).get(y).bias = bias;
        }
      },
      change: {
        value: function(x, y, δ) {
          if (network.#layers.has(x) && network.#layers.get(x).has(y))
            network.#layers.get(x).get(y).bias += δ;
        }
      },
    }));
  }

  #neuronsForPath(x1, y1, x2, y2) {
    if (
      x1 === x2 ||
      x1 < 0 || x1 >= this.#layers.size ||
      x2 < 0 || x2 >= this.#layers.size ||
      y1 < 0 || y1 >= this.#layers.get(x1).size ||
      y2 < 0 || y2 >= this.#layers.get(x2).size
    ) throw new Error('Invalid path');
    else if (x1 > x2) {
      const temp = x1;
      x1 = x2;
      x2 = temp;
    }

    if (x1 + 1 !== x2) throw new Error('Invalid path');
    else return [ this.#layers.get(x1).get(y1), this.#layers.get(x2).get(y2) ];
  }

  #path = {
    list: new Map(),
    remember(from, to, path) {
      this.list.set(`${from.ID}-${to.ID}`, path);
    },
    forget(from, to) {
      this.list.delete(`${from.ID}-${to.ID}`);
    },
    exists(from, to) {
      return this.list.has(`${from.ID}-${to.ID}`);
    },
    recall(from, to) {
      return this.list.get(`${from.ID}-${to.ID}`);
    },
  };

  get Path() {
    this.#isValid();

    const network = this;
    return Object.freeze(Object.defineProperties({}, {
      exists: {
        value(...args) {
          network.#isValid();

          let from, to;
          if (args.length === 2) [ from, to ] = args;
          else if (args.length === 4) [ from, to ] = network.#neuronsForPath(...args);

          return network.#path.exists(from, to);
        }
      },
      recall: {
        value(...args) {
          network.#isValid();

          let from, to;
          if (args.length === 2) [ from, to ] = args;
          else if (args.length === 4) [ from, to ] = network.#neuronsForPath(...args);

          return network.#path.recall(from, to);
        }
      },
      form: {
        value(x1, y1, x2, y2, weight) {
          network.#isValid();

          const [ from, to ] = network.#neuronsForPath(x1, y1, x2, y2);
          if (network.#path.exists(from, to)) throw new Error('Path already exists');

          try {
            const path = new Path(network, from, to, weight);
            network.#path.remember(from, to, path);

            from.To.add(path);
            to.From.add(path);

            to.update();

            return path;
          } catch (e) { throw new Error(e); }
        }
      },
      edit: {
        value(x1, y1, x2, y2, weight) {
          network.#isValid();

          const [ from, to ] = network.#neuronsForPath(x1, y1, x2, y2);
          if (!network.#path.exists(from, to)) throw new Error('Path does not exist');

          try {
            network.#path.recall(from, to).weight = weight;
            to.update();

            return true;
          } catch (e) { throw new Error(e); }
        }
      },
      change: {
        value(x1, y1, x2, y2, δ) {
          network.#isValid();

          const [ from, to ] = network.#neuronsForPath(x1, y1, x2, y2);
          if (!network.#path.exists(from, to)) throw new Error('Path does not exist');

          try {
            network.#path.recall(from, to).weight += δ;
            to.update();

            return true;
          } catch (e) { throw new Error(e); }
        }
      },
      deform: {
        value(x1, y1, x2, y2) {
          network.#isValid();

          const [ from, to ] = network.#neuronsForPath(x1, y1, x2, y2);
          if (!network.#path.exists(from, to)) throw new Error('Path does not exist');

          try {
            network.#path.recall(from, to).deconstruct();
            network.#path.forget(from, to);

            from.To.remove(to);
            to.From.remove(from);

            to.update();

            return true;
          } catch (e) { throw new Error(e); }
        }
      },
    }));
  }

  input(...inputs) {
    this.#isValid();

    if (inputs.length !== this.#layers.get(0).size) throw new Error('Invalid input size');

    for (const [ i, neuron ] of this.#layers.get(0))
      neuron.value = inputs[i];
  }

  output() {
    this.#isValid();

    const output = [];
    for (const [ _, neuron ] of this.#layers.get(this.#layers.size - 1))
      output.push(neuron.value);

    return output;
  }

  deconstruct() {
    this.#isValid();

    for (const [ x1, layer ] of this.#layers)
      for (const [ y1, neuron ] of layer)
        neuron.deconstruct();

    this.#population = ø;
    this.#index = ø;

    this.#layers.clear();

    this.#score = 0;
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

  #network;
  #x;
  #y;

  #from = new Map();
  #to = new Map();

  #bias = NaN;
  #value = NaN;

  #isValid() {
    if (fø(this.#id) || !Object.is(this.#network.Neuron.get(this.#x, this.#y), this))
      throw new Error('Neuron not properly attached to network');
  }

  constructor(network, x, y, bias = NaN) {
    if (!(network instanceof Network)) throw new Error('Invalid network');
    if (!fø(network.Neuron.get(x, y))) throw new Error('Neuron already exists');

    this.#network = network;
    this.#x = +x;
    this.#y = +y;

    const { min, max } = this.#network.population.config.get('neuron.bias');
    this.#bias = (+bias).clamp(min, max);
  }

  get network() {
    this.#isValid();

    return this.#network;
  }

  get x() {
    this.#isValid();

    return this.#x;
  }

  get y() {
    this.#isValid();

    return this.#y;
  }

  get ID() {
    this.#isValid();

    return this.#id;
  }

  get bias() {
    this.#isValid();

    return this.#bias;
  }

  set bias(b) {
    this.#isValid();

    const { min, max } = this.#network.population.config.get('neuron.bias');
    this.#bias = (+b).clamp(min, max);
    this.update();
  }

  update() {
    this.#isValid();

    let σ = 0;
    for (const [ neuron, path ] of this.#from) σ += neuron.value * path.weight;
    this.value = 1 / (1 + Math.exp(-(σ + this.#bias)));
  }

  get value() {
    this.#isValid();

    return this.#value;
  }

  set value(v) {
    this.#isValid();

    this.#value = v;
    for (const [ neuron ] of this.#to) neuron.update();
  }

  #isPathable(neuron, d) {
    return neuron instanceof Neuron &&
      Object.is(neuron.#network, this.#network) &&
      (
        (fø(d) && (neuron.#x === this.#x + 1 || neuron.#x === this.#x - 1)) ||
        (d === 1 && neuron.#x === this.#x + 1) ||
        (d === -1 && neuron.#x === this.#x - 1)
      );
  }

  get From() {
    const neuron = this;
    return Object.freeze(Object.defineProperties({}, {
      add: {
        value: function(path) {
          neuron.#isValid();

          if (path.to.ID !== neuron.ID) throw new Error('Path not properly attached to neuron');
          if (!neuron.#isPathable(path.from, -1)) throw new Error('Invalid path');

          neuron.#from.set(path.from, path);
        }
      },
      remove: {
        value: function(from) {
          neuron.#isValid();

          neuron.#from.delete(from);
        }
      },
    }));
  }

  get To() {
    const neuron = this;
    return Object.freeze(Object.defineProperties({}, {
      add: {
        value: function(path) {
          neuron.#isValid();

          if (path.from.ID !== neuron.ID) throw new Error('Path not properly attached to neuron');
          if (!neuron.#isPathable(path.to, 1)) throw new Error('Invalid path');

          neuron.#to.set(path.to, path);
        }
      },
      remove: {
        value: function(to) {
          neuron.#isValid();

          neuron.#to.delete(to);
        }
      },
    }));
  }

  deconstruct() {
    this.#isValid();

    for (const [ neuron ] of this.#from)
      this.network.Path.deform(neuron.x, neuron.y, this.#x, this.#y);

    for (const [ neuron ] of this.#to)
      this.network.Path.deform(this.#x, this.#y, neuron.x, neuron.y);

    Neuron.#deleteID(this.#id);
    this.#id = ø;

    this.#network = ø;
    this.#x = ø;
    this.#y = ø;

    this.#from.clear();
    this.#to.clear();

    this.#bias = NaN;
    this.#value = NaN;
  }
}

class Path {
  #network;

  #from;
  #to;

  #weight = NaN;

  #isValid() {
    if (!Object.is(this.#network.Path.recall(this.#from, this.#to), this))
      throw new Error('Path not properly attached to network');
  }

  constructor(network, from, to, w = NaN) {
    if (!(network instanceof Network)) throw new Error('Invalid network');
    if (network.Path.exists(from, to)) throw new Error('Path already exists');

    this.#network = network;

    this.#from = from;
    this.#to = to;

    const { min, max } = this.#network.population.config.get('path.weight');
    this.#weight = (+w).clamp(min, max);
  }

  get from() {
    this.#isValid();

    return this.#from;
  }

  get to() {
    this.#isValid();

    return this.#to;
  }

  get weight() {
    this.#isValid();

    return this.#weight;
  }

  set weight(w) {
    this.#isValid();

    const { min, max } = this.#network.population.config.get('path.weight');
    this.#weight = (+w).clamp(min, max);
    this.#to.update();
  }

  deconstruct() {
    this.#isValid();

    this.#network = ø;

    this.#from = ø;
    this.#to = ø;

    this.#weight = NaN;
  }
}

export { Config, Population };