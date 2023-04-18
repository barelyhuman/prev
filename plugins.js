import presetTailwind from "@twind/preset-tailwind";
import { defineConfig, extract, install } from "@twind/core";
import { toStatic } from "hoofd/preact";

function twindPlugin(plug) {
  plug.setup = () => {
    const config = defineConfig({
      presets: [presetTailwind()],
    });
    install(config);
  };

  plug.render = (componentTree) => {
    const { html, css } = extract(componentTree.body.join("\n"));
    return {
      head: [
        `<style>
          ${css}
        </style>`,
      ],
      body: [html],
    };
  };
}

function hoofdPlugin(plug) {
  plug.render = (componentTree) => {
    const { metas, links, title } = toStatic();
    componentTree.head.push(stringifyHoofd(title, metas, links));
    return componentTree;
  };
}

const stringifyHoofd = (title, metas, links) => {
  const stringifyTag = (tagName, tags) =>
    tags.reduce((acc, tag) => {
      `${acc}<${tagName}${Object.keys(tag).reduce(
        (properties, key) => `${properties} ${key}="${tag[key]}"`,
        ""
      )}>`;
    }, "");

  return `
    <title>${title}</title>
    ${stringifyTag("meta", metas)} 
    ${stringifyTag("link", links)}
  `;
};

export default [twindPlugin, hoofdPlugin];
