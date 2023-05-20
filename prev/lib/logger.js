export const log = {
  debug: msg => {
    const action = process.argv.includes('--debug')
      ? () => console.log(msg)
      : () => {}
    action()
  },
}
