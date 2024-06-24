import {
  Trouter,
  createServeStatic,
  renderToString,
  use,
} from "@barelyhuman/prev/utils";
import { toStatic } from "@barelyhuman/prev/head";
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
      const { metas, links, title, lang } = toStatic();
      const stringified = stringify(title, metas, links);

      const wrappedHTML = html`
        <!doctype html>
        <html ${lang ? `lang="${lang}"` : "en"}>
          <head>
            ${stringified}
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
    }),
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

const stringify = (title, metas, links) => {
  const stringifyTag = (tagName, tags) =>
    tags.reduce((acc, tag) => {
      `${acc}<${tagName}${Object.keys(tag).reduce(
        (properties, key) => `${properties} ${key}="${tag[key]}"`,
        "",
      )}>`;
    }, "");

  return `
    <title>${title}</title>

    ${stringifyTag("meta", metas)}
    ${stringifyTag("link", links)}
  `;
};
