import glob from 'tiny-glob'
import path from 'node:path'

const routes = {}
const DYNAMIC_PARAM_START = /\/\+/g
const ENDS_WITH_EXT = /\.(jsx?|tsx?)$/

/**
 * @param {object} options
 * @param {string} [options.cwd='']
 * @param {string} [options.outDir = 'dist']
 * */
export async function readRoutesFromDirectory({ cwd, outDir = 'dist' }) {
  const entries = await glob('./**/*.{js,ts,jsx,tsx,mdx}', {
    absolute: true,
    cwd,
  })

  const routeRegisterSeq = []

  for (const _entry of entries) {
    const entry = _entry.replace(cwd, outDir)
    if (isDynamicKey(entry, cwd)) routeRegisterSeq.push(entry)
    else routeRegisterSeq.unshift(entry)
  }

  for (const registerKey of routeRegisterSeq) {
    let mod = await import(path.resolve(registerKey) + `?update=${Date.now()}`)
    mod = mod.default || mod
    const replacementRegex = new RegExp(`^${outDir}`)
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

      console.log({ routeFor })
      defineRoute({
        method: httpMethod,
        url: routeFor,
        handler: mod[httpMethod],
      })
    }
  }
}

function isDynamicKey(registerKey, baseDir) {
  const replacementRegex = new RegExp(`^${baseDir}`)
  let routeFor = registerKey
    .replace(replacementRegex, '')
    .replace(ENDS_WITH_EXT, '')
  return DYNAMIC_PARAM_START.test(routeFor)
}

function _validateOptions(opts) {
  const validKeys = new Set(['method', 'url', 'handler'])
  const fromOpts = Object.keys(opts)

  for (let x of fromOpts) {
    if (!validKeys.has(x)) {
      throw new Error(`Invalid key ${x} in router options`)
    }
  }
}

/**
 * @param {object} options
 * @param {"get"|"post"} options.method
 * @param {string} options.url
 * @param {boolean} [options.dynamic=false]
 * @param {(ctx:any)=>{}} options.handler
 * */
function defineRoute(options) {
  _validateOptions(options)
  const { url, method } = options
  routes[method] = routes[method] ?? {}
  routes[method][url] = { ...options }
}

export function getRoutes() {
  return routes
}
