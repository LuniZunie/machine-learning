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

import { Config, Population } from '../release/machine_learning.mjs';

const Scene = {
  width: 1000,
  height: 1000,
  pipe: [ 1, Math.min(0.9, Math.max(0.1, Math.random())) ],
  pipeScale: {
    width: 100,
    height: 100,
  },

  holeBoundingBox: {
    x1: undefined,
    x2: undefined,
    y1: undefined,
    y2: undefined,
  },

  bird: {
    width: 50,
    height: 50,
  },
  birds: new Set(),

  distance: 0,
  countDown: 0,

  population: new Population(new Config({
    population: {
      size: 50,
    },
    network: {
      layers: [ 2, 2, 1 ],
    }
  })),
};

Scene.population.start();

const paper = document.querySelector('canvas#scene');
paper.width = Scene.width;
paper.height = Scene.height;

const pen = paper.getContext('2d');

pen.textAlign = 'center';
pen.textBaseline = 'middle';

class Bird {
  #i = NaN; // index

  #ay = 0.5; // acceleration
  #vy = 0; // velocity
  #y = Scene.height / 2; // position

  #x = Scene.width * 0.1;

  #boundingBox = {
    x1: this.#x - Scene.bird.width / 2,
    x2: this.#x + Scene.bird.width / 2,
    y1: this.#y - Scene.bird.height / 2,
    y2: this.#y + Scene.bird.height / 2,
  };

  constructor(i) {
    this.#i = i;

    this.#y = Scene.height / 2;
  }

  get i() {
    return this.#i;
  }

  get y() {
    return this.#y;
  }

  get vy() {
    return this.#vy;
  }

  update() {
    this.#y += this.#vy;

    this.#boundingBox.y1 = this.#y - Scene.bird.height / 2;
    this.#boundingBox.y2 = this.#y + Scene.bird.height / 2;

    pen.fillStyle = 'green';
    pen.fillRect(this.#boundingBox.x1, this.#boundingBox.y1, Scene.bird.width, Scene.bird.height);
  }

  flap() {
    this.#vy -= Math.random() * 5;
  }
  downflap() {
    this.#vy += Math.random() * 5;
  }

  kill() {
    this.#y = -100;
  }

  get dead() {
    return this.#boundingBox.y1 < 0 || this.#boundingBox.y2 > Scene.height || (
      this.#boundingBox.x2 >= Scene.holeBoundingBox.x1 && this.#boundingBox.x1 <= Scene.holeBoundingBox.x2 &&
      (this.#boundingBox.y1 < Scene.holeBoundingBox.y1 || this.#boundingBox.y2 > Scene.holeBoundingBox.y2)
    );
  }
}

let lastFrame = performance.now();
async function Update() {
  const δ = performance.now() - lastFrame;

  if (Scene.countDown === -1) {
    Scene.distance++;

    if (Scene.holeBoundingBox.x1 < 0) Scene.pipe = [ 1, Math.min(0.9, Math.max(0.1, Math.random())) ];
    else Scene.pipe[0] -= δ / 3000;
  }

  Scene.holeBoundingBox.x1 = Scene.pipe[0] * Scene.width - Scene.pipeScale.width / 2;
  Scene.holeBoundingBox.x2 = Scene.pipe[0] * Scene.width + Scene.pipeScale.width / 2;
  Scene.holeBoundingBox.y1 = Scene.pipe[1] * Scene.height - Scene.pipeScale.height / 2;
  Scene.holeBoundingBox.y2 = Scene.pipe[1] * Scene.height + Scene.pipeScale.height / 2;

  pen.fillStyle = '#121212';
  pen.fillRect(0, 0, Scene.width, Scene.height);

  pen.fillStyle = 'white';
  pen.fillText(`Distance: ${Scene.distance}`, Scene.width / 2, 50);
  pen.fillText(`Population: ${Scene.birds.size}`, Scene.width / 2, 100);

  if (Scene.countDown === 0) {

    Scene.birds.clear();
    for (let i = 0; i < Scene.population.size; i++) Scene.birds.add(new Bird(i));

    Scene.countDown = -1;
  } else if (Scene.countDown > 0) Scene.countDown = Math.max(0, Scene.countDown - δ);
  else if (Scene.birds.size === 0) {
    Scene.population.evolve();

    Scene.distance = 0;
    Scene.pipe = [ 1, Math.min(0.9, Math.max(0.1, Math.random())) ];

    Scene.countDown = 10;
  }

  const temp = new Set();
  for (const bird of Scene.birds) {
    const nn = Scene.population.Network.get(bird.i);
    nn.reward = 1;
    nn.input(bird.y / Scene.height - Scene.pipe[1], bird.vy / 10);
    const output = nn.output();
    if (output[0] > 0.5) bird.flap();
    else bird.downflap();

    bird.update();

    if (!bird.dead) temp.add(bird);
  }

  Scene.birds = temp;

  pen.fillStyle = 'red';
  pen.fillRect(Scene.holeBoundingBox.x1, 0, Scene.pipeScale.width, Scene.holeBoundingBox.y1);
  pen.fillRect(Scene.holeBoundingBox.x1, Scene.holeBoundingBox.y2, Scene.pipeScale.width, Scene.height - Scene.holeBoundingBox.y2);

  lastFrame = performance.now();

  requestIdleCallback(Update);
}
Update();

addEventListener('keydown', e => {
  if (e.key === 'k') for (const bird of Scene.birds) bird.kill();
});