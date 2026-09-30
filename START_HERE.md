# Install Manikin Response Unit on iPhone, iPad and Android

This package adds installation and offline access to the existing game. Bone Emergency is still the only playable module; the other three files remain unnamed mysteries. No leaderboard or account system was added.

## 1. Publish the package, not the ZIP

The root `index.html` is already built. No programming, npm, paid hosting or Apple/Google developer account is required for this web-installation route.

1. Extract this ZIP on your computer.
2. Open your game repository on GitHub, or create a PUBLIC repository such as `manikin-response-unit` for free GitHub Pages hosting.
3. Use **Add file > Upload files**. Upload these items together into the SAME publishing folder, replacing the old `index.html`:

   - `index.html`
   - `manifest.webmanifest`
   - `sw.js`
   - The entire `icons` folder, with its files still inside it
   - `.nojekyll` (an empty, sometimes hidden file)

   Drag the FOLDER named `icons`, not just the images, so the paths stay correct. Do not upload only the ZIP. Do not put everything one extra folder deeper unless that is your intended site address. The `src`, `tests`, build script and documentation can also be uploaded, but are not needed to play or install.

4. Commit the files. In **Settings > Pages**, choose **Deploy from a branch**, **main**, and **/(root)**, then Save. If your established site publishes from `/docs`, put all the runtime items above together in `/docs` instead and retain that publishing setting.
5. Wait for the deployment to finish and use **Visit site** in Pages settings. The published HTTPS website is different from GitHub's file/code preview. Your project address will normally have the form `https://YOUR-USERNAME.github.io/manikin-response-unit/`.

GitHub Pages supports free hosting from public repositories and provides HTTPS on github.io addresses. Your students only need the live website address, not this ZIP.

**Keep progress private:** Do not upload students' exported progress JSON files, rosters, passwords or private keys to a public repository. This game includes its answer key and is for study, not a secure exam.

## 2. Install on an iPhone or iPad

Open the LIVE game link in **Safari**. Tap **Share > Add to Home Screen**. Turn on **Open as Web App** if that option appears, then tap **Add**. Open MRU from its new home-screen icon while still connected.

The in-game Install App button provides instructions on iOS; Safari does not use Chrome's in-page installation prompt. Device-management rules may restrict installation.

## 3. Install on Android

Open the LIVE link in **Chrome**. Tap the game's **Install App** button when Chrome offers its installation prompt. Otherwise use Chrome's **three-dot menu > Install and create shortcut > Install**. Some versions use **Add to home screen > Install** instead. Follow the confirmation steps.

Use the actual browser, not an embedded preview inside another app. The game can still be used in a regular browser when installation is unavailable.

## 4. Test offline use before giving it to students

Open the installed app once while connected. Wait for **OFFLINE READY** on the home page. Then:

- Turn off Wi-Fi AND mobile data, or enable airplane mode.
- Close and reopen MRU from the home-screen icon.
- Enter Bone Emergency, open the Study Atlas and try a case.
- Type part of a write-in answer, return Home / Modules, and resume the case.
- Reconnect afterward so future updates can be checked.

All current questions, diagrams and game code are cached as one verified release. External reference websites linked from the teacher review section still require a connection. Browsers/operating systems can delete local storage and cached content; export important progress regularly.

## Progress from your older file

Before switching from the downloaded MRU HTML to the live website, use **Export Progress** in the old copy. Use **Import Progress** in the website or installed app to restore that backup. Import replaces the destination's existing Bone Emergency progress after confirmation.

Do not assume a downloaded HTML file, website tab, installed app, different browser and another device share progress. There is no automatic cloud sync. Keep the same live site address for future releases.

## Future updates

For future ready-made releases, replace the runtime files together, including `sw.js`. An existing installation checks for a new release when connected. The game shows **NEW TERMINAL UPDATE READY** outside an active question; choose **Apply Update** when convenient. This saves the current case and reloads the app. Closing all windows of the app can also allow a pending update to become active.

Use **App Info > Check for updates** to check manually. No update intentionally clears the existing `BE4_` progress records.

## If installation or offline access is missing

- Confirm you opened the published HTTPS site, not the repository page, ZIP or local HTML file.
- Confirm `manifest.webmanifest`, `sw.js`, `index.html` and `icons/` are together at the published path.
- Allow the deployment to finish. Then reload the live site, stay connected, and check App Info.
- An "online play / setup incomplete" message means the offline cache has NOT been confirmed. Do not assume offline play is ready yet.
- A partial or mixed upload is deliberately rejected by the offline cache. Upload the complete matching package again rather than mixing old/new files.
- School-managed browsers, private browsing, blocked storage or device restrictions may affect installation/storage. Test on the devices your students use.
- Clearing site data also clears local progress; export before using that as a troubleshooting step.

## Verification status

The original game data, engine, diagrams and mystery-module registry are unchanged. Browser-rendered layouts, navigation, progress backup/import and installation-UI states were tested at desktop, Chromebook and phone sizes. The service-worker caching/update logic passed 19 simulated-runtime checks.

This package has NOT been deployed to your GitHub account or physically installed on an iPhone/Android device here. The test browser environment blocked localhost/file navigation, so offline service-worker logic was tested in a simulated worker runtime rather than a real hosted browser session. Complete the on-device offline checklist above after publication.

## Official instructions checked September 30, 2026

- GitHub Pages publishing: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- GitHub Pages and HTTPS: https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
- Apple installation: https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios
- Android Chrome installation: https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en
- Web app requirements: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
