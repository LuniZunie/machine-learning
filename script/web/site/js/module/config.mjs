import RejectionHandler from './debug.mjs';

export default class Config {
  static #Configure(o, classInstance) {
    const reject = new RejectionHandler('Could not configure object!', o);

    if (typeof o === 'object' && o !== null) {
      const configured = {};
      let queue = [ [ configured, o, [ '' ] ] ];
      for ( ; queue.length; ) {
        const [ parent, child, path ] = queue.shift();
        const { obj, children } = Config.#Templatify(child, path, classInstance);

        parent[path[path.length - 1]] = obj;
        queue = queue.concat(children);
      }

      return configured[''];
    } else reject.handle('Invalid object!');
  }

  static #Templatify(o, path, classInstance) {
    const reject = new RejectionHandler(`${path.join(' > ')}: Could not templatify object!`, o, path);

    const k = path[path.length - 1];
    const template = {
      value: { __defined__: false },
      object: { },
      method: { },
    };

    { // value
      template.value.has = (function() { return '__value__' in this; }).bind(template.value);
      template.value.get = (function(o, p, k, ...args) {
        const reject = new RejectionHandler(`${p.join(' > ')} (value [[get]]): Could not get value!`, o, p, k, this, args);

        const v = o.get(reject); // get value with error handling and default handling
        if ('__getter__' in this) return this.__getter__.call({}, v, reject, classInstance, ...args); // apply getter if it exists
        return v;
      }).bind(template.value, template, path, k);
      template.value.set = (function(o, p, k, v, ...args) {
        const reject = new RejectionHandler(`${p.join(' > ')} (value [[set]]): Could not set value!`, o, p, k, v, this, args);

        const raw = v; // FIX not used
        if ('__setter__' in this) v = this.__setter__.call({}, v, reject, classInstance, ...args); // apply setter if it exists
        o.set(v, true, reject, raw); // set value with error handling and requirement handling

        return v;
      }).bind(template.value, template, path, k);
      template.value.delete = (function(o, p, k, ...args) {
        const reject = new RejectionHandler(`${p.join(' > ')} (value [[delete]]): Could not delete value!`, o, p, k, this, args);

        if (!('__deleter__' in this) || this.__deleter__.call({}, reject, classInstance, ...args))
          o.set(undefined, false, reject); // delete value with error handling and requirement handling
        else if (!('__value__' in this)) reject.handle('No value attribute to delete!');
      }).bind(template.value, template, path, k);
      template.value.defined = (function(o, p) {
        const reject = new RejectionHandler(`${p.join(' > ')} (value [[defined]]): Could not check if value is defined!`, o, p);

        if (!('__value__' in this)) reject.handle('No value attribute to check!'); // if value attribute does not exist
        return this.__defined__;
      }).bind(template.value, template, path);
    }
    template.get = (function(reject) {
      if ('__value__' in this.value) { // if value attribute exists
        if (this.value.__defined__) return this.value.value; // return value if defined
        else if ('__default__' in this.value) return this.value.default; // return default if not defined
        else reject.handle('Undefined value with no default for fallback!');
      } else reject.handle('No value attribute to get!');
    }).bind(template);
    template.set = (function(v, defined, reject, raw) {
      if ('__value__' in this.value) { // if value attribute exists
        if (this.require(v, defined)) {
          this.value.__input__ = raw; // set input // FIX not used

          this.value.__value__ = v; // set value
          this.value.__defined__ = defined; // set defined
        } else reject.handle('Value does not meet requirements!');
      } else reject.handle(`No value attribute to ${defined ? 'set' : 'delete'}!`);
    }).bind(template);

    { // object
      template.object.has = (function() { return '__value__' in this; }).bind(template.object);
      template.object.get = (function(o, p, k) {
        const reject = new RejectionHandler(`${p.join(' > ')} (object [[get]]): Could not get object!`, o, p, k, classInstance, args);

        if (!('__value__' in this)) reject.handle('No object attribute to get!');

        const rtn = {};
        const queue = [ [ rtn, k, o ] ];
        function Format(parent, key, child) {
          const obj = {};

          try {
            obj.value = child.value.get(); // get value of child node
          } catch (e) { };

          if ('__value__' in child.object) { // if object attribute exists
            obj.object = {}; // create object attribute
            for (const [ k, v ] of Object.entries(child.object.value)) // iterate over object attribute
              queue.push([ obj.object, k, v ]); // push child node to queue
          }

          parent[key] = obj; // set object attribute
        }

        for ( ; queue.length; ) Format(...queue.shift()); // format object

        return rtn;
      }).bind(template.object, template, path, k);
    }

    { // method
      template.method.has = (function() { return '__value__' in this; }).bind(template.method);
      template.method.call = (function(o, p, k, ...args) {
        const reject = new RejectionHandler(`${p.join(' > ')} (method [[call]]): Could not call method!`, o, p, k, this, args);

        if (!('__value__' in this)) reject.handle('No method attribute to call!');

        let v;
        try {
          v = o.get(reject); // get value with error handling and default handling
        } catch (e) { };

        return this.__value__.call({}, v, reject, classInstance, ...args); // call method
      }).bind(template.method, template, path, k);
    }

    template.require = (function(v, defined = true) {
      if ('__requirement__' in this) return this.__requirement__.call({}, v, defined, classInstance); // apply requirement if it exists
      else return true;
    }).bind(template);
    if ('$require' in o) template.__requirement__ = Config.#FormatRequirement(o.$require, reject); // format requirement if it exists

    template.disabled = (function() {
      const reject = new RejectionHandler('Could not check if object is disabled!');

      if ('__disabled__' in this) { // if disabled attribute exists
        const rtn = this.__disabled__.call({}, classInstance); // get disabled and reason
        if (rtn === true) return { disabled: true, reason: 'No reason provided!' }; // return disabled and reason if disabled and no reason
        else if (rtn === false) return { disabled: false }; // return not disabled if not disabled
        else if (typeof rtn === 'string') return { disabled: true, reason: rtn }; // return disabled and reason if disabled and valid reason
        else reject.handle('Invalid reason for disabling!', rtn); // handle invalid reason for disabling
      }

      return false; // return false if not disabled or no disabled attribute
    }).bind(template);

    const rtn = { obj: template, children: [] };
    for (const [ k, v ] of Object.entries(o)) { // iterate over object
      if (k[0] === '$') // specialty keys
        switch (k) {
          case '$direct': { // __direct__
            if (typeof v === 'string') template.__direct__ = v; // set direct if it is a string
            else reject.handle('Invalid direct (not <string>)!', v);
          } break;

          case '$value': { // value.__value__
            if (template.require(v)) { // if value meets requirements
              template.value.__value__ = v; // set value
              template.value.__defined__ = true; // set defined
            } else reject.handle('Value does not meet requirements!', v, template.require.toString());
          } break;
          case '$default': { // value.__default__
            if (template.require(v)) template.value.__default__ = v; // set default if it meets requirements
            else reject.handle('Default does not meet requirements!', v, template.require.toString());
          } break;

          case '$get':
          case '$set':
          case '$delete': {
            let fnName;
            switch (k) { // allow handling of getter, setter, or deleter
              case '$get': fnName = 'getter'; break;
              case '$set': fnName = 'setter'; break;
              case '$delete': fnName = 'deleter'; break;
            }

            if (typeof v === 'function') template.value[`__${fnName}__`] = v; // set getter, setter, or deleter if it is a function
            else if (v === false)
              template.value[`__${fnName}__`] = function(_, reject) { reject.handle(`No ${fnName} for value!`); }; // set getter, setter, or deleter to throw error if false
            else reject.handle(`Invalid ${fnName} (not <function> or [false])!`, v);
          } break;

          case '$method': { // method.__value__
            if (typeof v === 'function') template.method.__value__ = v; // set method if it is a function
            else reject.handle('Invalid method (not <function>)!', v);
          } break;

          case '$require': break; // handled above
          case '$disabled': { // object.__disabled__
            if (typeof v === 'function') template.__disabled__ = v; // set disabled if it is a function
            else reject.handle('Invalid disabled (not <function>)!', v);
          } break;

          default: reject.handle('Unexpected key after specialty key ("$")!', k);
        }
      else {
        template.object.__value__ ??= {}; // create object attribute if it does not exist
        if (k.match(/[$.?>\s]/)) reject.handle('Invalid key (contains reserved characters ["$", "?", ".", ">"] or whitespace)!', k);
        else if (typeof v === 'object' && v !== null) rtn.children.push([ template.object.__value__, k, v ]); // push child node to queue
        else reject.handle('Invalid value (not <object>)!', v);
      }
    }
  }

  static #FormatRequirement(req, reject) {
    switch (typeof req) {
      case 'function': return req;
      case 'string': req = [ req ]; break;
    }

    if (Array.isArray(req)) {
      let comparison = new Set();
      const add = (...eqs) => eqs.forEach(eq => comparison.add(`(${eq})`));

      for (const cond of req) {
        switch (cond) {
          case 'bigint':
          case 'boolean':
          case 'function':
          case 'number':
          case 'object':
          case 'string':
          case 'symbol':
          case 'undefined': add(`type === '${cond}'`); break;

          case 'array': add('Array.isArray(value)'); break;
          case 'falsy': add('!value'); break;
          case 'finite': add('Number.isFinite(value)'); break;
          case 'integer': add('Number.isInteger(value)'); break;
          case 'NaN': add('Number.isNaN(value)'); break;
          case 'null': add('value === null'); break;
          case 'nullish': add('value === null', 'value === undefined'); break;
          case 'Object': add('type === "object" && value !== null'); break;
          case 'primitive': add('value !== Object(value)'); break;
          case 'truthy': add('!!value'); break;

          default: reject.handle('Unexpected requirement!', req, cond);
        }
      }

      return new Function('value', 'defined', `
        if (!defined) return true;
        const type = typeof value;
        return ${[ ...comparison ].join(' || ')};
      `);
    } else reject.handle('Invalid requirement format (not <function>, <string>, or <array>)!', req);
  }

  #config = undefined;
  constructor(o) {
    this.#config = Config.#Configure(o, this);

    const config = this;
    return function(strs, ...args) {
      if (Array.isArray(strs)) { // if tagged template literal
        const reject = new RejectionHandler('Could not execute command!', strs, args);

        const actionLine = [];
        let combine = '';
        for (let i = 0; i < args.length + 1; i++) { // iterate over strings and arguments
          const str = combine + strs.raw[i]; // combine string with previous string if textify operator was present
          const actions = str.split(/\s+/); // split string into actions

          if (actions[actions.length - 1].endsWith('>') && i < args.length) { // if textify operator is present
            actions[actions.length - 1] = actions[actions.length - 1].slice(0, -1); // remove textify operator
            combine = actions.join(' ') + `${args[i]}`; // combine actions with argument
            continue;
          }

          actionLine.push( // push actions to action line
            ...actions
              .filter(a => a) // filter out empty strings
              .map(function(a) { // map actions to functions
                if (a.includes('>')) reject.handle('Illegal use of textify operator (">")', strs, args);
                else return { type: 'text', value: a }; // return text action
              })
          );
          if (i < args.length) actionLine.push({ type: 'value', value: args[i] }); // push argument to action line if not last
        }

        function RecursiveFind(o, cmd) {
          function validate(obj) {
            const disabled = obj.disabled(); // check if object is disabled
            if (disabled.disabled) reject.handle(`Object is disabled! (${disabled.reason})`); // handle disabled object

            return obj;
          }

          let first = true;
          do {
            if (first) first = false;
            else o = o.object.value[o.__direct__]; // get next (directed) object if not first iteration

            switch (cmd) {
              case 'value?': if ('has' in o.value) return validate(o).value.has;
              case 'object?': if ('has' in o.object) return validate(o).object.has;
              case 'method?': if ('has' in o.method) return validate(o).method.has;

              case 'get': if ('get' in o.value) return validate(o).value.get; break;
              case 'has': if ('defined' in o.value) return validate(o).value.defined; break;
              case 'set': if ('set' in o.value) return validate(o).value.set; break;
              case 'delete': if ('delete' in o.value) return validate(o).value.delete; break;

              case 'parse': if ('get' in o.object) return validate(o).object.get; break;
              // case 'root': break;

              case 'run': if ('call' in o.method) return validate(o).method.call; break;

              default: reject.handle('Unexpected command!', cmd);
            }
          } while ('__direct__' in o);

          reject.handle('Could not direct to path valid for command!', actionLine);
        }

        let i = -1;
        function get(type = '*', advance = true) { // get next action
          if ((++i) < actionLine.length) { // if not end of line
            if (type === '*' || actionLine[i].type === type) { // if type matches
              if (advance) return actionLine[i].value; // if advancing; return value
              else return actionLine[i--].value; // if not advancing; return value and decrement index
            } else if (advance)
              reject.handle(`Invalid type (${actionLine[i].type}) at index (${i}); expected type (${type})`, actionLine, i); // if advancing; reject invalid type
            else
              reject.handle(`Invalid type (${actionLine[i].type}) at index (${i}); expected type (${type})`, actionLine, i--); // if not advancing; reject invalid type and decrement index
          } else reject.handle('Unexpected end of line', actionLine);
        }

        function Evaluate() {
          if (i < actionLine.length - 2) reject.handle('Expected command and object; found end of line!', actionLine);

          const cmd = get('text');
          const actionSet = {
            cmd,
            obj: (function(action) {
              if (action === '$') return config.#config; // if root
              else if (action.endsWith('?')) // safe mode
                return action
                  .slice(0, -1) // remove safe mode operator
                  .split('.') // split path into keys
                  .reduce((o, k) => o.object?.value?.[k], config.#config); // get object by path if it exists
              else try {
                return action
                  .split('.') // split path into keys
                  .reduce((o, k) => o.object.value[k], config.#config); // get object by path
              } catch (e) { reject.handle('Invalid path!', action); } // handle invalid path
            })(get('text')),
            fn: RecursiveFind(obj, cmd), // get function by command with direct handling
            extras: (function(extras) {
              switch (cmd) {
                case 'set': {
                  const action = get('text');
                  if (action === 'to') {
                    if (i === actionLine.length - 1) reject.handle('Unexpected end of line after "to"!', actionLine);
                    else extras.push(get());
                  } else reject.handle(`Expected "to" after "set"; found "${action}"!`, actionLine);
                } // fallthrough

                default: return extras;
              }
            })([]),
            options: (function(o) {
              while (i < actionLine.length - 1) {
                switch (get('text', false)) {
                  case '@': {
                    if (++i === actionLine.length - 1) reject.handle('Unexpected end of line after "@"!', actionLine);
                    else {
                      const time = get();
                      if (time instanceof Date) o.time = Date.now() - time.getTime();
                      else o.time = +time;
                    }
                  } break;
                  /* case 'every': {
                    if (cmd !== 'run') reject.handle('Unexpected option "every"!', actionLine);
                    else if (++i === actionLine.length - 1) reject.handle('Unexpected end of line after "every"!', actionLine);
                    else o.every = +get();
                  } break; */
                  case 'with': {
                    let action;
                    if (cmd !== 'run' && cmd !== 'get' && cmd !== 'delete') reject.handle('Unexpected option "with"!', actionLine);
                    else do {
                      if (++i === actionLine.length - 1) reject.handle('Unexpected end of line after "with"!', actionLine);
                      else o.parameters.push(get());

                      try {
                        if (i < actionLine.length - 1) action = get('text', false);
                      } catch (e) { break; }
                    } while (action === ',');
                  } break;

                  case 'then': {
                    if (i < actionLine.length - 1) o.then = true;
                    else reject.handle('Unexpected end of line after "then"!', actionLine);
                  } return o;

                  default: reject.handle('Unexpected option!', actionLine);
                }
              }
            })({ then: false, parameters: [] }),
          };

          const opt = k => actionSet.options[k]; // shorthand for options
          const params = actionSet.extras.concat(opt('parameters')); // get parameters

          if (opt('time') === undefined) { // if instant
            if (opt('then')) {
              actionSet.fn(...params); // if instant and not end of chain
              return Evaluate();
            } else return actionSet.fn(...params); // if instant and end of chain
          } else return new Promise(res => setTimeout(() => {
            if (opt('then')) {
              actionSet.fn(...params); // if delayed and not end of chain
              res(Evaluate());
            } else res(actionSet.fn(...params)); // if delayed and end of chain
          }, opt('time')));
        }

        return Evaluate();
      } else if (typeof strs === 'object' && strs !== null) { // use config as template for passed object
        const reject = new RejectionHandler('Could not execute config handler!', strs, args);

        const queue = [ [ config.#config, strs ] ];
        function Recurse(parent, o) {
          for (const [ k, v ] of Object.entries(o)) {
            if (k.startsWith('$')) {
              switch (k) {
                case '$value': {
                  try {
                    parent.value.set(v);
                  } catch (e) { reject.handle(`Could not set value! (${e})`, v, e); }
                } break;
                default: reject.handle('Unexpected key after specialty key ("$")!', k);
              }
            } else if (typeof v === 'object' && v !== null) {
              const obj = parent.object.value;
              if (k in obj) queue.push([ obj[k], v ]);
              else reject.handle('Invalid path!', k);
            } else reject.handle('Invalid value (not <object>) or specialty key!', v, k);
          }
        }

        for ( ; queue.length; ) Recurse(...queue.shift());
      } else new RejectionHandler('Could not execute config handler!', strs, args).handle('Invalid input!');
    }
  }
};

/*
  Shell Commands:

  <text>:
    type "text"

  <value>:
    type "value"

  <segment>:
    type "text" | type "value"

  <command_set>:
    <inner_command>* <command>

  <command>:
    <base> <options>?

  <inner_command>:
    <command> then

  <options>:
    @ <value> |
    every <segment>

  <base>:
    (value?|object?|method?|has|parse) <path> |
    (set) <path> to <segment> |
    (get|delete|run) <path> (with <segment>(,<segment>)*)?
*/