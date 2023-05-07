## What is `@easy-breezy/generator-api`?
`@easy-breezy/generator-api` - This is the API adapter generation module using `@reduxjs/toolkit`. For the `@easy-breezy/core` microframework.

The module generates adapter code using the OpenAPI 2 and OpenAPI 3 specifications.

The module generates schemas, typescript types, and `createApi` code for endpoints.

## Installation
You'll first need to install [@easy-breezy/core](https://www.npmjs.com/package/@easy-breezy/core):
```sh
# npm
npm install @easy-breezy/core --save-dev

# yarn
yarn add @easy-breezy/core --dev
```

Next, install `@easy-breezy/generator-api`:
```sh
# npm
npm install @easy-breezy/generator-api --save-dev

# yarn
yarn add @easy-breezy/generator-api --dev
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

## An example of the result of the generator.
The following file structure will be created
```
your-folder/
├─ your-api-endpoints/
├─ index.ts
├─ extension.ts // File for more detailed customization and expansion @reduxjs/toolkit `createApi`
```
