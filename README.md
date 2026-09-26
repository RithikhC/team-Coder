# Plunder Port (Team Coder)

Our Code & Chaos project. It started as **ListIt**, a simple listings marketplace, and after the
round 4 twist it became **Plunder Port**, a pirate loot exchange. Same app underneath, new skin.

Plain HTML, CSS and JavaScript. No frameworks, no npm, no build step.

**Live demo: https://rithikhc.github.io/team-Coder/**

## Running it

It's deployed on GitHub Pages (link above). Every push to `main` redeploys it through
`.github/workflows/pages.yml`.

To run it locally, just open `index.html` in a browser. Or serve the folder if you prefer:

```
npx serve .
```

Everything is saved in localStorage, so your loot is still there after a refresh. Exchange rates
come from the Frankfurter API, so you need internet for live prices. If it's offline, the app
uses the last rates it saved, or just shows each seller's own price.

## Quick demo

On first visit there's a short guided tour (you can replay it from the `?` button).

Things worth trying:

- Change "Count yer coin in" at the top. Every price on the board converts.
- Open the sloop "Salty Maiden" and haggle. Offer 40% and the captain gets insulted, offer about
  70% and he'll counter. Accept it and it goes into your bag at the lower price.
- Open the bag (top right) to see everything totalled in your currency, and how much you saved.
- Hit "Spin the wheel" for a random item.
- Post something yourself. You can paste a screenshot straight in as the picture.
- `?` shows keyboard shortcuts, `T` switches to night mode.

## What we built each round

### Round 1: base app
- Post a listing with title, price, category and optional description (with validation)
- Browse everything in a card grid, newest first
- Filter by category (chips with counts) and keyword search with highlighting
- Some seed listings so the page isn't empty on first load

### Round 2: Frankfurter API
We didn't want the converter to be a separate widget, so currency is part of the whole app:
- Sellers pick the currency they're listing in
- Buyers pick the currency they want to see, and every price gets converted
- Sorting by price uses the converted values, so 450 SEK and 130 CAD compare correctly
- While posting, sellers see roughly what buyers in other currencies will pay
- Rates are cached for a few hours, requests time out after 8s, and there's a retry button if
  the API can't be reached

### Round 3: no new libraries
We never used any libraries, so everything here is vanilla:
- Detail popup (native `<dialog>`) showing the price in 6 currencies
- 30-day price history chart, drawn with SVG by hand. Hover or use the arrow keys to see each day
- Edit and delete, with an undo button instead of a confirm popup
- Save items to a watchlist
- Price range filter in your own currency
- Filters are kept in the URL, so you can share a link to a filtered view
- Dark mode that follows your system setting

### Round 4: reskin
The listings app became a pirate harbour loot board. Everything works the same, but the look and
all the text changed:

- Post a listing -> "Stash yer loot", categories -> holds (Navigation, Maps & Charts,
  Ships & Dinghies, Blades & Cannons, ...), saved -> "coveted", delete -> "walk the plank",
  undo -> "fish it out"
- Parchment textures, a wooden header, wax-seal buttons, "FOR TRADE" stamps on the cards
- Night mode became "night watch" with lantern colours and stars
- New seed data (a spyglass, a treasure map, a sloop with a ghost, a parrot...)

After the reskin we added a few more interactive things, still with no libraries:
- **Haggling**: every seller has a hidden lowest price and limited patience. You can get
  accepted, countered or insulted
- **Plunder bag** (cart) that totals items from different currencies, and a checkout
- **Photos** for listings (drag and drop, paste or pick a file). They get resized on a canvas so
  they fit in localStorage
- Coin shower animation and small sound effects made with the Web Audio API (there's a mute
  button)
- 3D tilt on the cards, and "Spin the wheel"
- Guided tour and keyboard shortcuts
- Checked on phone widths (320px and up)

## Files

```
index.html
css/styles.css        all styles; colours are CSS variables so the theme is easy to swap
js/app.js             starts everything up and holds the filter state
js/store.js           listings + localStorage
js/currency.js        Frankfurter API calls and caching
js/pricing.js         the "show prices in" currency and the rates banner
js/filters.js         search, categories, price range, sorting, URL sync
js/view.js            card HTML and formatting helpers
js/form.js            post / edit form
js/detail.js          detail popup
js/sparkline.js       the SVG price chart
js/price-history.js   30-day history section in the popup
js/haggle.js          haggling
js/bag.js             plunder bag / cart
js/photo.js           image upload and resizing
js/fx.js              coin animation and sounds
js/motion.js          card tilt and spin the wheel
js/tour.js            guided tour and shortcuts
js/saved.js, toast.js, manage.js, theme.js, categories.js
```

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
