# RETRO CD (PWA)

An offline CD-shelf music player. This folder is the complete, ready-to-publish web app:

| File | Purpose |
|---|---|
| `index.html` | App page |
| `styles.css` | All styling |
| `app.js` | CD shelf, drag and insert, player, library, offline storage, search, EN/AR |
| `manifest.json` | PWA configuration (standalone, icons, colors) |
| `service-worker.js` | Caches the app so it opens offline |
| `icons/` | 72 to 512 px icons, a maskable icon and the Apple touch icon |

Music is stored on the phone in IndexedDB, so it survives closing the app and plays with no internet.

## Part A: Publish it from your phone (GitHub Pages, free, HTTPS)

1. Download every file from the chat, including all 10 PNGs in `icons`.
2. Open **github.com** in Chrome. Tap the menu (three dots) and tick **Desktop site**. Create a free account.
3. Tap **+ > New repository**. Name it exactly `YOURUSERNAME.github.io` (your GitHub username, lowercase). Choose **Public**, then **Create repository**.
4. Tap **uploading an existing file**. Select `index.html`, `styles.css`, `app.js`, `manifest.json`, `service-worker.js` and `README.md`, then **Commit changes**.
5. Make the icons folder:
   - **Add file > Create new file**. In the name box type `icons/keep.txt`, type any character in the editor, then **Commit changes**.
   - Open the new `icons` folder, then **Add file > Upload files**. Select all 10 PNG icons and **Commit changes**.
6. **Add file > Create new file**. Name it `.nojekyll`, type a space or any character, **Commit changes**. This makes GitHub serve hidden folders later.
7. Go to **Settings > Pages**. Under Source choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
8. After 1 to 3 minutes open `https://YOURUSERNAME.github.io/`. The app should load.

You can already tap Chrome's menu > **Install app** here and get an installed app with no APK. Steps below make a real APK.

## Part B: Turn it into an Android APK with PWABuilder

1. In Chrome (Desktop site on) open **pwabuilder.com**, paste your URL, tap **Start**. Manifest and Service Worker should show as passing.
2. Tap **Package for stores > Android**. Choose **Other Android** (this gives an APK you can install directly; "Google Play" gives an AAB, which only the Play Store accepts).
3. Set a package ID such as `com.yourname.retrocd`, app name `RETRO CD`, keep version 1, signing key **Create new**, then **Generate** and download the zip.
4. Keep the zip. It contains your signing key and its passwords, which you need for future updates.
5. Open the zip with **Files by Google** and tap **Extract**. Tap the `.apk` file, allow Chrome or Files to install unknown apps when asked, and install. If Play Protect warns, tap **Install anyway**.

### Hide the address bar at the top of the app
Open the extracted `assetlinks.json` (or `assetlinks-*.json`) and copy its text. In your GitHub repo choose **Add file > Create new file**, name it `.well-known/assetlinks.json`, paste the text, **Commit changes**. Wait a few minutes, then fully close and reopen the app.

## Using the app

- **+ Import** adds albums from files on your phone (pick audio files in track order, plus an optional cover image).
- **Save offline** on a demo disc stores it for offline play. **Delete** frees the space.
- **Download from a link:** paste direct `https://` links to audio you may download. The website hosting the file must allow it (CORS), otherwise the browser blocks it. YouTube links are not supported.
- **Sound** turns each interface sound on or off. **ع / EN** switches Arabic and English.
- Automatic scanning of the whole phone is only in the native Capacitor build. A PWA cannot do that, so use Import here.

## Updating

Edit a file on GitHub and commit. When you change app files, raise `VERSION` in `service-worker.js` (for example `retro-cd-v2`) so phones fetch the new version.
