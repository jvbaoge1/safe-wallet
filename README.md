# SafeWallet

Security-first wallet demo powered by imToken Token Core (tcx-wasm) for the imToken 10th Anniversary AI Co-creation.

## Features

- **Create/Import HD Wallet** — `create_keystore` with PBKDF2 600K encryption
- **Multi-Chain Derivation** — ETH / TRX / BTC addresses from a single mnemonic via `derive_accounts`
- **Message Signing** — PersonalSign, TRON, BIP-322 via `sign_message`
- **URL Safety Checker** — Built-in phishing domain detection
- **Transaction Risk Assessment** — Pre-signing risk alerts
- **Security Checklist** — Interactive 8-item safety checklist
- **100% Local** — All crypto operations run in WebAssembly, zero data leaves the browser

## Tech Stack

- **Token Core**: `@consenlabs/tcx-wasm@0.9.1` (WebAssembly)
- **UI**: React 19 + TypeScript + Vite
- **Design**: imToken Design System (Token UI style)
- **AI Generated**: Code created with AI coding assistant

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:5173
```

## Token Core APIs Used

| API | Purpose | Status |
|-----|---------|--------|
| `create_keystore` | Create encrypted HD wallet | Integrated |
| `derive_accounts` | Multi-chain address derivation | Integrated |
| `export_mnemonic` | Decrypt mnemonic from keystore | Integrated |
| `sign_message` | Sign messages (ETH/TRX/BTC) | Integrated |
| `sign_tx` | Sign transactions (listed, ready) | Listed |
| `cache_keystore` | Cache keystore in WASM memory | Integrated |

## imToken Co-creation

This project is created for the [imToken 10th Anniversary AI Co-creation](https://token.im/homes/ai-co-creation) event.

> ⚠️ **Warning**: This is a demo for educational purposes. Do NOT use it to manage real assets.

## License

MIT
