# PolyPocket 🫧

> The whole prediction market, in your pocket.

Live markets, real-time prices, and wallet-native trading — built on [Polymarket](https://polymarket.com).

**Live:** https://polypocket.vercel.app  
**Stack:** Next.js 14 · ethers.js v5 · Recharts · Vercel serverless

---

## Architecture

```
Browser                          Vercel Serverless (Node.js)
───────────────────────────────  ──────────────────────────────────────
hooks/useWallet.js               pages/api/events.js    → Gamma API
  └─ window.ethereum + ethers    pages/api/event.js     → Gamma API
                                 pages/api/markets.js   → Gamma API
components/                      pages/api/book.js      → CLOB API
  MarketCard.jsx                 pages/api/prices-history.js → CLOB API
  MarketDetail.jsx
  Portfolio.jsx
  TradeModal.jsx ──deeplink──→ polymarket.com
  WalletButton.jsx

lib/clob.js  ← SERVER ONLY (Node.js crypto)
```

All Polymarket API calls go through serverless proxies — both APIs lack CORS headers for browser origins.

---

## Wallet Connection

Uses bare `window.ethereum` + ethers.js v5. No RainbowKit, no wagmi, no WalletConnect needed.

```js
const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
const signer   = provider.getSigner();
// Pass signer directly to ClobClient (server-side) or sign typed data client-side
```

Works with: MetaMask, Brave Wallet, Coinbase Wallet, Rabby, any EIP-1193 extension.

---

## API Reference

### Gamma API (Events / Markets)
Base: `https://gamma-api.polymarket.com`

| Endpoint | Purpose |
|---|---|
| `GET /events?limit=N&order=volume24hr&ascending=false` | Paginated events, sorted by 24h volume |
| `GET /events?tag_slug=politics&limit=N` | Events filtered by tag |
| `GET /events/{id}` | Single event with all markets |

### CLOB API (Order Book / Prices)
Base: `https://clob.polymarket.com`

| Endpoint | Purpose |
|---|---|
| `GET /book?token_id={TOKEN_ID}` | Order book depth for one outcome token |
| `GET /prices-history?market={TOKEN_ID}&interval={1h\|6h\|1d\|1w\|1m\|max}&fidelity=100` | Price history |
| `POST /order` | Place signed limit order (requires L2 HMAC auth) |

### Data API (Portfolio / Leaderboard)
Base: `https://data-api.polymarket.com`

| Endpoint | Purpose |
|---|---|
| `GET /positions?user={PROXY_WALLET}&limit=50` | User's open positions |
| `GET /v1/leaderboard?category=OVERALL&limit=20` | Global leaderboard |

---

## Gotchas & Hard-Won Lessons

### 1. `@polymarket/clob-client` is Node.js only
The clob-client uses `crypto`, `stream`, `http`, `https`, `os` from Node.js. These don't exist in the browser. **Never import `lib/clob.js` from a component.** Import it only from `pages/api/*` routes.

```js
// ✅ Fine — runs in Node.js
// pages/api/place-order.js
import { placeOrder } from '../../lib/clob';

// ❌ Crashes browser — do not do this
// components/TradeModal.jsx
import { placeOrder } from '../lib/clob';
```

Next.js 14 removed automatic Node.js polyfills. Webpack `resolve.fallback: { crypto: false }` stubs the module but causes runtime TypeErrors when the code actually calls `crypto.createHmac()`.

### 2. Don't use RainbowKit / wagmi for this stack
- `wagmi@1.x` removed `useSigner` (it existed in v0.x only). Any code calling `useSigner()` from wagmi 1.x throws `TypeError: useSigner is not a function`.
- RainbowKit requires a WalletConnect project ID (free at cloud.walletconnect.com) or you get WebSocket 401 noise in the console.
- The wagmi/RainbowKit provider stack adds ~400KB and several peer-dep version constraints.
- **Simpler:** `window.ethereum` + ethers.js v5 directly. Zero provider wrapping, no hook version drift.

### 3. `market` param for prices-history = TOKEN ID, not conditionId
```js
// ✅ Correct
GET /prices-history?market=38397507750621893057346880033441136112987238933685677349709401910643842844855

// ❌ Wrong — conditionId won't return history
GET /prices-history?market=0x1234...conditionId
```
Token IDs are the `clobTokenIds` values from the event's market object (always JSON strings).

### 4. API response fields are JSON strings, not parsed objects
```js
const market = event.markets[0];

// ❌ This crashes
market.clobTokenIds[0]

// ✅ Parse first
JSON.parse(market.clobTokenIds)[0]    // e.g. "38397507..."
JSON.parse(market.outcomePrices)[0]   // e.g. "0.73"
JSON.parse(market.outcomes)[0]        // e.g. "Yes"
```

### 5. Both Polymarket APIs lack CORS headers
`clob.polymarket.com` and `gamma-api.polymarket.com` don't send `Access-Control-Allow-Origin` for browser requests. All API calls must go through server-side proxies (Vercel API routes in this project).

### 6. Vercel build cache can serve stale chunks
After code changes, Vercel may serve a cached bundle with the old chunk hash. The symptom: browser throws errors for code you've already fixed. Fix: hard refresh (`Cmd+Shift+R`) or clear site data. The deployed chunk hash changing in the Network tab confirms the new build is live.

### 7. ClobClient constructor for EOA wallets
```js
// 4-arg form (v4.x default) — works for proxy wallets
new ClobClient(host, chainId, signer, creds)

// 6-arg form — required for EOA (externally owned account) signing
new ClobClient(host, chainId, signer, creds, 0, funderAddress)
//                                             ↑ SignatureType.EOA = 0
//                                                      ↑ your wallet address
```

### 8. L2 API credentials (HMAC)
Polymarket uses a two-layer auth model:
- **L1** — EIP-712 signed message proves wallet ownership → returns L2 API key + secret + passphrase
- **L2** — Every CLOB request is HMAC-signed with the L2 secret

`ClobClient.createOrDeriveApiKey()` handles L1 and returns L2 creds. Cache them in `localStorage` — re-deriving requires a wallet signature every time.

### 9. Neg-risk markets
Multi-outcome markets where probabilities sum to 1 (e.g. "Which party wins the Senate?") use a different contract (`NegRiskCTFExchange`). The `enableOrderBook` and `negRisk` flags on the event indicate this. The clob-client handles the routing, but be aware the token structure differs.

### 10. US geoblock
```js
const res = await fetch('https://polymarket.com/api/geoblock');
const { restricted } = await res.json(); // true for US IPs
```
Show a warning in the UI before allowing trades from restricted regions.

---

## Local Development

```bash
npm install
npm run dev   # http://localhost:3000
```

Environment variables (optional):
```
# None required for read-only browsing
# For WalletConnect mobile QR: NEXT_PUBLIC_WC_PROJECT_ID=your_id_here
```

---

## Trading Flow (Current)

The trade modal collects price/size and opens `polymarket.com/event/{slug}` for actual execution. This is intentional — the CLOB signing flow requires server-side `@polymarket/clob-client` but the EIP-712 signature must come from the user's wallet, which creates a round-trip complexity outside scope for this MVP.

**To implement real order placement:**
1. Server: `GET /api/build-order?tokenID=&price=&size=&side=` → returns EIP-712 typed data
2. Browser: `signer._signTypedData(domain, types, value)` → signed order
3. Browser: `POST /api/submit-order` with signed order + funder address
4. Server: add L2 HMAC headers, forward to `POST https://clob.polymarket.com/order`

---

## Known Data Quality Issues

### Leaderboard: Spam / Zero-Volume Entries

The `/v1/leaderboard` endpoint returns unfiltered data from the Data API. This includes bot accounts and spam usernames with $0 volume that have somehow made it onto the leaderboard (e.g. `"2121212121212121212121212"` at rank #5 with `Vol: $0K`).

**Root cause:** Polymarket's leaderboard API does not enforce minimum volume or username sanity. Entries with `volume: 0` (or near-zero) and nonsensical names (all-numeric, repeated characters) appear legitimately in the response.

**Observed example:**
```
#5  2121212121212121212121212   Vol: $0K
```

**Recommended client-side fix:**
```js
const leaderboard = raw
  .filter(entry => parseFloat(entry.volume || 0) >= 100)   // drop $0 / dust entries
  .filter(entry => !/^[\d\s]{6,}$/.test(entry.name || '')); // drop all-numeric spam names
```

**Status:** Not fixed yet — currently displayed as-is from the API. Worth filtering before shipping.

### Leaderboard: Volume Field is Opaque

The `volume` field returned by `/v1/leaderboard` does **not** correspond to 24h volume or any documented time window. It appears to be a cumulative all-time figure, but Polymarket does not define it in their public docs.

```js
// What the API returns
{ name: "trader123", volume: 48293.12, ... }

// What it is NOT:
//   ❌ 24h volume  — that's event.volume24hr on the Gamma API
//   ❌ 7d volume
//   ❌ any labeled time period

// What it probably is:
//   ✅ All-time total trading volume for that wallet (undocumented)
```

**Implication:** Don't label this as "24h Volume" or "Recent Volume" in the UI. "Vol" or "All-time Vol" is the safest label until Polymarket documents the field. The displayed `$XXK` / `$XXM` formatting is correct — the ambiguity is in the *time period*, not the unit.
