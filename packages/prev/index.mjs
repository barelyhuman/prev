#! /usr/bin/env node

import { build } from "esbuild";
import fs from "node:fs";
import { nodeExternalsPlugin } from "esbuild-node-externals";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const userArgs = process.argv.slice(2);
const entryPoint = userArgs.length > 0 ? userArgs[0] : "./src/app.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const clientOutDir = ".output/client";

await fs.promises.mkdir(clientOutDir, {
  recursive: true,
});

const clientOutput = await build({
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
});

if (clientOutput.errors.length > 0) {
  console.log(clientOutput.errors);
}

const runtimeEntry = {
  server: join(__dirname, "lib/runtime/server.js"),
};
const serverOutput = await build({
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
});

if (serverOutput.errors.length > 0) {
  console.log(serverOutput.errors);
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
