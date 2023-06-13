#!/usr/bin/env node
import mri from 'mri'
import { prev } from './index.js'
import { polkaPagesHandler } from './servers/polka.js'

const flags = mri(process.argv.slice(2))

const config = {
  src: flags.src || 'src',
  out: flags.out || 'dist',
  port: flags.port || '3000',
  clientFolder: flags.clientFolder || 'dist/.client',
  isDev: flags.dev,
}

await prev(config.src, config.out, {
  serverOptions: {
    port: config.port,
  },
  clientFolder: config.clientFolder,
  pagesHandler: polkaPagesHandler(config),
})

if (config.isDev) {
  // TODO: add watcher
}
