import * as esbuild from 'esbuild'

import preactIslandPlugin from '@barelyhuman/preact-island-plugins/esbuild'
import express from 'express'
import path from 'node:path'
import preactRenderToString from 'preact-render-to-string'
import glob from 'tiny-glob'
import plugins from './plugins.js'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import { fileURLToPath } from 'node:url'
import { parse, print } from 'recast'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const islandDirectory = '.prev'
const DYNAMIC_PARAM_START = /\/\+/g
const ENDS_WITH_EXT = /\.(jsx?|tsx?)$/
const plugRegister = []

main()

async function main() {
  cleanup()

  plugins.forEach(e => {
    const plug = {}
    e(plug)
    plug.setup && plug.setup()
    plugRegister.push(plug)
  })

  const [entries] = await builder(islandDirectory)
  const app = express()
  const router = new express.Router()

  const promises = entries
    .map(x => {
      return x.replace(path.resolve(__dirname, 'src'), islandDirectory)
    })
    .reduce((acc, x) => {
      if (isDynamicKey(x, islandDirectory)) {
        acc.push(x)
      } else {
        acc.unshift(x)
      }
      return acc
    }, [])
    .map(async registerKey =>
      registerRoute(router, registerKey, islandDirectory)
    )

  await Promise.all(promises)

  app.use(router)
  app.use('/public', express.static(path.join(islandDirectory, '.client')))

  app.listen(3000, () => {
    console.log('> Listening on 3000')
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

function renderer(comp) {
  const html = preactRenderToString(comp)
  const htmlTree = plugRegister.reduce(
    (acc, x) => {
      return x.render ? x.render(acc) : acc
    },
    {
      head: [],
      body: [html],
    }
  )

  return `
    <!DOCTYPE html>
    <html>
      ${htmlTree.head.join('\n')}
      ${htmlTree.body.join('\n')}
    </html>
  `
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

function isDynamicKey(registerKey, baseDir) {
  const replacementRegex = RegExp(`^${baseDir}\/pages`)
  let routeFor = registerKey
    .replace(replacementRegex, '')
    .replace(ENDS_WITH_EXT, '')
  return DYNAMIC_PARAM_START.test(routeFor)
}

async function registerRoute(router, registerKey, outDir) {
  let mod = await import(path.resolve(registerKey))
  mod = mod.default || mod
  const replacementRegex = RegExp(`^${outDir}\/pages`)
  if (!replacementRegex.test(registerKey)) {
    return
  }
  let routeFor = registerKey
    .replace(replacementRegex, '')
    .replace(ENDS_WITH_EXT, '')

  if (DYNAMIC_PARAM_START.test(routeFor)) {
    routeFor = routeFor.replace(DYNAMIC_PARAM_START, '/:')
  }

  if (/\/index\/?/.test(routeFor)) {
    routeFor = routeFor.replace(/\/index\/?/, '/')
  }

  const routeDef = router.route(routeFor)
  const allowedKeys = ['get', 'post', 'delete']

  allowedKeys.forEach(httpMethod => {
    if (httpMethod === 'get') {
      routeDef.get(async (req, res) => {
        const result = await mod.get(req, res)
        if (!result) {
          return res.end()
        }
        res.setHeader('content-type', 'text/html')
        res.write(renderer(result))
        return res.end()
      })
      return
    }
    if (mod[httpMethod]) {
      routeDef[httpMethod](mod[httpMethod])
    }
  })
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
