import preactIslandPlugin from '@barelyhuman/preact-island-plugins/esbuild'
import * as esbuild from 'esbuild'
import http from 'node:http'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, print } from 'recast'
import glob from 'tiny-glob'
import plugins from './plugins.js'
import mdx from '@mdx-js/esbuild'
const require = createRequire(import.meta.url)
import chokidar from 'chokidar'
import process from 'node:process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const islandDirectory = '.prev'
const plugRegister = []
const isDev = process.argv.includes('--dev')
const LIVE_SERVER_PORT = process.env.LIVE_SERVER_PORT || 1234

let servers = new Map()

const log = {
  debug: msg => {
    const action = process.argv.includes('--debug')
      ? () => console.log(msg)
      : () => {}
    action()
  },
}

const buildContext = {
  ctx: undefined,
  get context() {
    return this.ctx
  },
  set context(ctx) {
    this.ctx = ctx
  },
  async build() {
    return Object.entries(this.ctx).reduce(async (acc, [k, v]) => {
      return acc
        .then(() => v)
        .then(x =>
          x.rebuild({
            logLevel: 'info',
          })
        )
    }, Promise.resolve())
  },
}

async function main() {
  log.debug('cleaning up')
  await cleanup()

  log.debug('registering plugins')
  for (const e of plugins) {
    const plug = {}
    e(plug)
    plug.setup && plug.setup()
    plugRegister.push(plug)
  }

  log.debug('building stuff')

  const entries = await getEntries()
  await builder(islandDirectory, entries)
  await buildContext.build()
  await initKernel(entries)
}

async function cleanup() {
  try {
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

    plugRegister.length = 0
  } catch (error) {
    console.error(error)
    throw error
  }
}

async function getEntries() {
  const entries = await glob('./src/**/*.{js,ts,jsx,tsx,mdx}', {
    absolute: true,
  })
  return entries
}

async function builder(baseDir, entries) {
  const ctx = {}

  ctx['01-server'] = esbuild.context(getServerConfig(entries, baseDir))

  ctx['02-client'] = {
    async rebuild(opts) {
      const generatedEntries = await glob(
        `${baseDir}/.generated/**/*.client-is*.js`,
        {
          absolute: true,
        }
      )
      await esbuild.build(
        getClientConfig(generatedEntries, path.join(baseDir, '.client'))
      )
    },
  }

  buildContext.context = ctx
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
      mdx({
        jsxImportSource: 'preact',
      }),
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

const liveReloadServer = {
  liveClients: [],
  async reload() {
    for (const cl of this.liveClients) cl.res.write('data: update\n\n')
  },
  setup() {
    http
      .createServer((req, res) => {
        if (req.url === '/live') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          })
          const clientId = Date.now()
          const newClient = {
            id: clientId,
            res,
          }
          res.write(`data:${new Date().toISOString()}`)
          this.liveClients.push(newClient)

          req.on('close', () => {
            this.liveClients = this.liveClients.filter(x => x.id === clientId)
          })
        }
      })
      .listen(LIVE_SERVER_PORT, () => {
        log.debug('live reload on server: ${LIVE_SERVER_PORT}')
      })
  },
}

async function watcher() {
  log.debug('starting watch')
  chokidar.watch('./src').on('change', async (event, path) => {
    await queueRestart()
  })
  await main()
  liveReloadServer.setup()
}

async function initKernel(entries) {
  const kernel = await import(path.resolve(islandDirectory, 'kernel.js'))

  log.debug('Starting server')
  const server = await kernel.default({
    entries,
    isDev,
    liveServerPort: LIVE_SERVER_PORT,
    plugRegister,
    baseDir: path.resolve(__dirname, islandDirectory),
    sourceDir: path.resolve(__dirname, './src'),
  })
  servers.set(Date.now(), server)
}

async function queueRestart() {
  await Promise.all(
    [...servers].map(([id, server]) => {
      return new Promise(resolve => {
        server.close(err => {
          if (err) {
            if (err.code === 'ERR_SERVER_NOT_RUNNING') {
              servers.delete(id)
              resolve()
              return
            }
            console.error(err)
            throw err
          }
          servers.delete(id)
          resolve()
        })
      })
    })
  )
  await buildContext.build()
  await initKernel(await getEntries())
  await liveReloadServer.reload()
}

isDev ? await watcher() : await main()
