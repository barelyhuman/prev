import { serveStatic } from '@hono/node-server/serve-static'
import path from 'node:path'
import process from 'node:process'
import preactRenderToString from 'preact-render-to-string'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import * as esbuild from 'esbuild'
import kl from 'kleur'
import { log } from '../lib/logger.js'

const DYNAMIC_PARAM_START = /\/\+/g
const ENDS_WITH_EXT = /\.(jsx?|tsx?)$/
const PORT = process.env.PORT || 3000

const server = {
  activeInstance: undefined,
  app: undefined,
  port: PORT,

  /**
   * @param {object} options
   * @param {boolean} [options.force=false]
   * Initialize the server singleton, and create the hono
   * app instance if it didn't exist.
   */
  async init({ force = false }) {
    if (this.activeInstance && !force) {
      return
    }

    if (this.activeInstance && force) {
      log.debug('Force Restarting Server')
      await this.close()
    }

    if (!this.app) {
      this.app = new Hono()
    }

    this.activeInstance = serve(
      {
        fetch: this.app.fetch,
        port: this.port,
      },
      info => {
        log.print(`>> Listening on ${kl.cyan(info.port)}`)
      }
    )
  },
  close() {
    const self = this

    return new Promise(resolve => {
      if (!self.activeInstance) {
        log.debug('nothing to shut down')
        resolve()
      }
      self.activeInstance.close(err => {
        if (err) {
          if (err.code === 'ERR_SERVER_NOT_RUNNING') {
            resolve()
            return
          }
          console.error(err)
          throw err
        }
        self.activeInstance = undefined
        self.app = undefined

        resolve()
      })
    })
  },
}

export async function kernel({
  entries,
  isDev,
  liveServerPort,
  plugRegister,
  baseDir,
  clientDirectory,
  sourceDir,
}) {
  const routeRegisterSeq = []

  await server.init({ force: true })

  for (const x of entries) {
    if (!x.startsWith(path.resolve(sourceDir, 'pages'))) continue
    const _x = x.replace(sourceDir, baseDir)
    if (isDynamicKey(_x, baseDir)) routeRegisterSeq.push(_x)
    else routeRegisterSeq.unshift(_x)
  }

  for (const registerKey of routeRegisterSeq) {
    await registerRoute(server.app, registerKey, baseDir, plugRegister, {
      isDev,
      clientDirectory,
      liveServerPort,
    })
  }

  server.app.get(
    '/public/*',
    serveStatic({
      root: path.relative(
        '.',
        path.resolve(path.join(baseDir, clientDirectory))
      ),
      rewriteRequestPath: p => {
        return p.replace('/public/', '/')
      },
    })
  )

  return server
}

async function registerRoute(
  router,
  registerKey,
  outDir,
  plugRegister,
  { clientDirectory, isDev, liveServerPort } = {}
) {
  let mod = await import(path.resolve(registerKey) + `?update=${Date.now()}`)
  mod = mod.default || mod
  const replacementRegex = new RegExp(`^${outDir}\/pages`)
  if (!replacementRegex.test(registerKey)) return

  let routeFor = registerKey
    .replace(replacementRegex, '')
    .replace(ENDS_WITH_EXT, '')

  if (DYNAMIC_PARAM_START.test(routeFor))
    routeFor = routeFor.replace(DYNAMIC_PARAM_START, '/:')

  if (/\/index\/?/.test(routeFor)) {
    routeFor = routeFor.replace(/\/index\/?/, '')
    if (routeFor.length === 0) routeFor = '/'
  }

  const allowedKeys = ['get', 'post', 'delete']

  for (const httpMethod of allowedKeys) {
    if (!mod[httpMethod]) continue

    if (httpMethod !== 'get') {
      router[httpMethod](routeFor, mod[httpMethod])
      continue
    }

    router.get(routeFor, async ctx => {
      const result = await mod.get(ctx)
      if (!result) return

      // Handle normal Hono Responses
      if (result instanceof Response) return result

      // Handle Preact component tree
      ctx.header('content-type', 'text/html')
      return ctx.html(
        await renderer(result, plugRegister, {
          outDir,
          isDev,
          liveServerPort,
          clientDirectory,
        })
      )
    })
  }
}

function isDynamicKey(registerKey, baseDir) {
  const replacementRegex = new RegExp(`^${baseDir}\/pages`)
  let routeFor = registerKey
    .replace(replacementRegex, '')
    .replace(ENDS_WITH_EXT, '')
  return DYNAMIC_PARAM_START.test(routeFor)
}

async function renderer(
  comp,
  plugRegister,
  { isDev, outDir, liveServerPort, clientDirectory } = {}
) {
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

  await esbuild.build({
    stdin: {
      contents: getInjectableLiveSource(liveServerPort),
      loader: 'ts',
      resolveDir: './',
    },
    platform: 'browser',
    outfile: `${path.join(outDir, clientDirectory, 'live-reload.prev.js')}`,
    bundle: true,
    format: 'esm',
  })

  const liveReloadSourceScript = `
    <script src="/public/live-reload.prev.js"></script>
  `

  return `
    <!DOCTYPE html>
    <html>
      ${htmlTree.head.join('\n')}
      ${htmlTree.body.join('\n')}
      ${isDev ? liveReloadSourceScript : ''}
    </html>
  `
}

function getInjectableLiveSource(serverPort) {
  return `
      import { DiffDOM } from 'diff-dom'

      const es = new EventSource('http://localhost:${serverPort}/live')

      es.onopen = () => {
        console.log('Connected to prev')
      }

      es.onmessage = () => {
        fetch(location.href)
          .then(x => x.text())
          .then(d => {
            var parser = new DOMParser()
            const doc = parser.parseFromString(d.trim(), 'text/html')
            const newBody = doc.querySelector('body')
            const newHead = doc.querySelector('head')

            const dd = new DiffDOM()
            const diff = dd.diff(document.body, newBody)
            const diffHead = dd.diff(document.head, newHead)
            dd.apply(document.body, diff)
            dd.apply(document.head, diffHead)
          })
      }
  `
}
