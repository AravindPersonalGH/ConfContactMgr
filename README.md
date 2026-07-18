# Conference Contact Manager

A simple personal browser-based Conference Contact Manager implemented with plain HTML, CSS, and JavaScript.

## Tech and Scope

- `index.html`, `styles.css`, `app.js`
- Browser localStorage as the live data store
- Browser File APIs for JSON import/export
- No backend, no cloud database, no framework, no build step

## Storage Model

- Live storage key: `confcontactmgr.contacts.v1`
- Contacts persist across refresh/restart as long as browser site data is not cleared
- JSON files are for manual export, backup, import, restore, and transfer only
- The app does not and cannot modify files inside a GitHub repository

## Usage

1. Open `index.html` directly in a browser, or host the same files on GitHub Pages.
2. Use **Add Contact** to save contacts.
3. Use **Show Contacts** to search, view, edit, or delete.
4. Use **Import JSON** and **Export JSON** for transfer and backup.
5. Use **Clear All** to remove browser-stored contacts after confirmation.

## JSON Envelope

Exports use this structure:

```json
{
  "application": "confcontactmgr",
  "version": 1,
  "exportedAt": "ISO timestamp",
  "contactCount": 0,
  "contacts": []
}
```

## Hosting Notes

- Designed for static hosting on personal-account GitHub Pages
- Works with local file opening and GitHub Pages hosting
- Local file origin and GitHub Pages origin use different localStorage scopes

## Data Safety

Do not commit personal contact data or exported JSON files to Git.
