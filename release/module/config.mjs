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

import Rejection from './debug.mjs';

export default class Config {
  // setters
  static default = Symbol('default');

  static value = Symbol('value');
  static method = Symbol('method');

  static getter = Symbol('getter');
  static setter = Symbol('setter');
  static deleter = Symbol('deleter');

  static filter = Symbol('filter');
  static disabler = Symbol('disabler');

  // getters
  static get = Symbol('get');
  static set = Symbol('set');
  static delete = Symbol('delete');

  static test = Symbol('test');

  static call = Symbol('call');

  static isDisabled = Symbol('isDisabled');
  static isDefined = Symbol('isDefined');

  static isGettable = Symbol('isGettable');
  static isSettable = Symbol('isSettable');
  static isDeletable = Symbol('isDeletable');
  static isCallable = Symbol('isCallable');

  static hasDefault = Symbol('hasDefault');
  static hasValue = Symbol('hasValue');
  static hasMethod = Symbol('hasMethod');
  static hasGetter = Symbol('hasGetter');
  static hasSetter = Symbol('hasSetter');
  static hasDeleter = Symbol('hasDeleter');
  static hasFilter = Symbol('hasFilter');
  static hasDisabler = Symbol('hasDisabler');

  // private
  static #defined = Symbol('defined');
  static #default = Symbol('default');
  static #value = Symbol('value');
  static #method = Symbol('method');
  static #getter = Symbol('getter');
  static #setter = Symbol('setter');
  static #deleter = Symbol('deleter');
  static #filter = Symbol('filter');
  static #disabler = Symbol('disabler');

  #config; // create config
  constructor(o, put) {
    this.#config = this.#Configure(o); // configure object
    if (put) this.put(put); // put object
  }

  get root() { return this.#config; } // get root

  put(o) { // configure object with reference (o: object)
    const reject = new Rejection('Failed to put object on config.', 'object', o);

    if (typeof o !== 'object' || o === null) // if o is not an object or is null
      reject.handle('The object must be a valid object.'); // throw error

    let q = [ [ this.#config, o, [ '' ] ] ]; // create queue with this.#config, o, and path
    for ( ; q.length; ) { // while q is not empty
      const [ parent, child, path ] = q.shift(); // get parent, child, and path from queue
      if (Config.value in child) // if value is in child
        parent[Config.set](child[Config.value]); // set value

      for (const k in child) // for each key in child
        if (typeof k === 'symbol') // if key is a symbol
          reject.handle('Child cannot have symbol keys.', 'parent', parent, 'child', child, 'path', path, 'key', k); // throw error
        else if (typeof child[k] === 'object' && child[k] !== null) { // if key is an object and is not null
          if (k in parent) // if k is in parent
            q.push([ parent[k], child[k], [ ...path, k ] ]); // push parent[k], child[k], and [ ...path, k ] to queue
          else reject.handle('Child key not found in parent.', 'parent', parent, 'child', child, 'path', path, 'key', k); // throw error
        } else reject.handle('Child must be an object (not null).', 'parent', parent, 'child', child, 'path', path, 'key', k); //
    }

    return this.#config; // return this.#config
  }

  #Configure(o) { // configure object (o: object)
    const reject = new Rejection('Failed to configure object.', 'object', o);

    if (typeof o !== 'object' || o === null) // if o is not an object or is null
      reject.handle('The object must be a valid object.'); // throw error

    function def(parent, k, o, toDelete) { // define property (parent: object, k: string, o: object, toDelete: boolean)
      Object.defineProperty(parent, k, o); // define property
      if (toDelete) // if toDelete is true
        delete o.value; // delete value
    }

    const config = {}; // create config object
    let q = [ [ config, o, [ '' ] ] ]; // create queue with config, o, and path
    for ( ; q.length; ) { // while q is not empty
      const [ parent, child, path ] = q.shift(); // get parent, child, and path from queue
      const configured = Object.defineProperties({}, { // create configured object
        [Config.#defined]: { value: false, enumerable: false, writable: true }, // define defined
        [Config.#default]: { value: child[Config.default], enumerable: false, writable: true }, // define default
        [Config.#value]: { value: child[Config.value], enumerable: false, writable: true }, // define value
        [Config.#method]: { value: child[Config.method], enumerable: false }, // define method
        [Config.#getter]: { value: child[Config.getter], enumerable: false }, // define getter
        [Config.#setter]: { value: child[Config.setter], enumerable: false }, // define setter
        [Config.#deleter]: { value: child[Config.deleter], enumerable: false }, // define deleter
        [Config.#filter]: { value: child[Config.filter], enumerable: false }, // define filter
        [Config.#disabler]: { value: child[Config.disabler], enumerable: false } // define disabler
      });

      function has(k) { // has key (k: string)
        return configured[k] !== undefined; // return true if configured[k] is not undefined
      }

      const ks = [ 'Default', 'Value', 'Method', 'Getter', 'Setter', 'Deleter', 'Filter', 'Disabler' ]; // create keys
      for (const k of ks) // for each key
        if (Config[k.toLowerCase()] in child) // if key is in child
          def(configured, Config[`has${k}`], { // define has key
            get() { return true; }, // define key getter
            enumerable: false,
          }, true); // delete value
        else
          def(configured, Config[`has${k}`], { // define has key
            get() { return false; }, // define key getter
            enumerable: false,
          }, true); // delete value

      if (!has(Config.#disabler)) // if disabler is not defined
        def(configured, Config.isDisabled, {
          get() { return false; } // define isDisabled getter
        });
      else if (typeof configured[Config.#disabler] === 'function')
        def(configured, Config.isDisabled, {
          get() { return configured[Config.#disabler].call({ root: config[''], local: configured }); } // define isDisabled getter
        });
      else reject.handle('Disabler must be a function or undefined.', 'parent', parent, 'child', child, 'path', path, 'disabler', configured[Config.#disabler]); // throw error

      if ((!has(Config.#getter) && configured[Config.#getter] !== false) || has(Config.#value) || has(Config.#default)) // if getter is not defined and getter is not false or value or default is defined
        def(configured, Config.isGettable, {
          get() { return !configured[Config.isDisabled] } // define isGettable getter
        });
      else
        def(configured, Config.isGettable, {
          get() { return false; } // define isGettable getter
        });

      if ((has(Config.#setter) && configured[Config.#setter] !== false) || has(Config.#value)) // if setter is defined and setter is not false or value is defined
        def(configured, Config.isSettable, {
          get() { return !configured[Config.isDisabled] } // define isSettable getter
        });
      else
        def(configured, Config.isSettable, {
          get() { return false; } // define isSettable getter
        });

      if (has(Config.#deleter) && configured[Config.#deleter] !== false && has(Config.#value)) // if deleter is defined and value is defined
        def(configured, Config.isDeletable, {
          get() { return !configured[Config.isDisabled] } // define isDeletable getter
        });
      else
        def(configured, Config.isDeletable, {
          get() { return false; } // define isDeletable getter
        });

      if (has(Config.#method))
        def(configured, Config.isCallable, {
          get() { return !configured[Config.isDisabled] } // define isCallable getter
        });
      else
        def(configured, Config.isCallable, {
          get() { return false; } // define isCallable getter
        });

      if (configured[Config.#getter] === false)
        def(configured, Config.get, {
          value() { reject.handle('Property is not gettable.', 'parent', parent, 'child', child, 'path', path); } // define get
        });
      else if (has(Config.#getter) && typeof configured[Config.#getter] === 'function')
        def(configured, Config.get, {
          value() {
            const disabled = configured[Config.isDisabled]; // get isDisabled
            if (disabled) // if isDisabled is true
              reject.handle(`Property is disabled with reason: ${disabled}`, 'parent', parent, 'child', child, 'path', path); // throw error

            const v = configured[Config.#defined] ? configured[Config.#value] : configured[Config.#default]; // get value or default
            return configured[Config.#getter].call({ root: config[''], local: configured }, v); // return value or default
          }
        });
      else if (!has(Config.#getter) || configured[Config.#getter] === true) {
        if (has(Config.#value))
          def(configured, Config.get, {
            value() { // define get
              const disabled = configured[Config.isDisabled]; // get isDisabled
              if (disabled) // if isDisabled is true
                reject.handle(`Property is disabled with reason: ${disabled}`, 'parent', parent, 'child', child, 'path', path); // throw error

              return configured[Config.#defined] ? configured[Config.#value] : configured[Config.#default]; // return value or default
            }
          });
        else if (has(Config.#default))
          def(configured, Config.get, {
            value() { // define get
              const disabled = configured[Config.isDisabled]; // get isDisabled
              if (disabled) // if isDisabled is true
                reject.handle(`Property is disabled with reason: ${disabled}`, 'parent', parent, 'child', child, 'path', path); // throw error

              return configured[Config.#default]; // return value or default
            }
          });
        else if (!has(Config.#getter))
          def(configured, Config.get, {
            value() { reject.handle('Property is not gettable.', 'parent', parent, 'child', child, 'path', path); } // define get
          });
        else reject.handle('Value or default must be defined for getter to be true.', 'parent', parent, 'child', child, 'path', path); // throw error
      } else reject.handle('Getter must be a function, boolean, or undefined.', 'parent', parent, 'child', child, 'path', path); // throw error

      if (configured[Config.#setter] === false)
        def(configured, Config.set, {
          value() { reject.handle('Property is not settable.', 'parent', parent, 'child', child, 'path', path); } // define set
        });
      else if (has(Config.#setter) && typeof configured[Config.#setter] === 'function')
        def(configured, Config.set, {
          value(v) {
            const disabled = configured[Config.isDisabled]; // get isDisabled
            if (disabled) // if isDisabled is true
              reject.handle(`Property is disabled with reason: ${disabled}`, 'parent', parent, 'child', child, 'path', path); // throw error

            v = configured[Config.#setter].call({ root: config[''], local: configured }, v); // set value
            if (!configured[Config.test](v)) // if test fails
              reject.handle('Value failed test.', 'parent', parent, 'child', child, 'path', path, 'value', v); // throw error

            configured[Config.#value] = v; // set value
            configured[Config.#defined] = true; // set defined
          }
        });
      else if (!has(Config.#setter) || configured[Config.#setter] === true) {
        if (has(Config.#value))
          def(configured, Config.set, {
            value(v) { // define set
              const disabled = configured[Config.isDisabled]; // get isDisabled
              if (disabled) // if isDisabled is true
                reject.handle(`Property is disabled with reason: ${disabled}`, 'parent', parent, 'child', child, 'path', path); // throw error
              else if (!configured[Config.test](v)) // if test fails
                reject.handle('Value failed test.', 'parent', parent, 'child', child, 'path', path, 'value', v); // throw error

              configured[Config.#value] = v; // set value
              configured[Config.#defined] = true; // set defined
            }
          });
        else if (!has(Config.#setter))
          def(configured, Config.set, {
            value() { reject.handle('Property is not settable.', 'parent', parent, 'child', child, 'path', path); } // define set
          });
        else reject.handle('Value must be defined for setter to be true.', 'parent', parent, 'child', child, 'path', path); // throw error
      } else reject.handle('Setter must be a function, boolean, or undefined.', 'parent', parent, 'child', child, 'path', path); // throw error

      if (!has(Config.#deleter) || configured[Config.#deleter] === false)
        def(configured, Config.delete, {
          value() { reject.handle('Property is not deletable.', 'parent', parent, 'child', child, 'path', path); } // define delete
        });
      else if (has(Config.#deleter) && typeof configured[Config.#deleter] === 'function')
        def(configured, Config.delete, {
          value() {
            const disabled = configured[Config.isDisabled]; // get isDisabled
            if (disabled) // if isDisabled is true
              reject.handle(`Property is disabled with reason: ${disabled}`, 'parent', parent, 'child', child, 'path', path); // throw error

            if (configured[Config.#deleter].call({ root: config[''], local: configured }, configured[Config.#value])) // if deleter returns true
              configured[Config.#defined] = false; // set defined
          }
        });
      else if (configured[Config.#deleter] === true) {
        def(configured, Config.delete, {
          value() { // define delete
            const disabled = configured[Config.isDisabled]; // get isDisabled
            if (disabled) // if isDisabled is true
              reject.handle(`Property is disabled with reason: ${disabled}`, 'parent', parent, 'child', child, 'path', path); // throw error

            configured[Config.#defined] = false; // set defined
          }
        });
      } else reject.handle('Deleter must be a function, boolean, or undefined.', 'parent', parent, 'child', child, 'path', path); // throw error

      if (has(Config.#filter) && typeof configured[Config.#filter] === 'function')
        def(configured, Config.test, {
          value(v) {
            return configured[Config.#filter].call({ root: config[''], local: configured }, v);
          } // define test
        });
      else if (has(Config.#filter))
        reject.handle('Filter must be a function or undefined.', 'parent', parent, 'child', child, 'path', path); // throw error
      else
        def(configured, Config.test, {
          value() { return true; } // define test
        });

      if (has(Config.#method) && typeof configured[Config.#method] === 'function')
        def(configured, Config.call, {
          value(...args) {
            const disabled = configured[Config.isDisabled]; // get isDisabled
            if (disabled) // if isDisabled is true
              reject.handle(`Property is disabled with reason: ${disabled}`, 'parent', parent, 'child', child, 'path', path); // throw error

            return configured[Config.#method].call({ root: config[''], local: configured }, ...args); // call method
          }
        });
      else if (has(Config.#method))
        reject.handle('Method must be a function or undefined.', 'parent', parent, 'child', child, 'path', path); // throw error
      else
        def(configured, Config.call, {
          value() { reject.handle('No method defined.', 'parent', parent, 'child', child, 'path', path); } // define call
        });

      if (has(Config.#default) && has(Config.#setter)) {
        let v;
        try {
          v = configured[Config.#setter].call({ root: config[''], local: configured }, configured[Config.#default]); // set default
        } catch (e) {
          reject.handle(`Setter rejected default for reason: ${e}`, 'parent', parent, 'child', child, 'path', path, 'default', configured[Config.#default], 'error', e); // throw error
        } // catch error

        if (!configured[Config.test](v)) // if test fails
          reject.handle('Default failed filter test.', 'parent', parent, 'child', child, 'path', path, 'default', configured[Config.#default]); // throw error

        configured[Config.#default] = v; // set default
      }

      if (has(Config.#value) && has(Config.#setter)) {
        let v;
        try {
          v = configured[Config.#setter].call({ root: config[''], local: configured }, configured[Config.#value]); // set value
        } catch (e) {
          reject.handle(`Setter rejected value for reason: ${e}`, 'parent', parent, 'child', child, 'path', path, 'value', configured[Config.#value], 'error', e); // throw error
        } // catch error

        if (!configured[Config.test](v)) // if test fails
          reject.handle('Value failed filter test.', 'parent', parent, 'child', child, 'path', path, 'value', configured[Config.#value]); // throw error

        configured[Config.#value] = v; // set value
      }

      if (has(Config.#value)) // if value is defined
        configured[Config.#defined] = true; // set defined

      parent[path.last] = configured; // set parent[path.last] to configured
      for (const k in child) // for each key in child
        if (typeof child[k] === 'object' && child[k] !== null) // if key is an object and is not null
          q.push([ configured, child[k], [ ...path, k ] ]); // push configured, child[k], and path to queue
        else reject.handle('Child must be an object (not null).', 'parent', parent, 'child', child, 'path', path, 'key', k); // throw error
    }

    return config['']; // return config
  }
};