import kl from 'kleur'

export const log = {
  debug: msg => {
    const action = process.argv.includes('--debug')
      ? () => console.log(msg)
      : () => {}
    action()
  },
  print: msg => {
    process.stdout.write(`${kl.dim('[prev]')} ${msg}\n`)
  },
}
