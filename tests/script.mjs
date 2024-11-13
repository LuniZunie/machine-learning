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

import Population from '../release/machine_learning.mjs';
import Config from '../release/module/config.mjs';

const Scene = {
  width: 1000,
  height: 1000,
  pipe: [ 1, Math.min(0.9, Math.max(0.1, Math.random())) ],
  pipeScale: {
    width: 100,
    height: 200,
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
};

const population = new Population({
  population: {
    size: {
      [Config.value]: 100,
    }
  },

  network: {
    dynamic: {
      [Config.value]: true,
    },

    inputs: {
      [Config.value]: 2,
    },

    outputs: {
      [Config.value]: 1,
    },

    reward: {
      function: {
        [Config.value](i, ...outputs) {
          const bird = [ ...Scene.birds.values() ][i];
          bird.save();
          if (outputs[0] > 0.5) bird.flap();
          // else bird.downFlap();
          const reward = 1 - Math.abs(bird.y / Scene.height - Scene.pipe[1]);
          bird.restore();
          return reward;
        }
      }
    },
  },

  mutate: {
    adapt: {
      [Config.value]: false,
    }
  },
});
population.Start();

const paper = document.querySelector('canvas#scene');
paper.width = Scene.width;
paper.height = Scene.height;

const pen = paper.getContext('2d');

pen.textAlign = 'center';
pen.textBaseline = 'middle';

class Bird {
  #i = NaN; // index

  #save;

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
    this.#vy = Math.min(10, this.#vy + this.#ay);

    this.#boundingBox.y1 = this.#y - Scene.bird.height / 2;
    this.#boundingBox.y2 = this.#y + Scene.bird.height / 2;

    pen.fillStyle = 'green';
    pen.fillRect(this.#boundingBox.x1, this.#boundingBox.y1, Scene.bird.width, Scene.bird.height);
  }

  flap() {
    this.#vy = -7;
  }
  downFlap() {
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

  save() {
    this.#save = {
      ay: Number(this.#ay),
      vy: Number(this.#vy),
      y: Number(this.#y),
    };
  }

  restore() {
    if (this.#save) {
      this.#ay = this.#save.ay;
      this.#vy = this.#save.vy;
      this.#y = this.#save.y;

      this.#save = undefined;
    }
  }
}

population.Output(function(i, ...outputs) {
  const bird = [ ...Scene.birds.values() ][i];
  if (outputs[0] > 0.5) bird.flap();
  // else bird.downFlap();

  bird.update();
  if (bird.dead) {
    population.Kill(i);
    bird.kill();
  }
});

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
  pen.fillText(`Population: ${population.alive}`, Scene.width / 2, 100);

  if (Scene.countDown === 0) {
    Scene.birds.clear();
    const size = population.size;
    for (let i = 0; i < size; i++) Scene.birds.add(new Bird(i));

    Scene.countDown = -1;
  } else if (Scene.countDown > 0) Scene.countDown = Math.max(0, Scene.countDown - δ);
  else if (population.alive === 0) {
    population.Evolve();

    Scene.distance = 0;
    Scene.pipe = [ 1, Math.min(0.9, Math.max(0.1, Math.random())) ];

    Scene.countDown = 10;
  }

  if (Scene.countDown === -1)
    population.Input(function(i) {
      const bird = [ ...Scene.birds.values() ][i];
      return [ bird.y / Scene.height - Scene.pipe[1], bird.vy / 10 ];
    });

  pen.fillStyle = 'red';
  pen.fillRect(Scene.holeBoundingBox.x1, 0, Scene.pipeScale.width, Scene.holeBoundingBox.y1);
  pen.fillRect(Scene.holeBoundingBox.x1, Scene.holeBoundingBox.y2, Scene.pipeScale.width, Scene.height - Scene.holeBoundingBox.y2);

  lastFrame = performance.now();

  requestIdleCallback(Update);
}
Update();

addEventListener('keydown', e => {
  if (e.key === 'k') population.KillAll();
});