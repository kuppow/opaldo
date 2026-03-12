# OPALDO — Bitcoin NFT Marketplace

> A Bitcoin-native NFT marketplace built on OPNet. Browse, buy, and mint OP721 NFTs with full OPWallet integration — zero build step, runs as a single HTML file.

---

## Features

- 🟠 **Bitcoin-native** — built on OPNet's OP721 standard
- 🔗 **OPWallet integration** — real on-chain transactions via `signAndBroadcastInteraction`
- 🖼️ **Multi-collection support** — browse NFTs across Bitcoin, Ethereum, and Solana collections
- 🛒 **Mint & buy** — live mint launchpad + secondary marketplace
- 📰 **News & partners** — ecosystem updates and partner directory
- 🚀 **Launchpad** — deploy your own OP721 collection (4-step wizard)
- ⚡ **No build step** — single self-contained `opaldo.html` file

---

## Getting Started

1. Download `opaldo.html`
2. Open it in any modern browser (Chrome, Firefox, Brave)
3. Install [OPWallet](https://opnet.org) browser extension
4. Connect your wallet and start trading

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19.2.4 (via CDN) |
| Styling | Inline CSS / Tailwind-inspired |
| JSX | Sucrase (compiled at runtime) |
| Blockchain | OPNet (Bitcoin L2) |
| Wallet | OPWallet via `window.opnet` |
| Contract standard | OP721 (Bitcoin NFT) |

---

## Transaction Flow

```
User clicks "Buy" / "Mint"
        ↓
OPALDO encodes ABI calldata
        ↓
sendOpNetInteraction() called
        ↓
OPWallet popup — user approves amount + fee
        ↓
signAndBroadcastInteraction() broadcasts to Bitcoin/OPNet
        ↓
Transaction ID returned → SuccessModal shown
```

---

## Project Structure

Since this is a single-file app, everything lives in `opaldo.html`:

```
opaldo.html
├── Constants        (COLORS, PALETTES, NETWORKS, COLLECTIONS)
├── OPNet Layer      (sendOpNetInteraction, ABI encoders, UTXO fetcher)
├── Hooks            (useWallet, usePrices, useLivePrices)
├── Components       (NFTArt, MintCarousel, CheckoutModal, SignModal...)
├── Pages            (ExploreTab, MintTab, MyCollectionTab, NewsTab...)
├── LaunchpadView    (4-step OP721 deploy wizard)
└── OPNetMarketplace (root app + routing)
```

---

## Roadmap

- [ ] Deploy OP721 marketplace contract + set `MARKETPLACE_CONTRACT` address
- [ ] Real metadata fetching from on-chain storage
- [ ] Real-time balance updates after transactions
- [ ] Offer / bidding system
- [ ] Countdown timer for mint end dates
- [ ] Newsletter backend
- [ ] Real Launchpad contract deployment via OPNet CLI
- [ ] Pagination for large collections

---

## Networks Supported

| Network | Standard | Status |
|---|---|---|
| Bitcoin (OPNet) | OP721 | ✅ Primary |
| Ethereum | ERC-721 | 🔶 UI only |
| Solana | Metaplex | 🔶 UI only |

---

## Contributing

Pull requests are welcome. For major changes please open an issue first.

---

## License

MIT

---

## Links

- 🌐 [opnet.org](https://opnet.org)
- 🐦 [x.com/opnet_btc](https://x.com/opnet_btc)
- 💬 [discord.gg/opnet](https://discord.gg/opnet)
- 📬 [t.me/opnetbtc](https://t.me/opnetbtc)
- 💻 [github.com/btc-vision](https://github.com/btc-vision)
