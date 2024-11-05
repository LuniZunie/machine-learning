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

import RejectionHandler from './debug.mjs';

const labeledIds = new Map();
const ids = new Set();

export default Object.freeze({
  new(label) {
    const reject = new RejectionHandler('Could not generate new ID!');

    let group;
    if (label === undefined) group = ids;
    else if (typeof label === 'string') {
      if (!labeledIds.has(label)) labeledIds.set(label, new Set());
      group = labeledIds.get(label);
    } else reject.handle('Invalid label type!');

    let id = 0;
    do
      id = crypto.getRandomValues(new Uint32Array(1))[0];
    while (group.has(id));
    group.add(id);

    return id;
  },
  has(label, id) {
    const reject = new RejectionHandler('Could not find ID!');

    let group;
    if (label === undefined) group = ids;
    else if (typeof label === 'string') {
      if (!labeledIds.has(label)) reject.handle('Label not found!');
      group = labeledIds.get(label);
    } else reject.handle('Invalid label type!');

    return group.has(id);
  },
  delete(label, id) {
    const reject = new RejectionHandler('Could not delete ID!');

    let group;
    if (label === undefined) group = ids;
    else if (typeof label === 'string') {
      if (!labeledIds.has(label)) reject.handle('Label not found!');
      group = labeledIds.get(label);
    } else reject.handle('Invalid label type!');

    if (!group.has(id)) reject.handle('ID not found!');
    group.delete(id);
  }
});