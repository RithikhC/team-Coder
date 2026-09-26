# ListIt — Team Coder · Code & Chaos

A fast, zero-dependency listings marketplace. Post items for sale in any currency, then browse,
search and sort them with every price converted live into your own currency.

## Run it

No build step and no install. Either:

- **Double-click `index.html`**, or
- serve the folder with any static server (e.g. `npx serve .`) and open the URL shown.

Data is saved in your browser's `localStorage`, so listings stay after a refresh.

## Features

### Round 1: Base build
- **Post a listing**: title, price, category and an optional description, with inline validation
  and accessible error messages.
- **Browse** all listings in a responsive card grid, newest first, with relative timestamps.
- **Filter by category** using chips that show live counts. Click a chip again to clear it.
- **Keyword search** across title, description and category. Matches are highlighted; press
  `/` to focus the search box and `Esc` to clear it.
- Seed data on first load, so the app never looks empty.

### Round 2: Frankfurter currency integration
Currency conversion is built into posting, browsing and sorting.

- **List in any currency.** Sellers choose from the 30+ currencies Frankfurter supports (the
  list is fetched live from `/currencies`). Older listings are migrated to USD automatically.
- **Browse in your currency.** A "Show prices in" picker in the header converts every card into
  the viewer's currency, and each card still shows the seller's original price. The default
  currency comes from your browser locale (e.g. `en-IN` → INR) and your choice is remembered.
- **Fair cross-currency sorting.** "Price: low → high" compares the converted values, so
  €180, £150 and ¥32,000 rank correctly against each other.
- **Live seller preview.** While typing a price, sellers see what buyers abroad will pay
  (`/latest?amount=…&from=…&to=…`), debounced so stale responses are dropped.
- **Built to hold up when the network doesn't:**
  - one `/latest?base=X` call converts the whole grid;
  - rates are cached for 6 hours in memory and `localStorage`;
  - identical requests share one fetch, and each request times out after 8 seconds;
  - when offline, the app falls back to saved rates with a clear banner, or to original prices
    with a Retry button.
- The rates date (ECB reference rates) is always shown, with credit to Frankfurter.

### Round 3: Vanilla-only features (no new libraries)
Everything below uses native web platform APIs only: no packages, CSS frameworks or
component libraries. The project has **zero dependencies**, and never had any.

- **Listing detail dialog** built on the native `<dialog>` element (focus trap, `Esc`, backdrop
  click to close, focus returns to the card). It quotes the price in six currencies, with the
  viewer's own currency highlighted.
- **30-day price history chart**, drawn by hand in SVG (`js/sparkline.js`). It shows what the
  item has cost in the viewer's currency each day, using Frankfurter's time-series endpoint.
  - Read any day by hovering, touching, or using the arrow keys (it's focusable).
  - Low, high and percentage change are summarised underneath.
- **Edit and delete listings.** Editing reuses the post form. Deleting shows an **Undo** toast
  instead of a blocking `confirm()`, and undo restores the listing to its original position.
- **Saved listings (watchlist).** A heart button on every card and a ♥ Saved filter chip,
  persisted locally.
- **Price-range filter** in the viewer's currency. It compares converted prices, so "under
  CHF 100" works across every seller's currency.
- **Shareable URLs.** Search, category, sort, price range and saved-only are synced to the URL
  hash (e.g. `#cat=furniture&sort=price-asc&max=200`). Links restore the exact view, and
  back/forward and hand-edited hashes work too.
- **Dark mode.** It follows the OS setting by default, the toggle is remembered, and an inline
  `<head>` script applies the theme before first paint (no white flash). Every colour is a CSS
  custom property.
- **Accessibility:**
  - one tab stop per card (stretched link pattern);
  - `aria-pressed` toggles and live regions for results, errors and toasts;
  - visible focus rings, a skip link, and `prefers-reduced-motion` support.

## Project structure

```
index.html          markup and layout
css/styles.css      design tokens (CSS variables) and all styles
js/categories.js    category definitions (label, icon, colour hue)
js/currency.js      Frankfurter API client: rates, currency list, quotes, caching
js/pricing.js       viewer's display currency, rate loading and status banner
js/store.js         listing store: localStorage persistence, CRUD and change events
js/saved.js         saved-listings watchlist
js/view.js          formatting helpers and card templates (HTML-escaped)
js/form.js          post and edit form: read, validate, submit, live price preview
js/filters.js       search, category, saved, price range, sorting, URL-hash sync
js/detail.js        listing detail <dialog> with multi-currency quotes
js/sparkline.js     dependency-free interactive SVG line chart
js/price-history.js 30-day cost chart section for the detail dialog
js/toast.js         toast notifications with Undo actions
js/manage.js        edit and delete actions
js/theme.js         light/dark theme toggle
js/app.js           bootstraps the modules and owns UI state
```

Each module attaches itself to one `window.App` namespace, so plain `<script>` tags work, even
from `file://`.

---

# Code & Chaos — Base Repo

This is the starter repo for **Code & Chaos**, an hourly-twist coding challenge. Fork this repo and build on it throughout the event.

## Getting Started

1. **Fork this repo.**
2. **Rename your fork** to `team-<your-team-name>` (e.g. `team-nightowls`).
3. Work directly in your fork for the full duration of the event.

## Checkpoint Commits

At the end of every hour, push a commit using this exact message format:

```
ROUND-<number>-CHECKPOINT
```

Examples: `ROUND-1-CHECKPOINT`, `ROUND-2-CHECKPOINT`, `ROUND-3-CHECKPOINT`, `ROUND-4-CHECKPOINT`

- This must be your **most recent commit** before each round's cutoff time.
- You can make other commits during the hour too — only the checkpoint tag matters for tracking.

## Rules

- Do not make your fork private.
- Do not look at or copy from other teams' forks.
- Full event timeline and round-by-round constraints will be shared separately (via registration confirmation / event channel) — this repo is just your working base.

Good luck, and have fun with the chaos!!!!

## 🚀 Code & Chaos — Base Build (10:00 AM – 11:10 AM)

Build a **listings app** — a place where users can post and browse listings.

**Core functionality to include:**
- Post a listing with a title, price, and category
- View/browse all listings
- A basic filter or search by category

This is your foundation for the rest of the event — later rounds will build on top of what you create here, so keep your code reasonably organized.

**Checkpoint due by 11:10 AM:** commit with message `ROUND-1-CHECKPOINT`

‼️‼️‼️‼️
##  Round 2 Twist (11:10 AM – 12:10 PM)

Integrate the **Frankfurter currency conversion API** into your app in a meaningful way — it should connect to your app's core functionality, not just sit in a corner. For example: let users view a listing's price converted into a different currency of their choice.

- API docs: https://frankfurter.dev
- No API key required
- Example request: `https://api.frankfurter.app/latest?amount=100&from=USD&to=EUR`

**Checkpoint due by 12:20 PM:** commit with message `ROUND-2-CHECKPOINT`

‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️
## Round 3 Twist (12:20 PM – 1:20 PM)

No new external libraries or frameworks allowed from this point on — no new packages, no CSS frameworks, no component libraries. Anything already in your stack from Hours 1–2 can stay, but nothing new can be added this round. Native/vanilla only for new work.

**Checkpoint due by 1:30 PM:** commit with message `ROUND-3-CHECKPOINT`


‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️‼️
## 🔔 Round 4 Twist (1:30 PM – 2:30 PM)

Reskin your app with a completely new theme while keeping the same underlying functionality (e.g. listings app → "space mission cargo manifest"). This should include visual and copy changes reflecting the new theme, not just a renamed title.

**Final checkpoint due by 2:40 PM:** commit with message `ROUND-4-CHECKPOINT`



## 🏁 Event Ended
Congratulations, You've made it to the end!!!
Code & Chaos has ended. Thank you for participating! Results will be shared soon.
