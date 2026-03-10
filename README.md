# 🫧 PolyPocket

> **The whole prediction market, in your pocket.**

A live, no-auth Polymarket integration that pulls real-time market data, outcome probabilities, and order book depth directly from the Polymarket CLOB API.

**→ [Live Demo: polypocket.vercel.app](https://polypocket.vercel.app)**

---

## What It Does

PolyPocket fetches and displays live prediction market data from Polymarket:

- 🔴 **Live markets** — top 30 by 24h volume, auto-refreshing every 30 seconds
- 📊 **Outcome prices** — YES/NO probabilities displayed as visual bars + percentages
- 📖 **Order book depth** — real-time bids and asks for any market's outcome token
- 🔍 **Search + filter** — by keyword or category tag
- 📡 **No API key required** — uses only Polymarket's public read endpoints

---

## API Endpoints Used

All data is fetched client-side, live from Polymarket's infrastructure.

### 1. Market Listings
```
GET https://gamma-api.polymarket.com/markets
  ?active=true
  &limit=30
  &order=volume24hr
  &ascending=false
```
Returns active markets with questions, token IDs, outcome prices, volumes, and category tags.

**Docs:** [docs.polymarket.com/api-reference/events/list-events](https://docs.polymarket.com/api-reference/events/list-events)

---

### 2. Order Book
```
GET https://clob.polymarket.com/book?token_id=<token_id>
```
Returns the full order book (bids + asks) for a specific outcome token. Each market has one token ID per outcome (e.g., YES and NO each have their own token).

**Docs:** [docs.polymarket.com/api-reference/market-data/get-order-book](https://docs.polymarket.com/api-reference/market-data/get-order-book)

---

### 3. Midpoint Prices
```
GET https://clob.polymarket.com/midpoints?token_id=<token_id>
```
The midpoint is the average of the best bid and best ask — the cleanest single-number representation of market probability.

**Docs:** [docs.polymarket.com/api-reference/data/get-midpoint-price](https://docs.polymarket.com/api-reference/data/get-midpoint-price)

---

## Architecture

```
Browser
  └─→ gamma-api.polymarket.com/markets   (market list + metadata)
  └─→ clob.polymarket.com/book           (order book on demand)

No backend. No server. No API key.
Pure HTML + vanilla JS deployed to Vercel.
```

**Why no framework?** PolyPocket is intentionally dependency-free. It's meant to be a reference integration — something a developer can read, understand, and fork in an afternoon. One file. No build step. No `node_modules`.

---

## Running Locally

```bash
git clone https://github.com/emudoteth/polypocket
cd polypocket

# Option 1: just open it
open index.html

# Option 2: serve it (avoids any CORS quirks)
npx serve .
# → http://localhost:3000
```

That's it. No `.env`, no install step, no config.

---

## Deploying Your Own Instance

```bash
# Vercel (one command)
npx vercel --prod

# Or drag the folder into vercel.com/new
```

The whole app is a single `index.html`. It deploys anywhere that serves static files.

---

## Understanding Polymarket's Data Model

Polymarket uses a **CLOB (Central Limit Order Book)** on Polygon. A few concepts worth knowing:

| Concept | What it means |
|---------|--------------|
| **Market** | A question with a defined resolution criteria (e.g., "Will X happen by Y date?") |
| **Outcome Token** | Each possible outcome (YES/NO) has a unique ERC-1155 token ID on Polygon |
| **Price** | Represents probability — a YES token at `0.72` means the market thinks there's a 72% chance |
| **Order Book** | Standard bids/asks, priced between 0.00 and 1.00 |
| **Resolution** | When a market resolves, winning tokens redeem for $1.00 USDC; losing tokens go to $0 |

This is why reading an order book on Polymarket is reading collective probability estimates, not just supply/demand.

---

## Going Further: What You Can Build

PolyPocket only scratches the surface. With authentication, you can:

```python
# py-clob-client example
from py_clob_client.client import ClobClient

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
- **Price alert bot** — monitor a market and DM when it crosses a threshold
- **Portfolio tracker** — fetch open positions and P&L via the Core API
- **Market aggregator** — group related markets (e.g., all 2026 election markets) and show combined signals
- **Builder integration** — embed Polymarket widgets into your own app via the Builder Program

---

## Why This Exists

This repo is a proof of concept built to demonstrate how quickly a useful integration can be assembled on Polymarket's public API surface.

The goal was to ship something that:
1. Actually works, live, no setup required
2. Makes the API surface legible — every data point links back to the specific endpoint and docs page that produced it
3. Could serve as a reference for developers building their first Polymarket integration

---

## Stack

- **HTML + vanilla JS** — zero dependencies, zero build step
- **Polymarket Gamma API** — market data
- **Polymarket CLOB API** — order books
- **Vercel** — static hosting

---

## License

MIT. Fork it, break it, build on it.

---

*Built by [@emudoteth](https://github.com/emudoteth)*  
*Data: [Polymarket](https://polymarket.com) · Docs: [docs.polymarket.com](https://docs.polymarket.com)*
