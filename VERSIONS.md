<!--
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
 -->

<!--
OLD FORMAT
[<major|minor|patch>]<dev|a|b|rc|rel><major #>.<minor #>.<patch #– <STABLE|UNSTABLE|FATAL>

NEW FORMAT
[<release|minor|rc|beta|dev_major|dev_minor|patch>]<release>.<minor>#<release-candidate>.<beta>.<major-dev>.<major-dev><patch (letter)> – <STABLE|UNSTABLE|FATAL>
-->

# [patch]0.0_0.0.0.0a – STABLE
> *committed as* **Initial commit** *(1)*

> only an overview is provided for this commit

## Overview
- Initial commit
- Created repository

<br>
<br>
<br>

# [dev_major]0.0_0.0.1.0a – FATAL
> *committed as* **Initial commit** *(2)*

> only an overview is provided for this commit

## Overview
- Created module

<br>
<br>
<br>

# [dev_major]0.0_0.0.2.0a – FATAL
> *committed as* **created modules and mach…**

> only an overview is provided for this commit

## Overview
- Created modules
- Created machine learning concept
- Created test for machine learning

<br>
<br>
<br>

# [dev_major]0.0_0.0.3.0a – FATAL
> *committed as* **updated config module, ma…**

> only an overview is provided for this commit

## Overview
- Updated config module
- Major optimizations tested in first version of machine learning
- Created script to draw networks
- Began work on new version of machine learning
- Rewrote configuration for machine learning and gave it it's own file
- Cleaned up files

<br>
<br>
<br>

# [dev_minor]0.0_0.0.3.1a – FATAL
> *committed as* **Created LICENSE**

Added Apache License 2.0 to repository

## New
- Created `LICENSE`
  - Apache License 2.0

<br>
<br>
<br>

# [patch]0.0_0.0.3.1b – FATAL
> *committed as* **Add license headers to files**

Added license headers to all files

## New
- Added license headers to all files
  - From `LICENSE`

<br>
<br>
<br>

# [dev_major]0.0_0.0.4.0a – FATAL
> *committed as* **added readme, added most of n…**

> only an overview is provided for this commit

## Overview
- Added most of neuron logic
- Created `README`
- Created `release\module\proto.mjs`
- Created `release\module\id.mjs`
- Fixed bugs in `release\module\config.mjs`

<br>
<br>
<br>

# [patch]0.0_0.0.4.0b – FATAL
> *committed as* **fixed README by changing to…**

Made `README` a markdown file

## Fixed
- `README` ⟶ `README.md`

<br>
<br>
<br>

# [patch]0.0_0.0.4.0c – FATAL
> *committed as* **added underdevelopment notic…**

Updated `README.md`

## New
- Added underdevelopment notice to `README.md`

<br>
<br>
<br>

# [dev_minor]0.0_0.0.4.1a – FATAL
> *committed as* **cleaned up file system, added ac…**

> only an overview is provided for this commit

## Overview
- Cleaned up file system
- Added activation functions
- `config.neuron.value.function` ⟶ `config.neuron.activation.function`

<br>
<br>
<br>

# [dev_major]0.0_0.0.5.0a – FATAL
> *committed as* **- Reworked entire module**

> only an overview is provided for this commit

Complete rework of the entire module

## Overview
- Much faster and more efficient
- More flexible and easier to use
- More stable and less prone to errors
- More readable and easier to debug
- Less memory consumption

<br>
<br>
<br>

# [dev_minor]0.0_0.0.5.1a – FATAL
> *committed as* **dev2.1.0 – FATALLY UNSTABLE**

Cleaned up code and improved readability and debugging

## New
- Module test
- `Network.#index`
  - Index of the network in the population
- `Population.Output()`
  - Replaces `config.network.output.function`
  - More flexible and easier to use
  - Faster than previous method
- `Population.#Statistics`
  - Track best and worst networks
  - Generation number
  - Graph of each networks score
  - **More to come**
- `release\module\machine_learning_backup.mjs`
  - Backup of old machine learning module

## Changed
- Cleaned up code
  - `RejectionHandler` has been renamed to `Rejection`
  - A `"$"` has been added to the beginning of all variables related to config
  - Broke down complex lines of code into multiple lines
- General changes
  - Better error handling
  - Improved code consistency and readability
- `ID.has(id, label)` ⟶ `ID.has(label, id)`
- `ID.delete(id, label)` ⟶ `ID.delete(label, id)`
- `Network.Deconstruct()` ⟶ `Network.Destruct()`
- `Network.Neuron.get` ⟶ `Network.Neuron.Get`
- `Neuron.Deconstruct()` ⟶ `Neuron.Destruct()`
- `Population.Input()`
  - Now returns `true` instead of the number of alive networks
- `Population.status`
  1. `"stopped"` ⟶ `"off"`
  2. `"idle"` ⟶ `"idle"`
  3. `"running"` ⟶ `"active"`
  - Updated associated errors and comments
- `Synapse.Deconstruct()` ⟶ `Synapse.Destruct()`

## Removed
- `cache` in `machine_learning.mjs`
  - Unnecessary and unused
- `config.network.output.function`
  - Handled by `Population.Output()` instead to allow for more flexibility
- `Population.alive getter`
- `Population.dead getter`
- `Population.#preloaded`
  - Overly complicated and unnecessary
- `Population.size getter`

<br>
<br>
<br>

# [patch]0.0_0.0.5.1b – FATAL
> *committed as* **dev2.1.1 – FATALLY UNSTABLE**

Cleaned up code and minor bug fixes

## Changed
- Cleaned up code
  - Created methods for repeated code
- Module test
  - Removed `network.reward.function` test
- Moved classes into global scope
  - `Population.#NETWORK` ⟶ `NeuralNetwork`
  - `Population.#NETWORK.#NEURON` ⟶ `Neuron`
  - `Population.#NETWORK.#NEURON.#SYNAPSE` ⟶ `Synapse`

## Fixed
- General fixes
  - Multiple syntax errors

<br>
<br>
<br>

# [dev_minor]0.0_0.0.5.2a – FATAL
> *committed as* **dev2.2.0 – UNSTABLE**

Major bug fixes and optimizations

## New
- Module test
  - Now tests evolution

## Changed
- `release\config\population.mjs`
  - `network.dynamic` **temporarily** turned off by default due to major fatal errors
  - `network.layers` now defaults to `[1, 2, 1]`
  - `network.reward.function` now receives outputs as multiple parameters
  -  now receives inputs as multiple parameters

## Fixed
- Config system
  - When parsing an object, the root object is no longer included in the parsed object
  - Multiple syntax errors
- Debugging
  - **Temporary** turned off by default due to large amounts of excess debug information
- General fixes
  - Multiple methods would throw errors due to unexpected (but valid) neuron positions being passed
  - Multiple methods would receive improper scopes, resulting in fatal errors
  - Multiple methods would check if network was alive instead of if `network.dynamic` was enabled
  - Unnecessary `constructor` lookups
  - Multiple fatal spelling errors
- `Network.#Adapt`
  - Update Sets would be looked up by y-value instead of by neuron
  - Usage of `Set.prototype.get` instead of `Set.prototype.has`
  - Proper handling of `undefined` values
- `Network.Destruct`
  - Now destructs synapses properly
- `Network.#GetUpdate`
  - Bug where keys would be looked up as a `string` instead of a `number`
  - Fatal error due to improper `undefined` value handling
- `Network.Input()`
  - Fatal error due to `array` methods being used for on a `set`
  - Update Sets would be looked up by y-value instead of by neuron
- `Network.Reset`
  - Fatal error where synapses would be created before next layer was created
- `Network.#Reward`
  - Scores would be set to `NaN` due to improper handling of `undefined` values
- `Network.Synapse.Connect`
  - Synapse is created with proper parameters
- `Network.Synapse.input.Delete`
  - Synapse would only be deleted when it already didn't exist
- `Network.Synapse.ReceiveConnection`
  - Error handling not properly updated for new parameters
- `Network.Synapse.output`
  - Bug with improper initialization of methods
- `Network.Synapse.output.Delete`
  - Synapse would only be deleted when it already didn't exist
- `Network.updateGroups getter`
  - Input update sets returned when they shouldn't
- `Population.config`
  - Error where config would be loaded asynchronously and not be ready on startup
- `Population.Evolve()`
  - Multiple syntax errors
- `Population.Start()`
  - Multiple syntax errors
- `release\config\population.mjs`
  - Fixed module import paths
  - `network.inputs` now accepts input size of `1`
  - `network.outputs` now accepts output size of `1`
  - `network.layers` now accepts layer size of `1`
  - Error where `network.activation.function` default value would throw error on startup
  - `neuron.bias.range` no longer throws error when getting or calling
  - `synapse.weight.range` no longer throws error when getting or calling
  - Mutation calls converting non-fatal errors into fatal errors
  - Mutations disabled when supposed to be enabled and vice versa
- `Synapse.Destruct`
  - Properly destructs synapse for both input and output neurons

## Removed
- Multiple config system usages
  - **Temporary** removed until optimized

<br>
<br>
<br>

# [patch]0.0_0.0.5.2b – FATAL
> *committed as* **dev2.2.1 – UNSTABLE**

Minor bug fixes for dynamic networks and improved code consistency

## Changed
- Debugging
  - Caught `Rejections` no longer output debug information to console
  - Turned on by default
- `release\config\population.mjs`
  - Dynamic networks turned on by default
  - Default network input size is now `1`

## Fixed
- Code consistency
  - Fixed multiple minor inconsistencies in code
- `Network.Evolve()`
  - Fixed error when in dynamic mode, indexes for layers and neurons could be generated as floats instead of integers
- `Network.#Layer.New()`
  - Fixed error with synapses not being created properly
- `Network.#Layer.Delete()`
  - Fixed error where an incorrect layer would be deleted
- `Network.#Neuron.Delete()`
  - Fixed error where neurons would not fill into deleted neuron gap
- `Network.Reset()`
  - Bug where all new neurons would be added to the input layer

<br>
<br>
<br>

# [beta]0.0_0.1.0.0a – STABLE
> *committed as* **dev2.3.0 – STABLE**

New config system with major optimization and bug fixes

## New
- `release\module\config.mjs`
  - New config system
  - Highly optimized
  - Fixed multiple bugs fixed from old system
  - Fixed major fatal errors from old system

## Changed
- `Population.config`
  - Updated to new config system
- `release\config\population.mjs`
  - Rewrote entire config to work with new config system
  - Mutation chances and amounts updated
  - Expanded range of `Neuron.bias`

## Fixed
- Debugger
  - Bug where debugger would stop working after the first generation

## Removed
- `release\module\config.mjs`
  - Removed old config system
- `Population.statistics`
  - **Temporary** removed due to extremely high computational and memory cost
  - Will be re-added in a later version when optimized

<br>
<br>
<br>

# [patch]0.0_0.1.0.0b – STABLE
> *committed as* **dev2.3.1 – STABLE**

Cleaned up code

## Removed
- `release\machine_learning_backup.mjs`
- `release\machine_learning_old.mjs`

<br>
<br>
<br>

# [patch]0.0_0.1.0.0c – STABLE
> *committed as* **[PATCH]dev2.3.2 – STABLE**

Cleaned up code and optimization

## Changed
- Optimized array copying

## Removed
- completed TODOs
- `tests\draw_network.mjs`
  - No longer works with module

<br>
<br>
<br>

# [dev_minor]0.0_0.1.0.1a – STABLE
> *committed as* **dev2.3.3 – STABLE**

Bug fixes and convenience features

## New
- Flappy bird module test
- `Population.Kill()`
  - Kills the ``NeuralNetwork`` at the specified index
- `Population.KillAll()`
  - Kills all ``NeuralNetworks`` in the population

## Changed
- Commit message format
- `Network.#Adapt()`
  - Based on `reward` derivative instead of `score` derivative
- `Neuron.CalculateUpdateFunction()`
  - `synapse.weight` is now a reference to a number instead of a number
  - `this.bias` is now a reference to a number instead of a number

## Fixed
- `config.network.reward.function`
  - Fixed error when attempting to set `config.network.reward.function`
  - Now receives the proper `index` as first parameter
- `Network.#Reward()`
  - Fixed bug stopping `Network.#Adapt()` from getting called
- `Population.Input()`
  - Now receives the proper `index` as first parameter

## Removed
- Old module test
- Unnecessary `Neuron.CalculateUpdateFunction()` calls

<br>
<br>
<br>

# [dev_minor]0.0_0.1.0.2a – STABLE
> *committed as* **dev2.3.4 – STABLE**

Bug fixes and improved code consistency

## Fixed
- Synapse weight calculation
  - random weight generation is now inclusive-inclusive [min, max] instead of inclusive-exclusive [min, max)
- Neuron bias calculation
  - random bias generation is now inclusive-inclusive [min, max] instead of inclusive-exclusive [min, max)
- `Network.#Adapt()`
  - Fixed bug where `Network.#Adapt()` would not run correctly
  - Fixed error where network not reset properly after adaptation
- `Neuron.bias setter`
  - Fixed error when setting `Neuron.bias`
- `Synapse.weight setter`
  - Fixed error when setting `Synapse.weight`

<br>
<br>
<br>

# [dev_minor]0.0_0.1.0.1a – STABLE

Added version history

## New
- `VERSIONS.md`
  - Version history of the repository

## Fixed
- `release\module\random.mjs`
  - Added legal notice