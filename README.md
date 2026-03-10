# 🫧 PolyPocket

> **The whole prediction market, in your pocket.**

A live, mobile-first Polymarket integration pulling real-time events, outcome probabilities, and order book depth directly from the Polymarket CLOB and Gamma APIs — with no API key required.

**→ [Live Demo: polypocket.vercel.app](https://polypocket.vercel.app)**

---

## What It Does

- 🔴 **Live events** — top 48 active markets by 24h volume, paginated, auto-refreshing every 60 seconds
- 🗂️ **14 real Polymarket categories** — Politics, Sports, Crypto, Iran, Finance, Geopolitics, Tech, Culture, Economy, Climate & Science, Elections, Entertainment, NFL, NBA
- 📊 **Outcome probabilities** — YES/NO and multi-outcome markets with visual probability bars
- 📖 **Order book depth** — real-time bids and asks in a native mobile bottom sheet
- 🔍 **Search + category filter** — keyword search layered on top of category tabs
- 📱 **Mobile-first** — bottom sheet UI, horizontal scroll rail, safe area insets, tap interactions

---

## Architecture

```
Browser
  └─→ /api/events    (Vercel serverless proxy)
        └─→ gamma-api.polymarket.com/events
  └─→ /api/book      (Vercel serverless proxy)
        └─→ clob.polymarket.com/book

No build step. No dependencies. Single HTML file + 3 serverless functions.
```

**Why a server-side proxy?**  
Polymarket's APIs don't emit CORS headers for arbitrary browser origins. The Vercel serverless functions act as a thin pass-through, adding CORS headers and a short cache (`s-maxage`) to keep the experience snappy without hammering upstream.

---

## API Endpoints Used

### 1. Events (with pagination + tag filtering)
```
GET https://gamma-api.polymarket.com/events
  ?active=true
  &closed=false
  &limit=48
  &offset=<n>
  &order=volume24hr
  &ascending=false
  &tag_slug=<category>   # optional — filters by Polymarket category slug
```
Returns active events grouped with their child markets, outcome prices, volumes, and tag metadata. This is the same endpoint Polymarket's own frontend uses.

**Docs:** [docs.polymarket.com/api-reference/events/list-events](https://docs.polymarket.com/api-reference/events/list-events)

---

### 2. Order Book
```
GET https://clob.polymarket.com/book?token_id=<token_id>
```
Returns the full CLOB order book (bids + asks) for a specific outcome token. Each market outcome is an ERC-1155 token on Polygon — the `token_id` comes from the event's nested market `clobTokenIds` field.

**Docs:** [docs.polymarket.com/api-reference/market-data/get-order-book](https://docs.polymarket.com/api-reference/market-data/get-order-book)

---

## Understanding Polymarket's Data Model

| Concept | What it means |
|---------|--------------|
| **Event** | A top-level question with one or more outcome markets (e.g., "2026 Midterms") |
| **Market** | A specific binary question nested inside an event |
| **Outcome Token** | Each outcome (YES/NO) is a unique ERC-1155 token ID on Polygon |
| **Price** | Represents probability — a YES token at `0.72` = 72% market-implied chance |
| **Order Book** | Standard CLOB bids/asks, priced 0.00–1.00 (in USDC) |
| **Resolution** | Winning tokens redeem at $1.00 USDC; losing tokens go to $0 |

---

## Project Structure

```
polypocket/
├── index.html          # Full app — UI, state, rendering, all vanilla JS
├── api/
│   ├── events.js       # Proxy → gamma-api.polymarket.com/events (with tag + pagination)
│   ├── book.js         # Proxy → clob.polymarket.com/book
│   └── markets.js      # Proxy → gamma-api.polymarket.com/markets (legacy, kept for reference)
└── README.md
```

---

## Running Locally

```bash
git clone https://github.com/emudoteth/polypocket
cd polypocket

# Requires Vercel CLI to run serverless functions locally
npm i -g vercel
vercel dev
# → http://localhost:3000
```

Or just open `index.html` directly — it'll show the UI but market data won't load without the proxy (CORS). Use `vercel dev` for the full experience.

---

## Deploying Your Own

```bash
npx vercel --prod
```

The entire app is `index.html` + 3 serverless functions. No environment variables, no config, no database.

---

## Going Further

PolyPocket is read-only. With authentication you can place orders, track positions, and subscribe to live WebSocket feeds:

```python
# pip install py-clob-client
from py_clob_client.client import ClobClient
from py_clob_client.clob_types import OrderArgs, BUY

client = ClobClient(
    "https://clob.polymarket.com",
    key=private_key,
    chain_id=137,
    creds=api_creds,
)

# Place a limit order
order = client.create_and_post_order(OrderArgs(
    token_id="...",
    price=0.65,
    size=100,
    side=BUY,
))
```

**Docs:** [docs.polymarket.com/api-reference/clients-sdks](https://docs.polymarket.com/api-reference/clients-sdks)

Other things you could build on this foundation:
- **Price alert bot** — monitor a market, DM when price crosses a threshold
- **Portfolio tracker** — fetch positions and P&L via the Core API
- **Embedded widgets** — drop live market cards into any site via the Builder Program
- **Market aggregator** — group related events and surface combined probability signals

---

## Why This Exists

Built as a proof of concept to demonstrate how quickly a polished, production-quality integration can be assembled on Polymarket's public API surface.

Goals:
1. Actually works, live, zero setup for the end user
2. Makes the full API surface legible — every data point traces back to a specific endpoint and docs page
3. Useful reference for developers starting their first Polymarket integration

---

## Stack

- **HTML + vanilla JS** — zero dependencies, zero build step
- **Vercel serverless** — CORS proxy + edge caching for the Polymarket APIs
- **Polymarket Gamma API** — events, markets, tags, volumes
- **Polymarket CLOB API** — order book depth

---

## License

MIT. Fork it, break it, build on it.

---

*Built by [@emudoteth](https://github.com/emudoteth)*  
*Data: [Polymarket](https://polymarket.com) · Docs: [docs.polymarket.com](https://docs.polymarket.com)*
