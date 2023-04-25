import express from 'express'
import path from 'node:path'
import preactRenderToString from 'preact-render-to-string'

const DYNAMIC_PARAM_START = /\/\+/g
const ENDS_WITH_EXT = /\.(jsx?|tsx?)$/
const PORT = process.env.PORT || 3000

export default async function kernel({
  entries,
  plugRegister,
  baseDir,
  sourceDir,
}) {
  const app = express()
  const router = new express.Router()

  const routeRegisterSeq = await entries
    .map(x => {
      return x.replace(sourceDir, baseDir)
    })
    .reduce((acc, x) => {
      if (isDynamicKey(x, baseDir)) {
        acc.push(x)
      } else {
        acc.unshift(x)
      }
      return acc
    }, [])
    .map(registerKey => {
      return () => registerRoute(router, registerKey, baseDir, plugRegister)
    })

  // Serially register the routes
  await routeRegisterSeq.reduce((acc, item) => {
    return acc.then(_ => item())
  }, Promise.resolve())

  app.use(router)
  app.use('/public', express.static(path.join(baseDir, '.client')))

  app.listen(PORT, () => {
    console.log(`> Listening on ${PORT}`)
  })
}

async function registerRoute(router, registerKey, outDir, plugRegister) {
  let mod = await import(path.resolve(registerKey))
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
        res.write(renderer(result, plugRegister))
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

function renderer(comp, plugRegister) {
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
