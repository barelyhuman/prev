import kl from 'kleur'

const prefix = kl.dim('[prev]')

export const log = {
  debug: msg => {
    const action = process.argv.includes('--debug')
      ? () => console.log(msg)
      : () => {}
    action()
  },
  print: msg => {
    process.stdout.write(`${prefix} ${msg}\n`)
  },
  warn: msg => {
    console.warn(`${prefix} ${kl.yellow(msg)}`)
  },
}
