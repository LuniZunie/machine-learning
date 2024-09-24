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

Array.prototype.last = function() { // last element
  return this[this.length - 1];
};
Array.prototype.Ξ = function() { // random element
  return this[Ξ(this.length) | 0];
};
Array.prototype.weight = function(m = 1) { // convert array to weight array
  const σ = Σ(this); // sum of array
  return this.map(v => v / σ * m); // weight
};
Array.prototype.invertedWeight = function(m = 1) { // convert array to inverted weight array
  const σ = Σ(this); // sum of array
  return this.map(v => (σ - v) / σ * m); // invert weight
};
Array.prototype.fit = function(min = 0, max = 1) { // fit array to range
  const arrMin = Math.min(...this); // minimum
  const arrMax = Math.max(...this); // maximum
  const arrRange = (arrMax - arrMin) || 1; // array range

  return this.map(v => (v - arrMin) / arrRange * (max - min) + min); // fit array
};
Array.prototype.copy = function() { // copy array (shallow)
  return this.slice(); // OPTIMIZE: not sure if this is the best way to copy an array
};

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