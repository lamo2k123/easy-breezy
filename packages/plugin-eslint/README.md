The plugin applies eslint to new and modified `@easy-breezy/core` files.

## Installation
You'll first need to install [@easy-breezy/core](https://www.npmjs.com/package/@easy-breezy/core):
```sh
# npm
npm install @easy-breezy/core --save-dev

# yarn
yarn add @easy-breezy/core --dev
```

Next, install `@easy-breezy/plugin-eslint`:
```sh
# npm
npm install @easy-breezy/plugin-eslint --save-dev

# yarn
yarn add @easy-breezy/plugin-eslint --dev
```

## Configuration
ESLint options https://eslint.org/docs/latest/integrate/nodejs-api#parameters

.easy-breezy/config.json
```sh
{
    // ...
    "plugins": {
        // ...
        "eslint": {
            // Path pattern
            "*": {
                // ESLint options https://eslint.org/docs/latest/integrate/nodejs-api#parameters
                "extensions": [
                    ".ts",
                    ".tsx"
                ],
                "fix": true
            }
        }
    },
}
```

After starting, just follow the instructions in the `CLI`
