import express from 'express'
import path from 'node:path'
import preactRenderToString from 'preact-render-to-string'

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
  const app = express()
  const router = new express.Router()

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
    await registerRoute(router, registerKey, baseDir, plugRegister, {
      isDev,
      liveServerPort,
    })
  }

  app.use(router)
  app.use('/public', express.static(path.join(baseDir, '.client')))

  const server = app.listen(PORT, () => {
    console.log(`> Listening on ${PORT}`)
  })

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
    routeFor = routeFor.replace(/\/index\/?/, '/')
  }

  const routeDef = router.route(routeFor)
  const allowedKeys = ['get', 'post', 'delete']

  for (const httpMethod of allowedKeys) {
    if (httpMethod === 'get') {
      routeDef.get(async (req, res) => {
        const result = await mod.get(req, res)
        if (!result) {
          return res.end()
        }
        res.setHeader('content-type', 'text/html')
        res.write(renderer(result, plugRegister, { isDev, liveServerPort }))
        return res.end()
      })
      continue
    }
    if (mod[httpMethod]) {
      routeDef[httpMethod](mod[httpMethod])
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
    <script>
      const es = new EventSource('http://localhost:${liveServerPort}/live')
      
      
      es.onopen = () => {
        console.log('Connected to prev')
      }

      es.onmessage = () => {
        fetch(location.href)
          .then((x => x.text()))
          .then(d => {
            var div = document.createElement('div')
            document.body.innerHTML = d.trim()
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
