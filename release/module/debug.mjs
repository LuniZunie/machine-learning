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
      console.debug(...debug);
    }

    throw new Error(`${this.#message}\n\nReason:\n >> ${reason.trim()}\n`);
    return false;
  }
};