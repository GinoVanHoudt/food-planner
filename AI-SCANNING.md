# AI scanning: research notes

Research from 2026-10-28, nothing implemented yet. Question: can we do these for free?

- Take a photo of an ingredient and let AI turn it into an inventory item, filling in every field it
  can (name, amounts, expiry date, meal, store section, home location).
- Let AI read a recipe from photos or a URL and extract the ingredient list and instructions.

## Conclusion

Both can be built for €0. Two things stand in the way, and neither is about money: the free Gemini
tier's terms for users in the EEA, Switzerland and the UK, and the fact that the app has no backend
on the Spark plan.

**Recommendation:** Firebase AI Logic with Gemini Flash-Lite is by far the least work and fits the
current stack (no backend, no exposed key). If we live in the EEA/UK/Switzerland, either pay a few
cents a month on Blaze with a spending cap, or use the Cloudflare Worker route to stay at €0 within
the terms.

## Option 1 (best fit): Firebase AI Logic + Gemini Developer API free tier

The `firebase/ai` client SDK calls Gemini straight from the PWA. We stay on the Spark plan (the free
tier needs a project without Cloud Billing), write no backend code, and the API key stays on
Firebase's side. From **2 Nov 2026** App Check enforcement is required for Firebase AI Logic; the
reCAPTCHA providers work on Spark.

- **Ingredient photo → inventory item:** send the photo plus a JSON schema (`responseSchema`) and get
  back `name`, amount and unit, `expires` if a date is printed, `meal`, and a `sectionId` /
  `locationId` picked from our own lists (pass them in the prompt). Tiny or stamped dates will
  sometimes be missed, so show the result as an editable draft before saving.
- **Recipe from photos:** same approach with the recipe shape (name, servings,
  ingredients[{name, quantity, unit}], instructions, tags).
- **Recipe from a URL:** the `urlContext` tool (in the web SDK: `tools: [{ urlContext: {} }]`) lets
  Gemini fetch the page itself, so no CORS proxy is needed. HTML, PDFs and images, up to 20 URLs per
  request; paywalled or login pages don't work. It can't be combined with function calling in the
  same request.
- **Daily limits:** Google no longer publishes free-tier numbers (see the AI Studio rate-limit page
  for the project). Third-party measurements: about 20 requests a day for the newest Flash, about 500
  a day for Flash-Lite. Limits are per project, so shared by both of us. Flash-Lite is plenty for
  two people, but Google has already cut these quotas twice (Dec 2025, Apr 2026: Pro removed from
  the free tier).
- **Models** (per the Firebase docs at the time): `gemini-3.8-flash`, `gemini-3.5-flash-lite`,
  `gemini-3.1-flash-lite`, `gemini-4-argon`; Gemini 2.5 is deprecated and limited to projects that
  used it before.

### Catches

1. **Europe:** the Gemini API terms (effective 2026-03-23) say _"You may use only Paid Services when
   making API Clients available to users in the European Economic Area, Switzerland, or the United
   Kingdom."_ The free tier still works technically there, but breaks the terms.
2. **Outside those regions:** Google may use free-tier inputs for training and human review. For
   food photos that probably doesn't matter.
3. **Almost-free option:** switch to Blaze (needs a card) and set the Gemini API spending cap.
   Flash-Lite costs $0.30 per million input tokens and $2.50 per million output tokens: roughly
   €0.001 per photo scan and about €0.01 per recipe URL, so cents per month. Flash is $0.75 / $3.75
   until the end of 2026, doubling from 2027-01-01.

## Option 2 (fully free, fine in Europe): Cloudflare Worker + Workers AI

- The free Workers plan includes 10,000 neurons a day of Workers AI (resets 00:00 UTC). Vision
  models include `@cf/meta/llama-3.2-11b-vision-instruct`, `@cf/google/gemma-3-12b-it` and
  `@cf/mistralai/mistral-small-3.1-24b-instruct`. Estimated 30–70 neurons per scan, so 100+ scans a
  day.
- The same Worker can fetch recipe URLs, which gets around CORS.
- **Downsides:** it's backend code outside Firebase (the project has none today) and a second thing
  to deploy. It must verify the Firebase ID token itself. The smaller open models read packaging
  less reliably than Gemini.

## Free helpers that don't need AI

- **Recipe URLs:** most big recipe sites embed schema.org `Recipe` JSON-LD (Google's rich results
  depend on it), giving ingredients, steps and servings without AI. The `recipeIngredient` lines can
  go through our `parseIngredientLine` / `parseIngredientList` (`lib/units.ts`,
  `recipes/input.ts`). The browser still needs a proxy to fetch the page (CORS).
- **Packaged groceries:** scan the barcode and look it up in Open Food Facts
  (`https://world.openfoodfacts.org/api/v2/product/{barcode}`; free, docs say CORS is supported,
  100 read requests a minute). Gives product name, quantity ("500 g") and categories, but no expiry
  date and no fresh produce. Barcode scanning in the browser: `BarcodeDetector` on Android Chrome;
  iOS Safari doesn't have it, so use a WASM library such as ZXing there.

## Not viable yet

- **Chrome's built-in on-device AI (Prompt API, Gemini Nano, image input):** desktop only, not
  Android or iOS.
- **A small vision model in the browser (Transformers.js + WebGPU):** free, but the model is hundreds
  of MB, slow on phones, and weak at this kind of extraction.

## Platform notes

- Taking photos with `<input type="file" accept="image/*" capture="environment">` works on iOS and
  Android. Shrink photos to about 1024px before sending them to save tokens.
- Sharing a recipe link from the browser into the app (Web Share Target in the manifest) works for
  the installed PWA on Android only; WebKit has no support (bug 194593, open since 2019). On iOS we'd
  paste the URL.

## Sources

- [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Free-tier limits measured (DEV Community)](https://dev.to/romeroyang/geminis-free-tier-measured-20-requests-a-day-and-google-no-longer-publishes-the-number-4gf2)
- [ScriptByAI free tier limits](https://www.scriptbyai.com/gemini-api-free-tier-limits/)
- [Firebase AI Logic pricing](https://firebase.google.com/docs/ai-logic/pricing)
- [Firebase AI Logic URL context](https://firebase.google.com/docs/ai-logic/url-context)
- [Firebase AI Logic security checklist](https://firebase.google.com/docs/ai-logic/security-checklist)
- [App Check reCAPTCHA Enterprise provider](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
- [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Open Food Facts API v2](https://openfoodfacts.github.io/openfoodfacts-documentation/docs/Product-Opener/v2)
- [Google Recipe structured data](https://developers.google.com/search/docs/appearance/structured-data/recipe)
- [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api)
- [Prompt API intent to ship](https://groups.google.com/a/chromium.org/g/blink-dev/c/iR6R7-nQeHI)
- [caniuse BarcodeDetector](https://caniuse.com/mdn-api_barcodedetector_detect)
- [WebKit Web Share Target bug](https://bugs.webkit.org/show_bug.cgi?id=194593)
- [iOS PWA compatibility](https://firt.dev/notes/pwa-ios/)
