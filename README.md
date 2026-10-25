# Our Story (marriage-evidence)

Mobile app that helps couples organize photo evidence of a genuine marriage for a USCIS I-130 petition.
This is an organization tool, not legal advice.

## What works now

1. **Upload**: multi-select photos from the camera roll. Each is copied into app-private storage.
2. **Date**: read from EXIF (`DateTimeOriginal`) automatically; editable; blank if unknown.
3. **Caption flow**: for each photo the couple answers "What was happening here?", gets a lightly
   tidied one-line caption (capitalization and punctuation only, no invented facts), and can edit it.
   Captions are always couple-written.
4. **Tags**: relationship stage (meeting, dating, engagement, wedding, life together, family and
   friends) and a "both of us are in this photo" toggle.
5. **Privacy**: everything stays on the device. "Delete all my data" wipes photos and captions.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone (same Wi-Fi). Add a few photos and caption them.

## Build an APK for sideloading

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

In `eas.json`, set the `preview` profile to `"android": { "buildType": "apk" }`.

## Next steps

- On-device face check for the two spouses (replaces the manual toggle)
- Timeline view with gap detection (for example, nothing between March and August)
- Exhibit PDF export: photo, date, and caption per page
- Google Photos Picker import
- Optional AI description draft shown as a suggestion the couple edits

## Layout

```
App.tsx                      state, import, persistence wiring
src/types.ts                 EvidencePhoto model and categories
src/storage.ts               on-device JSON and photo file storage
src/exif.ts                  EXIF date parsing and formatting
src/screens/HomeScreen.tsx   grid, stats, add photos
src/screens/CaptionScreen.tsx  per-photo prompt, caption, tags
```
