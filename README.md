# UNDERDEVELOPMENT
!! THIS MODULE IS STILL UNDERDEVELOPMENT !!

# General Use Reinforcement Learning

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

An easy to use, highly customizable module designed for a wide range of tasks requiring a reinforcement learning model.
## Features

- Dynamic and fixed neural network sizes
- Customizable mutations
- Customizable reward function
- Easy-to-use configuration
- Multiple network reproduction types
- Multiple evolutions algorithms
- Highly optimized
## Documentation

[Documentation](https://github.com/LuniZunie/machine-learning/wiki)
## Usage


```javascript
import NeuralPopulation from 'machine-learning.mjs';

const config = { // see config documentation
    // NOTE: all values here are already default and don't need to be added in usage

    population: { $size: 100, $equality: 10 },
    network: {
        $dynamic: true,

        $input: 2,
        $outputs: 1,

        layers: { mutate: {
            add: { $chance: 10 },
            remove: { $chance: 10 }
        } }
    },
    neuron: {
        value: {
            $function(sum, bias) {
                return 1 / (1 + Math.exp(-sum - bias));
            }
        },

        bias: { range: { $min: -1, $max: 1 } },
        mutate: {
            add: { $chance: 10 },
            change: { $chance: 10, $by: 0.1 },
            remove: { $chance: 10 }
        }
    },
    synapse: {
        weight: { range: { $min: -1, $max: 1 } },
        mutate: {
            add: { $chance: 10 },
            change: { $chance: 10, $by: 0.1 },
            remove: { $chance: 10 }
        }
    }
};

// create population using above configuration
const Population = new NeuralPopulation(config);

// create networks in population
Population.Start();

// arbitrary functions
function GetInputs(index) { /* ... */ }
function GetReward(index) { /* ... */ }
function GetDead(index) { /* ... */ }

// indices of each network WILL ALWAYS STAY THE SAME
for (const index of Population.alive) { // stops when all networks are dead
    const inputs = GetInputs(index);

    // in this case <inputs> must be array of length: 2
    Population.Input(index, ...inputs);

    // in this case <outputs> will be array of length: 1
    const outputs = Population.Output(index);

    /*
        do whatever with outputs
    */

    // check if should kill network
    const isDead = GetDead(index);
    if (isDead) Population.Kill(index); // remove network from Population.alive (until evolve)
    else {
        // reward the network based on user-defined reward
        const reward = GetReward(index);
        Population.Reward(index, reward);
    }
}

// next generation of networks
Population.Evolve();
```
## Feedback

If you have any feedback, please reach out to me on [Twitter](https://x.com/CedricHotopp)!
## Authors

- [@LuniZunie](https://www.github.com/LuniZunie)
