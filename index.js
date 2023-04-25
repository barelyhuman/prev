import preactIslandPlugin from '@barelyhuman/preact-island-plugins/esbuild'
import * as esbuild from 'esbuild'

import { nodeExternalsPlugin } from 'esbuild-node-externals'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import preactRenderToString from 'preact-render-to-string'
import { parse, print } from 'recast'
import glob from 'tiny-glob'
import plugins from './plugins.js'

const require = createRequire(import.meta.url)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const islandDirectory = '.prev'
const plugRegister = []

await main()

async function main() {
  cleanup()

  for (const e of plugins) {
    const plug = {}
    e(plug)
    plug.setup && plug.setup()
    plugRegister.push(plug)
  }

  const [entries] = await builder(islandDirectory)
  const kernel = await import(path.resolve(islandDirectory, './kernel.js'))
  await kernel.default({
    entries,
    plugRegister,
    baseDir: path.resolve(__dirname, islandDirectory),
    sourceDir: path.resolve(__dirname, './src'),
  })
}

async function cleanup() {
  const generatedClientDir = path.join(islandDirectory, '.client')
  const generatedDir = path.join(islandDirectory, '.generated')
  fs.existsSync(generatedClientDir) &&
    (await fsPromises.rm(generatedClientDir, {
      recursive: true,
    }))
  fs.existsSync(generatedDir) &&
    (await fsPromises.rm(generatedDir, {
      recursive: true,
    }))
}

async function builder(baseDir) {
  const entries = await glob('./src/**/*.{js,ts,jsx,tsx}', {
    absolute: true,
  })

  await esbuild.build(getServerConfig(entries, baseDir))

  const generatedEntries = await glob(
    `${baseDir}/.generated/**/*.client-is*.js`,
    {
      absolute: true,
    }
  )

  await esbuild.build(
    getClientConfig(generatedEntries, path.join(baseDir, '.client'))
  )

  return [entries, generatedEntries]
}

function getClientConfig(entries, outDir) {
  return {
    entryPoints: entries,
    outdir: outDir,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    jsxImportSource: 'preact',
    jsx: 'automatic',
    loader: {
      '.js': 'jsx',
    },
    plugins: [
      {
        name: 'injector',
        async setup(build) {
          build.onLoad(
            { filter: /\.island\.client(-\w*)?\.(js|ts)x?$/ },
            async args => {
              const baseCode = fs.readFileSync(args.path, 'utf8')
              const ast = parse(baseCode, {
                parser: require('recast/parsers/babel-ts'),
              })
              const withInjections = plugRegister.reduce((acc, x) => {
                return (x.injectOnClient && x.injectOnClient(acc)) || acc
              }, ast)

              return {
                contents: print(withInjections).code,
                loader: 'jsx',
              }
            }
          )
        },
      },
    ],
  }
}

function getServerConfig(entries, outDir) {
  return {
    entryPoints: entries,
    outdir: outDir,
    jsxImportSource: 'preact',
    jsx: 'automatic',
    loader: {
      '.js': 'jsx',
    },
    format: 'esm',
    platform: 'node',
    target: 'node14',
    bundle: true,
    plugins: [
      nodeExternalsPlugin(),
      preactIslandPlugin({
        baseURL: 'public',
        atomic: true,
        hash: true,
        cwd: path.resolve(fileURLToPath(new URL('.', import.meta.url)), outDir),
      }),
    ],
  }
}
