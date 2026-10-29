![#](https://raw.githubusercontent.com/4site-interactive-studios/engrid/master/hero.jpg)

# 4Site's ENgrid Page Template Framework for Saint Anthony's Guild

Client theme for Saint Anthony's Guild (SAG) pages on Engaging Networks (EN). It is built on [ENgrid](https://github.com/4site-interactive-studios/engrid), 4Site's page template framework, which this repo pulls in as two npm packages:

- [`@4site/engrid-scripts`](https://www.npmjs.com/package/@4site/engrid-scripts): the ENgrid TypeScript
- [`@4site/engrid-styles`](https://www.npmjs.com/package/@4site/engrid-styles): the ENgrid SCSS

The repo only holds what is specific to SAG: the theme options, the client script, and the client SCSS. Everything else comes from those packages, so don't copy ENgrid code into this repo.

## Getting started

You need [Node.js](https://nodejs.org/en/download/).

```bash
npm install
npm run build
```

| Script | What it does |
| --- | --- |
| `npm start` | Rebuilds `dist/engrid.js` and `dist/engrid.css` on every file change |
| `npm run build` | Builds all four files in `dist/` (runs `production` and `minify`) |
| `npm run production` | Builds `dist/engrid.js` and `dist/engrid.css` |
| `npm run minify` | Builds `dist/engrid.min.js` and `dist/engrid.min.css` |
| `npm run update` | Updates `@4site/engrid-scripts` and `@4site/engrid-styles` to the latest version |
| `npm run rebuild` | `update`, then `build` |

`package.json` lists both ENgrid packages as `*`, so a fresh install picks up the latest release. The committed `package-lock.json` is what keeps builds reproducible. Only run `npm run update` when you plan to test the new ENgrid version.

## Project structure

```
src/
├── index.ts                        ENgrid options for SAG; calls customScript on load
├── scripts/main.js                 customScript(App): SAG-only behavior (e.g. the CVV "What's this?" tooltip)
├── sass/
│   ├── main.scss                   Import order (see below)
│   ├── page-template-variables.scss  CSS custom properties for the sag theme and its subthemes
│   ├── page-template-fonts.scss    @font-face rules
│   └── page-template-styles.scss   SAG styles and overrides
└── img/                            Images used by the SCSS
dist/                               Build output (committed)
```

### Options and client script

ENgrid features are turned on and configured in the `options` object in [src/index.ts](src/index.ts). Before writing custom code, check whether ENgrid already has an option for it. For example, the SAG field placeholders live in `options.Placeholders`, not in a script. The full list of options is in the `Options` interface in `@4site/engrid-scripts`.

Code that has no ENgrid option goes in `customScript` in [src/scripts/main.js](src/scripts/main.js). ENgrid calls it through `onLoad` once the page is ready.

Add `?debug=true` to a page URL to turn on ENgrid's debug mode.

### RememberMe copy

[src/scripts/remember-me.ts](src/scripts/remember-me.ts) is a copy of ENgrid's `RememberMe` component (from `@4site/engrid-scripts` v0.28.5), started from `onLoad` in [src/index.ts](src/index.ts). It was copied into this project instead of changed in ENgrid because many clients use this component and we are close to the end-of-year code freeze, so a change to core is not an option right now. Once ENgrid core has an equivalent option, delete the copy and go back to the core component.

The copy exists so that data saved on one subdomain (e.g. `give.stanthonysguild.org`) is available on the others (e.g. `join.stanthonysguild.org`). Core RememberMe writes a host-only cookie, which other subdomains can't read. Every change from the original is marked with `SAG:` in the file:

- **Cookie saved on the site's domain.** The site's domain is the last 2 parts of the host (`join.stanthonysguild.org` becomes `stanthonysguild.org`), or the last 3 when the host has more than 3 parts. The cookie is saved there (`.stanthonysguild.org`) instead of on the current subdomain, so every subdomain reads the same data.
- **Core is skipped.** `RememberMe: true` in `src/index.ts` (instead of the options object) keeps ENgrid's other integrations seeing RememberMe as enabled, while `App` doesn't start the core component. The default tooltip text is also overridden through `window.EngridI18n`, because the default quotes a clear link that has no name on a first visit.

### Styles

The order of the imports in [src/sass/main.scss](src/sass/main.scss) matters and differs from the engrid-template:

1. `@4site/engrid-styles`
2. `page-template-variables`
3. `page-template-fonts`
4. `page-template-styles`

`page-template-variables.scss` holds CSS custom properties scoped to `[data-engrid-theme="sag"]`, not SCSS `$variables`. ENgrid declares its defaults on `[data-engrid-theme]` with the same specificity, so the SAG values must come after ENgrid to win.

Use the current ENgrid variable names (e.g. `--h1_font-family`, `--color_white`). The old `--theme-*` names are no longer read by ENgrid and have no effect.

### Theme, subthemes and layouts

EN applies the theme through attributes on the `<body>` of each EN page template:

```html
<body data-engrid-theme="sag" data-engrid-subtheme="sag" data-engrid-layout="centerright1col">
```

The theme is always `sag`. The SCSS defines these subthemes, one per brand: `sag`, `tfc`, `fcn`, `frf`, `hnp`, `tbm`, `stj`, `fmu`, `fbl`, `ukr`, `frtv`.

## Deploying

EN page templates load the theme from files uploaded to EN, not from this repo.

1. Run `npm run build` and commit `dist/`.
2. Upload `dist/engrid.min.js` and `dist/engrid.min.css` to EN, replacing the previous files.
3. If the EN page template adds a cache-buster to those URLs (e.g. `engrid.min.css?v=2`), change it so browsers fetch the new files.

### Testing a branch before deploying

The [S3 sync workflow](.github/workflows/s3-sync.yml) publishes `dist/` to S3 under `engrid-sag/<branch>` on every push and pull request. Add `?assets=<branch_name>` to an EN page URL to load that branch's `engrid.js` and `engrid.css` instead of the files on EN. The swap is done by the ENgrid loader inside `engrid.min.js`, so it only works on pages whose template already loads the new build, not on legacy templates (see below).

The workflow needs these settings in the GitHub repository (Settings → Secrets and variables → Actions). Without them it fails:

- Variable: `ENGRID_S3_BUCKET_NAME`
- Secrets: `ENGRID_S3_ACCESS_KEY`, `ENGRID_S3_SECRET_KEY`

### Legacy templates

Some EN page templates still load `engrid-sag.css` and `engrid-sag.js`, built from the old ENgrid (0.2.x) that used to live in this repo. This code no longer produces those files. Leave them on EN until every template has moved to `engrid.min.css` and `engrid.min.js`.

## Working on ENgrid itself

To test a change to ENgrid against this theme, clone the [engrid](https://github.com/4site-interactive-studios/engrid) repo next to this one and switch the commented imports at the top of [src/index.ts](src/index.ts) and [src/sass/main.scss](src/sass/main.scss) to the local `packages/scripts` and `packages/styles`. Switch them back before committing.

## Resources

- [ENgrid GitHub repository](https://github.com/4site-interactive-studios/engrid)
- [ENgrid documentation](https://docs.google.com/document/d/1Vhiudjm9pcDIgxirsiS7VWhqgqU_a6taVu2VTMOPbHI/edit)
- [Engaging Networks Supportal](https://engagingnetworks.support/)
- [Engaging Networks Academy](https://engagingnetworks.academy/)

# Interested in a project or have questions?

We would love to hear from you.

Bryan Casler  
Director of Digital Strategy  
4Site Interactive Studios  
Cell: (315) 877-3420  
Email: bryan@4sitestudios.com
