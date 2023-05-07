## What is `@easy-breezy/core`?
`@easy-breezy/core` is a modular micro-infrastructure primarily for but not limited to code generation.

Supports connection of generation modules and plug-ins.

Provides modules with tools to work with:
- Arguments
- File system
- Information output
- Colors
- Configuration
- I18n

## Installation (Local)
Installation for use locally in your project
```sh
# npm
npm install @easy-breezy/core --save-dev

# yarn
yarn add @easy-breezy/core --dev
```

Add the command to your `packages.json`
```json
{
    "scripts": {
        "generator": "easy-breezy"
    }
}
```

## Installation (Global)
```sh
# npm
npm install @easy-breezy/core -g

# yarn
yarn add @easy-breezy/core -g
```

## CLI Usage
If `@easy-breezy/core` was set globally.
```sh
easy-breezy
# or
easybreezy
```

If `@easy-breezy/core` has been installed locally then use your command.

Example:
```
// packages.json
{
    // ...
    "scrips": {
        "generator": "easy-breezy"
    }
}
```

```sh
# npm
npm run generator

# yarn
yarn generator
```

After starting, just follow the instructions in the `CLI`
