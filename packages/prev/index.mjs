#! /usr/bin/env node

import { context } from "esbuild";
import { nodeExternalsPlugin } from "esbuild-node-externals";
import fs from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nodemon from "nodemon";

const { entryPoint, build: buildMode } = parseArgs();

const isDev = !buildMode;

const __dirname = dirname(fileURLToPath(import.meta.url));

const clientOutDir = ".output/client";

await fs.promises.mkdir(clientOutDir, {
  recursive: true,
});

const clientOptions = {
  entryPoints: [entryPoint],
  loader: {
    ".js": "jsx",
  },
  outdir: clientOutDir,
  format: "esm",
  jsx: "automatic",
  bundle: true,
  jsxImportSource: "preact",
  platform: "browser",
  plugins: [
    {
      name: "client-inject",
      setup(builder) {
        builder.onLoad(
          {
            filter: new RegExp(entryPoint),
          },
          async (args) => {
            let contents = await fs.promises.readFile(args.path, "utf8");
            contents = `
              import {hydrate} from "preact"; 
              ${contents} 
              
              if (typeof window !== "undefined") { hydrate(<App />, document.getElementById("root"));}
            `;

            return {
              contents,
              loader: "jsx",
            };
          }
        );
      },
    },
  ],
};

const clientContext = await context(clientOptions);

const runtimeEntry = {
  server: join(__dirname, "lib/runtime/server.js"),
};
const serverOptions = {
  entryPoints: [runtimeEntry.server],
  loader: {
    ".js": "jsx",
  },
  absWorkingDir: process.cwd(),
  bundle: true,
  outdir: ".output",
  format: "esm",
  platform: "node",
  target: "node18",
  outExtension: {
    ".js": ".mjs",
  },
  external: ["wouter-preact"],
  plugins: [virtualMods(), nodeExternalsPlugin(), ignoreCSSOnServer()],
  jsx: "automatic",
  jsxImportSource: "preact",
};
const serverContext = await context(serverOptions);

if (isDev) {
  console.log("Watching...");
  clientContext.watch();
  serverContext.watch();

  nodemon({ script: "./.output/server.mjs" })
    .on("start", function () {
      console.log("Starting app watcher");
    })
    .on("crash", function () {
      console.error("script crashed for some reason");
    });
}

const clientOuput = await clientContext.rebuild();
const serverOuput = await serverContext.rebuild();
if (clientOuput.errors.length > 0) {
  clientOuput.errors.map((d) => console.error(d));
}
if (serverOuput.errors.length > 0) {
  serverOuput.errors.map((d) => console.error(d));
}

/**
 * @returns {import("esbuild").Plugin}
 */
function ignoreCSSOnServer() {
  return {
    name: "ignoreCSS",
    setup(builder) {
      builder.onResolve(
        {
          filter: /.*\.css$/,
        },
        (args) => {
          return {
            path: resolve(args.path),
          };
        }
      );
      builder.onLoad(
        {
          filter: /.*\.css$/,
        },
        (args) => {
          return {
            contents: "",
            loader: "js",
          };
        }
      );
    },
  };
}

/**
 * @returns {import("esbuild").Plugin}
 */
function virtualMods() {
  return {
    name: "virutal-mods",
    setup(builder) {
      builder.onResolve(
        {
          filter: /^virtual:.*/,
        },
        (args) => {
          return {
            path: args.path,
            namespace: "virtual-mods",
          };
        }
      );
      builder.onLoad(
        {
          filter: /^virtual:.*/,
          namespace: "virtual-mods",
        },
        async (args) => {
          switch (args.path) {
            case "virtual:app": {
              const currentProcessDir = join(process.cwd(), "./src/app.js");
              return {
                contents: await fs.promises.readFile(currentProcessDir, "utf8"),
                loader: "jsx",
                resolveDir: process.cwd(),
              };
            }
            case "virtual:router": {
              const currentProcessDir = join(process.cwd(), "./src/routes.js");
              return {
                contents: await fs.promises.readFile(currentProcessDir, "utf8"),
                loader: "jsx",
                resolveDir: process.cwd(),
              };
            }
          }
        }
      );
    },
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    entryPoint: "./src/app.js",
    build: false,
  };
  if (args.length == 0) {
    return result;
  }

  if (args.length == 1) {
    if (args[0] === "build") {
      result.build = true;
    }
  }
  return result;
}
