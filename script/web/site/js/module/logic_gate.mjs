/**
 * @module logic_gate
 * @description Logic gate functions
 */

/**
 * @function
 * @name BUFFER
 * @param {*} v - Any value
 * @returns {*}
 * @description Buffer value (shallow copy)
 */
function BUFFER(v) {
  try {
    if (Array.isArray(v)) return [ ...v ];
    return new v.constructor(v);
  } catch (e) {
    return v === undefined ? undefined : null;
  }
}
Object.defineProperty(window, 'BUFFER', { value: BUFFER });

/**
 * @function
 * @name NOT
 * @param {*} a - Any value
 * @returns {boolean}
 * @description Logical NOT, output opposite of input
 * @example
 * NOT(1) // false
 * NOT(0) // true
 */
function NOT(a) { return !a; }
Object.defineProperty(window, 'NOT', { value: NOT });

/**
 * @function
 * @name AND
 * @param {...*} inputs - Any values
 * @returns {boolean}
 * @description Logical AND, output true if all inputs are true
 * @example
 * AND(1, 1) // true
 * AND(1, 0, 1) // false
 * AND(1, 1, 1) // true
 */
function AND(...inputs) {
  switch (inputs.length) {
    case 0: return false;
    case 1: return !!inputs[0];
    case 2: return inputs[0] && inputs[1];
    default: {
      for (let v of inputs) if (!v) return false;
      return true;
    }
  }
}
Object.defineProperty(window, 'AND', { value: AND });

/**
 * @function
 * @name OR
 * @param {...*} inputs - Any values
 * @returns {boolean}
 * @description Logical OR, output true if any input is true
 * @example
 * OR(1, 1) // true
 * OR(1, 0, 1) // true
 * OR(0, 0, 0) // false
 */
function OR(...inputs) {
  switch (inputs.length) {
    case 0: return false;
    case 1: return !!inputs[0];
    case 2: return inputs[0] || inputs[1];
    default: {
      for (let v of inputs) if (v) return true;
      return false;
    }
  }
}
Object.defineProperty(window, 'OR', { value: OR });

/**
 * @function
 * @name XOR
 * @param {...*} inputs - Any values
 * @returns {boolean}
 * @description Logical XOR, output true if an odd number of inputs are true
 * @example
 * XOR(1, 1) // false
 * XOR(1, 0, 1) // true
 * XOR(0, 0, 0) // false
 */
function XOR(...inputs) {
  switch (inputs.length) {
    case 0: return false;
    case 1: return !!inputs[0];
    case 2: return inputs[0] != inputs[1];
    default: {
      let c = 0;
      for (let v of inputs) if (v) c++;
      return c % 2 === 1;
    }
  }
}
Object.defineProperty(window, 'XOR', { value: XOR });

/**
 * @function
 * @name NAND
 * @param {...*} inputs - Any values
 * @returns {boolean}
 * @description Logical NAND, output false if all inputs are true
 * @example
 * NAND(1, 1) // false
 * NAND(1, 0, 1) // true
 * NAND(1, 1, 1) // false
 */
function NAND(...inputs) {
  switch (inputs.length) {
    case 0: return true;
    case 1: return !inputs[0];
    case 2: return !(inputs[0] && inputs[1]);
    default: {
      for (let v of inputs) if (!v) return true;
      return false;
    }
  }
}
Object.defineProperty(window, 'NAND', { value: NAND });

/**
 * @function
 * @name NOR
 * @param {...*} inputs - Any values
 * @returns {boolean}
 * @description Logical NOR, output false if any input is true
 * @example
 * NOR(1, 1) // false
 * NOR(1, 0, 1) // false
 * NOR(0, 0, 0) // true
 */
function NOR(...inputs) {
  switch (inputs.length) {
    case 0: return true;
    case 1: return !inputs[0];
    case 2: return !(inputs[0] || inputs[1]);
    default: {
      for (let v of inputs) if (v) return false;
      return true;
    }
  }
}
Object.defineProperty(window, 'NOR', { value: NOR });

/**
 * @function
 * @name XNOR
 * @param {...*} inputs - Any values
 * @returns {boolean}
 * @description Logical XNOR, output true if an even number of inputs are true
 * @example
 * XNOR(1, 1) // true
 * XNOR(1, 0, 1) // false
 * XNOR(0, 0, 0) // true
 */
function XNOR(...inputs) {
  switch (inputs.length) {
    case 0: return true;
    case 1: return !inputs[0];
    case 2: return inputs[0] == inputs[1];
    default: {
      let c = 0;
      for (let v of inputs) if (v) c++;
      return c % 2 === 0;
    }
  }
}
Object.defineProperty(window, 'XNOR', { value: XNOR });

export default true;