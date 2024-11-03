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

import './math.mjs';
import RejectionHandler from './debug.mjs';

Object.defineProperties(Array.prototype, {
  'first': { get: function() { return this[0]; } },
  'last': { get: function() { return this[this.length - 1]; } },
  'Ξ': { get: function() { return this[Ξ(this.length) | 0]; } },
  'weight': { value: function(m = 1) {
    const σ = Σ(this);
    return this.map(v => v / σ * m);
  } },
  'invertedWeight': { value: function(m = 1) {
    const σ = Σ(this);
    return this.map(v => (σ - v) / σ * m);
  } },
  'fit': { value: function(min = 0, max = 1) {
    const arrMin = Math.min(...this);
    const arrMax = Math.max(...this);
    const arrRange = (arrMax - arrMin) || 1;

    return this.map(v => (v - arrMin) / arrRange * (max - min) + min);
  } },
  'copy': { value: function() { return this.slice(); } } // OPTIMIZE: not sure if this is the best way to copy an array
});

Map.prototype.weight = function(m = 1) { // convert map to weight map
  const σ = Σ(this.values()); // sum of values
  return new Map(Array.from(this, ([k, v]) => [k, v / σ * m])); // weight
};
Map.prototype.invertedWeight = function(m = 1) { // convert map to inverted weight map
  const σ = Σ(this.values()); // sum of values
  return new Map(Array.from(this, ([k, v]) => [k, (σ - v) / σ * m])); // invert weight
};
Map.prototype.Ξweighted = function() { // random weighted element
  return [ ...this.keys() ][Ξweighted([ ...this.values() ])];
};
Map.prototype.ΞinvertedWeighted = function() { // random inverted weighted element
  return [ ...this.keys() ][ΞinvertedWeighted([ ...this.values() ])];
};
Map.prototype.copy = function() { // copy map (shallow)
  return new Map(this);
};

Number.prototype.clamp = function(min, max) { // clamp number
  return Math.min(Math.max(this, min), max);
};

Set.prototype.copy = function() { // copy set (shallow)
  return new Set(this);
}