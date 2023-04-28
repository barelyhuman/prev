import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import process from 'node:process'
import path from 'node:path'
import preactRenderToString from 'preact-render-to-string'
import { serveStatic } from '@hono/node-server/serve-static'

const DYNAMIC_PARAM_START = /\/\+/g
const ENDS_WITH_EXT = /\.(jsx?|tsx?)$/
const PORT = process.env.PORT || 3000

export default async function kernel({
  entries,
  isDev,
  liveServerPort,
  plugRegister,
  baseDir,
  sourceDir,
}) {
  const app = new Hono()
  const routeRegisterSeq = []

  for (const x of entries) {
    if (!x.startsWith(path.resolve(sourceDir, 'pages'))) continue
    const _x = x.replace(sourceDir, baseDir)
    if (isDynamicKey(_x, baseDir)) {
      routeRegisterSeq.push(_x)
    } else {
      routeRegisterSeq.unshift(_x)
    }
  }

  for (const registerKey of routeRegisterSeq) {
    await registerRoute(app, registerKey, baseDir, plugRegister, {
      isDev,
      liveServerPort,
    })
  }

  app.get(
    '/public/*',
    serveStatic({
      root: path.relative('.', path.resolve(path.join(baseDir, '.client'))),
      rewriteRequestPath: p => {
        return p.replace('/public/', '/')
      },
    })
  )

  const server = serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    info => {
      console.log(`Listening on http://localhost:${info.port}`)
    }
  )

  return server
}

async function registerRoute(
  router,
  registerKey,
  outDir,
  plugRegister,
  { isDev, liveServerPort } = {}
) {
  let mod = await import(path.resolve(registerKey) + `?update=${Date.now()}`)
  mod = mod.default || mod
  const replacementRegex = new RegExp(`^${outDir}\/pages`)
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
    routeFor = routeFor.replace(/\/index\/?/, '')
    if (routeFor.length === 0) {
      routeFor = '/'
    }
  }

  const allowedKeys = ['get', 'post', 'delete']

  for (const httpMethod of allowedKeys) {
    if (httpMethod === 'get') {
      router.get(routeFor, async ctx => {
        const result = await mod.get(ctx)
        if (!result) {
          return
        }
        ctx.header('content-type', 'text/html')
        return ctx.html(
          renderer(result, plugRegister, { isDev, liveServerPort })
        )
      })
      continue
    }
    if (mod[httpMethod]) {
      router[httpMethod](routeFor, mod[httpMethod])
    }
  }
}

function isDynamicKey(registerKey, baseDir) {
  const replacementRegex = new RegExp(`^${baseDir}\/pages`)
  let routeFor = registerKey
    .replace(replacementRegex, '')
    .replace(ENDS_WITH_EXT, '')
  return DYNAMIC_PARAM_START.test(routeFor)
}

function renderer(comp, plugRegister, { isDev, liveServerPort } = {}) {
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

  const liveReloadSourceScript = `
    <script async type="module">
      import { DiffDOM } from 'https://esm.sh/diff-dom@5.0.4'

      const es = new EventSource('http://localhost:${liveServerPort}/live')

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
    </script>
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
