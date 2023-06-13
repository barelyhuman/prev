import polka from 'polka'
import renderToString from 'preact-render-to-string'
import serve from 'serve-static'
import { options } from '../options.js'

export function polkaPagesHandler(config) {
  return async routes => {
    const app = polka()

    app.use('/public', serve(config.clientFolder))

    for (let [route, handlers] of routes) {
      console.log(`registered ${route}`)

      app.all(route, async (req, res) => {
        console.log({ m: req.method })
        if (req.method.toLowerCase() === 'get' && 'get' in handlers) {
          const result = await handlers.get({
            req,
            res,
          })
          if (typeof result == 'object') {
            // result is a preact component
            if ('__k' in result) {
              res.writeHead(200, {
                'content-type': 'text/html',
              })
              const _html = renderToString(result)
              console.log('called render hook')
              console.log({ x: options.render })
              const html = options.render && options.render(_html)
              return res.end(html)
            }

            res.writeHead(200, {
              'content-type': 'application/json',
            })
            return res.end(JSON.stringify(result))
          }
        }

        return res.end()
      })
    }

    return app
  }
}
