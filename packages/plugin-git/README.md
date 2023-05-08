The plugin adds new files created by `@easy-breezy/core` to the GIT index.

## Installation
You'll first need to install [@easy-breezy/core](https://www.npmjs.com/package/@easy-breezy/core):
```sh
# npm
npm install @easy-breezy/core --save-dev

# yarn
yarn add @easy-breezy/core --dev
```

Next, install `@easy-breezy/plugin-git`:
```sh
# npm
npm install @easy-breezy/plugin-git --save-dev

# yarn
yarn add @easy-breezy/plugin-git --dev
```

## Configuration
| Name          | Value              | Description                                                                            |
| ------------- |--------------------|----------------------------------------------------------------------------------------|
| `add`       | `manual` or `true` | `true` - Adds automatically <br /> `manual` - Спрашивает подтверждения для добавления  |

.easy-breezy/config.json
```sh
{
    // ...
    "plugins": {
        // ...
        "git": {
            "add": "manual"
        }
    },
}
```

After starting, just follow the instructions in the `CLI`
