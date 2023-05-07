# @barelyhuman/prev

> Opinionated Execution Engine for
> [preact-island-plugins](https://github.com/barelyhuman/preact-island-plugins)

> **Warning**: This is still in alpha development, things might change, avoid
> using it for production

> **Note**: It is not recommended to use this CLI without the
> [barelyhuman/prev](https://github.com/barelyhuman/prev) template, since you'll
> have to configure your structure accordingly anyway. Easier to clone it
> instead.

## Installation

```sh
npm add @barelyhuman/prev
# or
yarn add @barelyhuman/prev
# or
pnpm add @barelyhuman/prev
```

## Usage

The CLI has basically 3 functions,

1. Create a Server based on the Kernel([HonoJS](https://hono.dev))
2. Allow live reloading if the `--dev` flag is passed.

```sh
npx @barelyhuman/prev ./path/to/root-of-project
npx @barelyhuman/prev --dev ./path/to/root-of-project
```

3. Inject Plugins, you can add in simple plugins to improve the DX like adding
   one for goober/twind for css-in-js. Or even postcss to add in something like
   tailwindcss

## Documentation

TBD

## License

[MIT](/license)
