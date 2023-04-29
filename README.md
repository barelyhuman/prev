# prev

> *Pre*act *V*erbose

## Features

- Plugins
  - Twind - Tailwind Support with SSR
  - Hoofd - Hooks for SEO
  - Bring your own!
- File Based API/Page Router backed by [Hono](https://hono.dev)
- Islands for interactivity
- Live Tree Swapping - Similar to HMR(Hot Module Reload), in Dev
- Hackable - This repo is the source code.

## Usage

- Clone this repo
- Delete the `.git` repo and make it your own

```sh
rm -rf .git
git init
```

- Install dependencies.

```sh
yarn
```

- And you're done.

## The What

It stands somewhere in-between a framework and a boilerplate. Everything you
think `prev` is, is a part of the repo at all times.

### Pros

- No lockin
- Easy to hack into the codebase and make mods or even change entire
  functionalities.

### Cons

- Updates are hard (I'm looking for ways to handle this)
- becomes very documentation dependent instead of having a self-explanatory API

Since the cons are something that can be solved by adding prev to a package, I
will also be doing that but to start with, it's a clonable template repo to work
with.

## The Why

It started as a demo to help [fresh](https://fresh.deno.dev) to move from their
multi layer approach mentioned here
[https://deno.com/blog/intro-to-islands](https://deno.com/blog/intro-to-islands)
to being able to convert any file into an island using
[barelyhuman/preact-island-plugins](github.com/barelyhuman/preact-island-plugins).
Considering fresh has moved quite ahead and the change might not be in the best
of their interest.

So then, I just continued adding features into it one by one and now we have
something tiny that I would say can be a minimal MPA/Islands framework.

## Documentation

TODO

## License

[MIT](/LICENSE)
