# Web Activity Sync Extension

Simple MV3 extension that tracks active website usage and syncs it to your backend `POST /analytics/sync`.
When you click the extension icon, it shows full analysis in the popup.

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `WebSyncExtension`

## Configure

1. Click extension icon
2. Set **Backend API URL** (example: `http://localhost:7777`)
3. Click **Save**
4. Click **Sync Now**

## Data format sent

- `tabs`: domain summary + day-wise summary and sessions
- `timeIntervals`: `domain`, `day`, and list of `"HH:mm:ss-HH:mm:ss"` intervals
- `clientId`: anonymous extension client id (generated once)

## Auto sync

- Runs every 30 seconds
- Also syncs after browsing state changes and manual sync

No JWT token is required.

## Popup analysis includes

- Active website and current active duration
- Total tracked websites
- Total time tracked
- Total sessions
- Per-website table with:
  - total time
  - today's time
  - total sessions
