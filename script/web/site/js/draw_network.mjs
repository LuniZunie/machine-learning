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

import './module/utility.mjs';
import './module/logic_gate.mjs';
import './module/math.mjs';
import RejectionHandler from './module/debug.mjs';

import { NeuralNetwork } from './machine_learning.mjs';

export default function(canvas, network, options = {}) {
  const reject = new RejectionHandler('Could not draw network!', canvas, network, options);
  if (!(canvas instanceof HTMLCanvasElement)) return reject.handle('Canvas is not an instance of HTMLCanvasElement!');
  if (!(network instanceof NeuralNetwork)) return reject.handle('Network is not an instance of NeuralNetwork!');
  if (typeof options !== 'object' || options === null) return reject.handle('Options is not an object!');

  const pen = canvas.getContext('2d');
  const { width, height } = canvas;

  const internalOptions = {
    padding: {
      vertical: 5, // percentage relative to canvas height
      horizontal: 5 // percentage relative to canvas width
    },
    gap: {
      vertical: 1, // percentage relative to neuron height
      horizontal: 1 // percentage relative to neuron width
    }
  };

  const sizing = {
    scale: {
      width: 100 - internalOptions.padding.horizontal * 2,
      height: 100 - internalOptions.padding.vertical * 2,
    },
    size: {
      width: width - (width * internalOptions.padding.horizontal / 50),
      height: height - (height * internalOptions.padding.vertical / 50),
    },
    neuron: {
      scale: { width: undefined, height: undefined },
      size: undefined,
    },
    padding: {
      horizontal: width * internalOptions.padding.horizontal / 100,
      vertical: height * internalOptions.padding.vertical / 100,
    },
    gap: {
      size: {
        vertical: undefined,
        horizontal: undefined,
      }
    },
  };

  { // Calculate neuron scale
    const neuronScaleWidth = sizing.scale.width / (network.size * (internalOptions.gap.horizontal * 2 + 1));
    const neuronScaleHeight = sizing.scale.height / (network.height * (internalOptions.gap.vertical * 2 + 1));

    const neuronWidth = neuronScaleWidth / 100 * sizing.size.width;
    const neuronHeight = neuronScaleHeight / 100 * sizing.size.height;

    const size = Math.min(neuronWidth, neuronHeight);
    sizing.neuron.size = size;
    sizing.neuron.scale.width = size / sizing.size.width * 100;
    sizing.neuron.scale.height = size / sizing.size.height * 100;

    sizing.gap.size.horizontal = (sizing.size.width - (network.size * size)) / (network.size * 2 - 2);
    sizing.gap.size.vertical = (sizing.size.height - (network.height * size)) / (network.height * 2 - 2);
  }

  const posMemory = new Map();

  const heights = network.heights;
  for (let x = 0; x < network.size; x++) {
    const drawX = sizing.padding.horizontal + sizing.neuron.size / 2 + x * (sizing.neuron.size + sizing.gap.size.horizontal * 2);

    let offset, top = true;
    const height = heights[x];
    if (height % 2 === 1) {
      offset = 0; // Odd height
      top = false; // So offset is increased after first iteration
    } else offset = sizing.neuron.size / 2 + sizing.gap.size.vertical;

    for (let y = 0; y < height; y++) {
      let relOffset = (top = !top) ? offset : -offset;
      const drawY = sizing.size.height / 2 + relOffset + sizing.padding.vertical;

      posMemory.set(`${x},${y}`, { x: drawX, y: drawY });

      if (top) offset += sizing.neuron.size + sizing.gap.size.vertical * 2;
    }
  }

  pen.textAlign = 'center';
  pen.textBaseline = 'middle';

  pen.strokeStyle = '#333';
  pen.lineWidth = 2;

  const paths = network.Path.list;
  for (const path of paths) {
    const { from: { x: x1, y: y1 }, to: { x: x2, y: y2 } } = path;
    const startPos = posMemory.get(`${x1},${y1}`);
    const endPos = posMemory.get(`${x2},${y2}`);

    pen.beginPath();
    pen.moveTo(startPos.x, startPos.y);
    pen.lineTo(endPos.x, endPos.y);
    pen.stroke();
  }

  let totalUpdates = 0; // EXPERIMENT remove later
  for (let x = 0; x < network.size; x++) {
    const height = heights[x];
    for (let y = 0; y < height; y++) {
      const neuron = network.Neuron.get(x, y);
      const { x: drawX, y: drawY } = posMemory.get(`${x},${y}`);

      totalUpdates += neuron.updates; // EXPERIMENT remove later

      let α = 0.5;
      if (neuron.connectedToOutput && neuron.connectedToInput) {
        pen.strokeStyle = 'white';
        α = 1;
      } else if (neuron.connectedToOutput) pen.strokeStyle = 'red';
      else if (neuron.connectedToInput) pen.strokeStyle = 'green';
      else {
        pen.strokeStyle = '';
        α = 0.25;
      }

      if (x === 0) pen.fillStyle = `rgb(0, ${128 * α}, 0)`;
      else if (x === network.size - 1) pen.fillStyle = `rgb(${128 * α}, 0, 0)`;
      else pen.fillStyle = `rgb(0, 0, ${128 * α})`;

      pen.beginPath();
      pen.arc(drawX, drawY, sizing.neuron.size / 2, 0, Math.PI * 2);
      pen.fill();
      pen.stroke();

      if (options.labeler !== undefined) {
        if (typeof options.labeler === 'function') {
          const label = options.labeler(neuron);
          if (label !== undefined) {
            pen.fillStyle = 'white';
            pen.fillText(label, drawX, drawY);
          }
        } else reject.handle('Labeler is not a function!');
      }
    }
  }

  console.log(totalUpdates); // EXPERIMENT remove later
}