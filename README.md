# Manikin Response Unit - installable web edition 1.1

Read **START_HERE.md** for GitHub Pages publishing and iOS/Android installation.

## What this release changes

Adds an installation panel and platform-specific instructions, app manifest and icons, scoped offline caching, optional update application and progress checkpoints when a mobile page is hidden or a written response is being edited.

The Bone Emergency curriculum JSON, original engine and module styles are byte-identical to the supplied MRU 1.0 package: 244 prompts, 118 learning targets and 11 atlas views. The existing three unnamed mystery placeholders remain unchanged. No new module, score server, leaderboard, account, analytics or notification subscription is added.

The game, CSS, JavaScript and SVG drawings are still embedded in `index.html`. Installation and hosted offline access additionally need `manifest.webmanifest`, `sw.js` and `icons/`. A local HTML can still play, but installation requires a supported browser on a secure web origin (or a local development server).

## Runtime files

```
index.html                 Complete game plus installation UI
manifest.webmanifest       Name, launch scope and app icons
sw.js                      Generated offline/update worker
icons/                     PNG app icons + editable source.svg
.nojekyll                  Disable GitHub's default Jekyll processing
```

All URLs are relative to the publishing directory, so both a GitHub Pages project subdirectory and a root website are supported. The app uses `display: standalone`, a stable relative manifest `id`, no forced orientation, Apple touch metadata and a maskable Android icon. The mark is an adaptation of the existing terminal M, not new anatomical artwork.

## Editable source organization

```
app-version.json           Human-readable release number
build.mjs                  Packager, Node built-ins only
src/index.template.html    HTML shell + existing module markup
src/hub/                   Home page, registry, backup controls and styles
src/bone-emergency/         Original lesson data, code and styles
src/pwa/                   Installation UI, offline client and worker template
tests/offline-worker.test.mjs
```

To rebuild after a source or icon/manifest change:

```
node build.mjs
node tests/offline-worker.test.mjs
```

No npm install is needed. Students need no Node or build tools. A matching ready-to-upload build is included.

**Do not hand-edit only `index.html` or only `sw.js` and publish it.** The worker checks hashes of all runtime resources to avoid activating a partly uploaded or mismatched app. Run the build script, then publish the generated HTML, worker, manifest and icons as one release. The build computes a new cache version when any cached asset or worker template changes.

## Offline/update behavior

1. The first online visit registers a worker scoped to this app's directory.
2. The worker fetches the complete current asset set, verifies each file's SHA-256 hash and caches it. It does not activate a mixed or partial deployment.
3. Entry navigation to the directory or `index.html` (including launch query strings) uses the cached complete game. Known manifest/icon resources are also cached. Unrelated pages, external links and non-GET requests are not intercepted as game content.
4. A new release installs into a separate cache. It does not force `skipWaiting` during installation. The Apply Update button saves the case and explicitly requests activation/reload. Otherwise the browser can activate after all old clients close.
5. The activation cleanup deletes only obsolete MRU caches for THIS scope, not other projects or apps on the same origin. Other open MRU tabs are not forcibly reloaded; they can offer Reload App when convenient.
6. OFFLINE READY is displayed only after the worker reports that the complete asset set is present. A connected repair can refill missing cache entries, but only with the matching release.

An offline-ready message is not a guarantee of indefinite storage retention. Devices/browsers may remove site data or caches. External answer-reference links require the internet. Managed-device restrictions can prevent installation or caching.

## Progress

The existing `BE4_` keys and MRU backup schema version 1 remain unchanged. The PWA wrapper uses the host's existing export/pause API to checkpoint drafts without changing scoring or lesson logic. There is no automatic account or cross-device sync.

Storage is browser/origin dependent, and an installed iOS app may not share the same storage as the browser tab. Export before moving from a local HTML to the website or another app/browser/device; import in the destination. Import replaces the destination's module records after confirmation. Existing `BE4_` keys are origin-wide, so multiple copies hosted under one origin should not be treated as isolated student accounts.

Code and answer keys are public when hosted publicly. Keep student progress backups and private data out of the repository. Hosting providers may log ordinary web requests; no custom score/data transmission or analytics was introduced.

## Tests and limits

`tests/offline-worker.test.mjs` executes the GENERATED worker in a deterministic simulated runtime using Node's Request/Response/Web Crypto and mocked CacheStorage/worker lifecycle. It covers 19 checks: first caching, entry aliases, offline asset reads, explicit activation, waiting cache isolation, cleanup isolation, partial deployment rejection and cache repair.

The packaging process also checked that the original lesson data/engine/styles/registry were unchanged, and browser-rendered app layouts plus controls were exercised at 1366x900, 1024x600, 390x844, 320x640 and 844x390. Progress import/resume and an unsubmitted write-in were checked. Browser service-worker registration was mocked for install-UI tests because localhost/file navigation is blocked in this build environment.

No physical iPhone/Android installation, real hosted service-worker lifecycle or GitHub deployment has been verified here. See START_HERE.md for the required real-device smoke test after publishing.

## Reference documentation

- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- https://developer.chrome.com/docs/capabilities/pwa-manifest-id

Artwork/source acknowledgments already present in Bone Emergency are retained in the game. The bundled class source documents themselves are not included in this package.
