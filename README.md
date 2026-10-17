# House of Jubal — website

The site for House of Jubal Guitars. Built with [Eleventy](https://www.11ty.dev/) 3, deployed on Netlify, with Netlify Forms handling inquiries. No framework, no build pipeline beyond Eleventy, and one small script.

## Run it

```sh
npm install
npm start        # dev server at http://localhost:8080
npm run build    # outputs to _site/
```

Node 20 or newer.

## Deploy

Connect the repo to Netlify. `netlify.toml` already sets the build command (`npm run build`) and publish folder (`_site`). On the first deploy, Netlify finds the `inquiry` form automatically. Turn on email notifications under **Forms → Form notifications**. Submissions land on `/thanks/`.

## Where things live

```
src/
  _data/            ← edit content here
    site.json         name, email, location, reply time, tagline
    models.json       the three instruments (copy, specs, photos)
    featuredBuild.json  the "Anatomy of a build" section
    woods.json        pickup-cover woods (one is "default": true)
    offers.json       Repair / Personalize / Build / Redeem
    process.json      the five commission steps
    images.json       generated — don't edit by hand (see Images)
  _includes/
    layouts/base.njk  <head>, header, footer
    sections/         one file per home page section
    partials/         nav, footer, inquiry form, string band, grain lines
  index.njk         home page (just a list of sections)
  instruments/model.njk  one page per model → /instruments/<slug>/
  thanks.njk, 404.njk
  assets/css/main.css  all styles; palette tokens at the top
  assets/js/main.js    wood picker + raking light (site works without it)
source-images/      original photos and logos
scripts/build-images.py
```

Adding a fourth model is one more object in `models.json`. It shows up in the hero slices, the lineup, the inquiry dropdown and gets its own page. (The hero grid is three columns. With four models, change `repeat(3, …)` on `.hero__slices` in `main.css`.)

## Images

Photos are pre-sized into WebP at several widths so each device downloads only what it needs. After adding or replacing anything in `source-images/`:

```sh
pip install Pillow          # once
python3 scripts/build-images.py
```

That writes the sizes into `src/assets/img/` and updates `src/_data/images.json`. In templates, use the shortcode with the image's path (no extension):

```njk
{% img "guitars/petros", "Alt text", "(min-width: 900px) 50vw, 100vw" %}
```

Swatch circles (`source-images/swatches/`) are square crops of pure grain cut from the pickup-cover photos. Replace them if the cover photos change.

If you'd rather have Eleventy do the image work at build time, `@11ty/eleventy-img` can replace the script and shortcode.

## Signature touches

- **View Transitions.** Click a guitar (a hero slice or a lineup card) and its photo opens out into the full-width hero of that instrument's page while its name grows into the giant title; the back button reverses it. `src/assets/js/transitions.js` gives the names `guitar-photo` / `guitar-name` to just that one guitar right before the page swaps, so any markup with `data-vt-card="<unique key>"`, `data-vt-photo` and `data-vt-name` can join in. The script remembers which card was clicked and the page's scroll position, and on the way back restores the scroll before choosing where the photo lands, so it returns to the card you came from without a jump. The layout holds the first frame until the HTML is fully parsed (`<link rel="expect" href="#site-footer">`), which keeps every card available for that choice; keep the footer's `id` if you edit it. The races this guards against are commented `RACE` in the script. Put `data-vt-photo` on the photo's frame (the element that also holds its light and shading), not on the `<img>`, or the overlays will pop in when the morph ends. Text that sits over a photo (`data-vt-copy` on the instrument hero, `data-vt-label` on a hero slice) gets its own fade layer for the same reason. Hovering a guitar also starts loading its full-size photo so it's ready before the click. Timing lives in `--vt-duration` / `--vt-ease` in `main.css`. Works in Chrome and Edge 126+ and Safari 18.2+; other browsers just navigate. Under `prefers-reduced-motion` the swap is instant.
- **Close button.** Instrument pages have a floating × (and Esc) to close. When the visitor came from a page on this site it acts as Back, so the browser restores that page from its back/forward cache with scroll intact and no extra history entry. When there's nothing to go back to (a shared link, a new tab), it follows its link to that guitar's card in the lineup. Either way the photo morphs back. The logic is at the top of `transitions.js`.
- **Raking light.** Anything with the `rake` class gets a warm pool of light with a soft vignette. On a mouse or trackpad it eases toward the pointer; on phones it sweeps across as you scroll. At rest it sits up and to the left.
- **Instrument hero framing.** `heroPosition` in `models.json` sets the crop of each instrument's full-width hero photo (CSS `object-position`).
- **Wood picker.** The pickup-cover buttons swap the photo and caption. The swatches in the hero jump down to it with that wood selected.

## Still to fill in

Everything in square brackets in `src/_data/` is a placeholder:

- `site.json`: domain, email, city/state, reply time
- `models.json`: Mathetēs and Petros summaries, stories and specs; Redemption neck and electronics
- `featuredBuild.json`: build number, player, date, quote, story, remaining specs, bench hours
- Pricing is intentionally shown as "on request" everywhere.
