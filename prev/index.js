import preactIslandPlugins from '@barelyhuman/preact-island-plugins/esbuild'
import esbuild from 'esbuild'
import { existsSync } from 'node:fs'
import path, { resolve } from 'node:path'
import glob from 'tiny-glob'

export const prev = async (
  sourceDir,
  distDir,
  { clientFolder, pagesHandler, serverOptions }
) => {
  await compileDirectory(sourceDir, distDir, {
    clientFolder,
  })
  const routeMap = await readRoutes(resolve(distDir, 'pages'))
  const sortedRoutes = sortRoutes(routeMap)
  const server = await pagesHandler(sortedRoutes)
  server.listen(serverOptions.port, () => {
    console.log('listening')
  })
}

export const registerRoutes = () => {}

const compileDirectory = async (dir, out, { clientFolder }) => {
  if (!existsSync(dir)) {
    return
  }

  const filePaths = await glob('./**/*.{js,ts,jsx,tsx}', {
    filesOnly: true,
    absolute: true,
    cwd: dir,
  })

  for (let fileP of filePaths) {
    await compileFile(fileP, dir, out)
  }

  const islandsPath = resolve(out, '.generated')
  if (existsSync(islandsPath)) {
    await compileIslands('dist/.generated', clientFolder)
  }
}

const compileFile = async (file, inputDir, out) => {
  const outFilePath = path
    .resolve(inputDir, file)
    .replace(path.resolve(inputDir), path.resolve(process.cwd(), out))

  return esbuild.build({
    entryPoints: [file],
    outfile: outFilePath,
    loader: {
      '.js': 'jsx',
    },
    jsx: 'automatic',
    jsxImportSource: 'preact',
    target: 'node14',
    platform: 'node',
    format: 'esm',
    bundle: true,
    external: ['preact', 'prev/options.js'],
    plugins: [
      {
        name: 'prev-externals',
        setup(build) {
          build.onResolve({ filter: /^prev\/\.+/ }, args => {
            return { path: args.path, external: true }
          })
        },
      },
      preactIslandPlugins({
        baseURL: '/public',
        atomic: true,
        hash: true,
        cwd: path.resolve(process.cwd(), out),
      }),
    ],
  })
}

const compileIslands = async (dir, output) => {
  const filePaths = await glob('./**/*.js', {
    filesOnly: true,
    absolute: true,
    cwd: dir,
  })

  for (let file of filePaths) {
    await compileIslandFile(file, dir, output)
  }
}

const compileIslandFile = async (file, inputDir, out) => {
  const outFilePath = path
    .resolve(inputDir, file)
    .replace(path.resolve(inputDir), path.resolve(process.cwd(), out))

  return esbuild.build({
    entryPoints: [file],
    outfile: outFilePath,
    loader: {
      '.js': 'jsx',
    },
    jsx: 'automatic',
    jsxImportSource: 'preact',
    target: ['es2020'],
    platform: 'browser',
    format: 'esm',
    bundle: true,
  })
}

export const readRoutes = async dir => {
  const routes = await glob('./**/*.js', {
    cwd: dir,
    filesOnly: true,
  })

  const routeMap = new Map()

  for (let page of routes) {
    const usableUrl = page
      .replace(/^\+/, '/:')
      .replace(/\/\+/g, '/:')
      .replace(/\.js$/, '')
      .replace(/(index)$/, '')
      .replace(/^$/, '/')
      .replace(/^[^/](\.)*/, x => `/` + x[0])

    const mod = await import(path.resolve(dir, page))
    routeMap.set(usableUrl, mod)
  }

  return routeMap
}

function sortRoutes(routeMap) {
  const sortedEntries = []

  for (let [k, v] of routeMap.entries()) {
    if (String(k).includes('/:')) {
      sortedEntries.push([k, v])
    } else {
      sortedEntries.unshift([k, v])
    }
  }

  return sortedEntries
}
