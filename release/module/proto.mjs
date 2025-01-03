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
import Rejection from './debug.mjs';

Object.defineProperties(Array.prototype, {
  'first': { get: function() { return this[0]; } },
  'last': { get: function() { return this[this.length - 1]; } },
  'Ξ': { get: function() { return this[Ξ.ℤ.ie(0, this.length)]; } },
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
  'copy': { value: function() { return [ ...this ]; } },
});

Object.defineProperties(Map.prototype, {
  weight: { value: function(m = 1) {
    const σ = Σ(this.values());
    return new Map(Array.from(this, ([k, v]) => [k, v / σ * m]));
  } },
  inverseWeight: { value: function(m = 1) {
    const σ = Σ(this.values());
    return new Map(Array.from(this, ([k, v]) => [k, (σ - v) / σ * m]));
  } },
  Ξweighted: { value: function() {
    return [ ...this.keys() ][Ξ.weighted([ ...this.values() ])];
  } },
  ΞinverseWeighted: { value: function() {
    return [ ...this.keys() ][Ξ.inverseWeighted([ ...this.values() ])];
  } },
  copy: { value: function() { return new Map(this); } },
  last: { get: function() { return this.get([ ...this.keys() ].last); } }
});

Number.prototype.clamp = function(min, max) { // clamp number
  return Math.min(Math.max(this, min), max);
};

Set.prototype.copy = function() { // copy set (shallow)
  return new Set(this);
}