import glob from 'tiny-glob'
import path from 'node:path'
import fs from 'node:fs'
import { noop } from './functions'

const DYNAMIC_PARAM_START = /\/\+/g

export async function getRouterModule(sourceDirectory) {
  const routerModulePath = path.resolve(sourceDirectory, './router.js')
  if (!fs.existsSync(routerModulePath)) {
    return noop
  }

  let routerModule = await import(`${routerModulePath}?update${Date.now()}`)
  routerModule = 'default' in routerModule ? routerModule.default : routerModule
  return routerModule
}

export async function scanDirectoryForRoutes(dir) {
  const pages = await glob('./**/*.{tsx,js,ts,jsx}', {
    cwd: dir,
    absolute: true,
  })

  const items = []

  for (let pagePath of pages) {
    let url = pagePath.replace(path.resolve(dir), '')
    let dynamic = false
    if (DYNAMIC_PARAM_START.test(url)) {
      url = url.replace(DYNAMIC_PARAM_START, '/:')
      dynamic = true
    }

    url = url.replace(/\.(js|ts)x?$/, '')

    url = url.replace(/\/index$/, '')

    if (url.length === 0) {
      url = '/'
    }

    const mod = {
      url,
      modulePath: pagePath,
      module: await import(`${pagePath}?update=${Date.now()}`),
    }

    if (dynamic) {
      items.push(mod)
    } else {
      items.unshift(mod)
    }
  }

  return items
}
