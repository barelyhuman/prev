import preactIslandPlugin from "@barelyhuman/preact-island-plugins/esbuild";
import { defineConfig, extract, install } from "@twind/core";
import presetTailwind from "@twind/preset-tailwind";
import * as esbuild from "esbuild";
import { nodeExternalsPlugin } from "esbuild-node-externals";
import express from "express";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import preactRenderToString from "preact-render-to-string";
import glob from "tiny-glob";
import { toStatic } from "hoofd/preact";

const config = defineConfig({
  presets: [presetTailwind()],
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const islandDirectory = ".prev";
const DYNAMIC_PARAM_START = /\/\+/g;
const ENDS_WITH_JS = /\.(js|ts)$/;

install(config);
main();

async function main() {
  const entries = await glob("./src/**/*.{js,ts,jsx,tsx}", {
    absolute: true,
  });

  await esbuild.build({
    entryPoints: entries,
    outdir: islandDirectory,
    jsxImportSource: "preact",
    jsx: "automatic",
    loader: {
      ".js": "jsx",
    },
    format: "esm",
    platform: "node",
    target: "node14",
    bundle: true,
    plugins: [
      nodeExternalsPlugin(),
      preactIslandPlugin({
        clientDir: "public",
        atomic: true,
        cwd: path.resolve(
          fileURLToPath(new URL(".", import.meta.url)),
          islandDirectory
        ),
      }),
    ],
  });

  const generatedEntries = await glob(
    `${islandDirectory}/.generated/**/*.client.js`,
    {
      absolute: true,
    }
  );

  await esbuild.build({
    entryPoints: generatedEntries,
    outdir: path.join(islandDirectory, ".client"),
    bundle: true,
    format: "esm",
    platform: "browser",
    jsxImportSource: "preact",
    jsx: "automatic",
    loader: {
      ".js": "jsx",
    },
  });

  const app = express();
  const router = new express.Router();

  const pendingRegisters = [];

  const promises = entries
    .map((x) => {
      return x.replace(path.resolve(__dirname, "src"), islandDirectory);
    })
    .map(async (registerKey) => {
      let mod = await import(path.resolve(registerKey));
      mod = mod.default || mod;
      const replacementRegex = RegExp(`^${islandDirectory}\/pages`);
      if (!replacementRegex.test(registerKey)) {
        return;
      }
      let routeFor = registerKey
        .replace(replacementRegex, "")
        .replace(ENDS_WITH_JS, "");

      if (DYNAMIC_PARAM_START.test(routeFor)) {
        // Dyanmic Parameter
        // register later, to avoid express overlapping static ones with it
        pendingRegisters.push(registerKey);
      }

      if (/\/index\/?/.test(routeFor)) {
        routeFor = routeFor.replace(/\/index\/?/, "/");
      }

      const routeDef = router.route(routeFor);
      const allowedKeys = ["get", "post"];

      allowedKeys.forEach((httpMethod) => {
        if (httpMethod === "get") {
          routeDef.get(async (req, res) => {
            const result = await mod.get(req, res);
            if (!result) {
              return res.end();
            }
            res.setHeader("content-type", "text/html");
            res.write(htmlRenderer(result));
            return res.end();
          });
          return;
        }
        if (mod[httpMethod]) {
          routeDef[httpMethod](mod[httpMethod]);
        }
      });
    });

  await Promise.all(promises);

  //FIXME: Redundant Code
  await Promise.all(
    pendingRegisters.map(async (registerKey) => {
      let mod = await import(path.resolve(registerKey));
      mod = mod.default || mod;
      const replacementRegex = RegExp(`^${islandDirectory}\/pages`);
      let routeFor = registerKey
        .replace(replacementRegex, "")
        .replace(ENDS_WITH_JS, "");

      if (DYNAMIC_PARAM_START.test(routeFor)) {
        routeFor = routeFor.replace(DYNAMIC_PARAM_START, "/:");
      }

      const routeDef = router.route(routeFor);
      const allowedKeys = ["get", "post"];
      allowedKeys.forEach((httpMethod) => {
        if (httpMethod === "get") {
          routeDef.get(async (req, res) => {
            const result = await mod.get(req, res);
            if (!result) {
              return res.end();
            }
            res.setHeader("content-type", "text/html");
            res.write(htmlRenderer(result));
            return res.end();
          });
          return;
        }
        if (mod[httpMethod]) {
          routeDef[httpMethod](mod[httpMethod]);
        }
      });
    })
  );

  app.use(router);
  app.use("/public", express.static(path.join(islandDirectory, ".client")));

  app.listen(3000, () => {
    console.log("we're up on 3000");
  });
}

const stringifyHoofd = (title, metas, links) => {
  const stringifyTag = (tagName, tags) =>
    tags.reduce((acc, tag) => {
      `${acc}<${tagName}${Object.keys(tag).reduce(
        (properties, key) => `${properties} ${key}="${tag[key]}"`,
        ""
      )}>`;
    }, "");

  return `
    <title>${title}</title>

    ${stringifyTag("meta", metas)}
    ${stringifyTag("link", links)}
  `;
};

function htmlRenderer(comp) {
  const { html, css } = extract(preactRenderToString(comp));
  const { metas, links, title, lang } = toStatic();

  return `
    <!DOCTYPE html>
    <html ${lang ? `lang="${lang}"` : ""}>
      <head>
        ${stringifyHoofd(title, metas, links)}
        <style>
          ${css}
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
}
