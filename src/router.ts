// Example config/method based router

/**
 * Working with file based routes can get hectic aftter
 * a point and seems useless when not dealing with components
 * since prev is also a backend boilerplate, this allows you to
 * be able to define simpler REST API's if needed
 */
export default function (router) {
  router.get('/ping', ctx => {
    return ctx.text('pong')
  })
}
