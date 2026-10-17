import { readFileSync } from "node:fs";

const images = JSON.parse(readFileSync("./src/_data/images.json", "utf8"));
const IMG_BASE = "/assets/img/";

const escapeAttr = (value = "") =>
  String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addWatchTarget("src/assets/css/");
  eleventyConfig.addWatchTarget("src/assets/js/");

  // Responsive <img> from the pre-built WebP sizes listed in src/_data/images.json.
  // {% img "guitars/petros", "Alt text", "(min-width: 900px) 50vw, 100vw", "class-name", 'loading="eager"' %}
  eleventyConfig.addShortcode("img", (key, alt = "", sizes = "100vw", className = "", extra = "") => {
    const meta = images[key];
    if (!meta) throw new Error(`img shortcode: no image "${key}" in src/_data/images.json`);
    const src = (w) => `${IMG_BASE}${key}-${w}.webp`;
    const srcset = meta.widths.map((w) => `${src(w)} ${w}w`).join(", ");
    const fallback = meta.widths.find((w) => w >= 800) ?? meta.width;
    const lazy = /loading=/.test(extra) ? "" : ' loading="lazy"';
    const cls = className ? ` class="${escapeAttr(className)}"` : "";
    return `<img src="${src(fallback)}" srcset="${srcset}" sizes="${escapeAttr(sizes)}" width="${meta.width}" height="${meta.height}" alt="${escapeAttr(alt)}"${cls} decoding="async"${lazy}${extra ? " " + extra : ""}>`;
  });

  // Plain URL to one size of an image (used where a template needs just a src).
  eleventyConfig.addFilter("imgUrl", (key, width) => {
    const meta = images[key];
    if (!meta) throw new Error(`imgUrl filter: no image "${key}"`);
    const w = width ? meta.widths.find((x) => x >= width) ?? meta.width : meta.width;
    return `${IMG_BASE}${key}-${w}.webp`;
  });

  eleventyConfig.addFilter("srcset", (key) => {
    const meta = images[key];
    return meta.widths.map((w) => `${IMG_BASE}${key}-${w}.webp ${w}w`).join(", ");
  });

  // First item flagged "default": true (e.g. the wood shown before anyone picks one).
  eleventyConfig.addFilter("defaultItem", (list = []) => list.find((item) => item.default) ?? list[0]);

  eleventyConfig.addFilter("year", () => new Date().getFullYear());

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
