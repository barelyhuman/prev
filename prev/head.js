import { options } from './options.js'

const oldR = options.render

console.log('registered render hook')
options.render = html => {
  html = oldR ? oldR(html) : html
  html = `
    <html>
      <head>
        <title>Hello from head plugin</title>
      </head>
    </html>
  `
  return html
}

export { useTitle } from 'hoofd/preact'
