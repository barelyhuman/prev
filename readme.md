# @barelyhuman/prev

This is more a wrapper around my esbuild scripts than a framework.

## Why

I like using preact but often end up messing up the server static file structure and end up spending a lot of time debugging that.

This normalizes it so I don't have to and so I can just start working on the app.

## Clone of Early versions of next?

I did start writing it with that in mind but then realised that it'd be too heavy for most use cases and I'll end up with the same super opionated setup.

The setup still has opinions, just not enough to lock you down into it.

## Usage

I wouldn't recommend using it for production since there's a lot of stuff missing but here's the gist of it.

**Initialize**

- Create a new `prev` project by running the following commands

```sh
; npm init -y
; npm install --save @barelyhuman/prev preact
```

**Folder and Files**

- Now create a `src` folder and create 2 files in there.

```js
// src/app.js
export const App = () => {
  return <h1>Hello World from Prev</h1>;
};
```

```js
// src/routes.js
export const registerRoutes = (router) => {
  return;
};
```

These are your entry files, `app.js` is purely client sided and is the entry used by prev to decide how to render the app.

On the other hand, `routes.js` gets the server router with similar signature to express's router so you can block and prioritise routing for the server.

Example:
I have an `/about` route in the client app but that's changed to `/about-us`, you can do this on client side with your router but it's faster if the server just sends a redirect request instead. In which case your `routes.js` would look like so

```js
export const registerRoutes = (router) => {
  router.get("/about", (req, res) => {
    res.redirect("/about-us");
  });
};
```

At any given point the routes defined in `routes.js` will take priority over the routes defined by your client app.

**Execution**

To run the app you just need to add 2 scripts to your `package.json`

```json
{
  "scripts": {
    "dev": "prev",
    "build": "prev build"
  }
}
```

In both cases the output is put in a `.output` directory, the `dev` mode just runs the server for you and watches for any changes. Unlike other tools the dev and production doesn't have much difference so whatever works in dev should work in production.

There's still bundling and transpilation involved so those issues stay as is but have toned down in the past years so should be easier to fix.

## Licence

[MIT](/LICENSE)
