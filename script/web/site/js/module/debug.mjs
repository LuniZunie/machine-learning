window.debug = true;

export default class RejectionHandler {
  #message;
  #debug;
  constructor(message, ...debug) {
    this.#message = message;
    this.#debug = debug;
  }

  get message() {
    return this.#message;
  }

  get debug() {
    return this.#debug;
  }

  handle(reason, ...debug) {
    debug = debug.concat(this.#debug);
    if (window.debug && debug.length) {
      console.info(reason);
      console.debug(...dump);
    }

    throw new Error(`${this.#message}\n\nReason:\n >> ${reason.trim()}\n`);
  }
};