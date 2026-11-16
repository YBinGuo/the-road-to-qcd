# The Road to QCD

[Play online](https://ybinguo.github.io/the-road-to-qcd/)

This public preview includes the game and all 11 atlas milestones. The atlas starts with an empty card catalog while the educational material is under review.

Serve `dist/` over HTTP. For local development, use `python3 -m http.server --directory dist` and open http://localhost:8000/. Run the rules and catalog checks with `node --test`.

## Knowledge atlas

Add cards in `dist/catalog.mjs`. Choose a stable `id`, a numeric `stage`, a `type` from the exported type map, an `order` within that type, `status` of `draft` or `published`, and an ISO date in `updated`. Supply `copy.en` and `copy["zh-CN"]` with `title`, `description`, optional `kind`, and `notes` (term and definition pairs). Both translations share `equations` (trusted MathML) and `sources` (citation label, URL, and localized section labels). Cards inherit stage availability from the saved maximum tile. A published card immediately appears for players with that stage unlocked after they load the updated site.

## Physics demonstrations

Add a stage-number entry to the `demos` map in `dist/demos.mjs`. Each entry has a `title` for its launch button and a lazy `load` callback returning an ES module. Export `mount(host, { signal, stage })` from the module. It receives the dedicated DOM container and can return `{ pause, resume, dispose }` or a promise that resolves to those controls. Supply both `pause` and `resume` to enable the pause button. Stop listeners, timers, or requests when the abort signal fires or in `dispose`. The game saves before opening the demo, and ignores board controls while the dialog is open. Demo modules do not need to read or write the board save.


## Authors

- Yibin Guo (project author)
- [OpenAI Codex](https://github.com/codex) (AI-assisted development)

## References and license

The site footer cites the review that inspired the atlas sequence. The rules are inspired by [Gabriele Cirulli’s 2048](https://github.com/gabrielecirulli/2048), which has its own [MIT license](https://github.com/gabrielecirulli/2048/blob/master/LICENSE.txt). This implementation uses native browser APIs and has no third-party code dependencies or bundled 2048 code.

The Road to QCD is licensed under the [MIT License](LICENSE).
