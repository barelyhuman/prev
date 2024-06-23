import {
  Trouter,
  createServeStatic,
  renderToString,
  use,
} from "@barelyhuman/prev/utils";
import http from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { App } from "virtual:app";
import { registerRoutes } from "virtual:router";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serve = createServeStatic(join(__dirname, "client"), {});

const router = new Trouter();

await registerRoutes(router);

const html = String.raw;

http
  .createServer(
    use(serve, routerMiddleware(), async (req, res, next) => {
      const wrappedHTML = html`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>Document</title>
          </head>
          <body>
            <div id="root">
              <!--ssr-app-->
            </div>
            <script type="module" src="/app.js"></script>
          </body>
        </html>
      `;
      const appHTML = await renderToString(<App url={req.url} />);
      const finalHTML = wrappedHTML.replace("<!--ssr-app-->", appHTML);
      res.statusCode = 200;
      res.setHeader("content-type", "text/html");
      res.end(finalHTML);
      return;
    })
  )
  .listen(3000, () => {
    console.log("listening on :3000");
  });

function routerMiddleware() {
  return async (req, res, next) => {
    let obj = router.find(req.method.toUpperCase(), req.url);
    if (obj.handlers.length > 0) {
      for (let fn of obj.handlers) {
        req.params = obj.params;
        fn(req, res);
        return;
      }
    }
    await next();
  };
}
