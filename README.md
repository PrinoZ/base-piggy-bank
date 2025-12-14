<<<<<<< HEAD
# Base Piggy Bank

Base Piggy Bank is a mini app for Dollar Cost Averaging (DCA) from USDC to cbBTC on Base chain. It's non-custodial, simple to use, and supports Farcaster Frame / Base Mini App experience.

## ✨ Features

- **One-click wallet connection** (RainbowKit + wagmi) with automatic USDC balance reading
- **Configure DCA plans**: Set amount per trade, frequency, and duration; create/cancel plans
- **Transaction history**: View plan execution records and transaction history
- **Leaderboard**: See rankings with shortened address display
- **Share functionality**: Share results with site links; social platforms will fetch OG preview images
- **EIP-1271 compatible**: Smart wallet signature verification support

## 🚀 Quick Start

1. Open the app: [https://base-piggy-bank.vercel.app](https://base-piggy-bank.vercel.app)
2. Connect your wallet (recommended: Base Mainnet) and ensure you have USDC
3. Configure amount per trade, frequency, and duration, then click **"Start DCA"**
4. View or cancel plans in the **"Assets"** tab; check rankings in the **"Rank"** tab

## 🌐 Supported Networks

- **Base Mainnet** (Chain ID: 8453)
  - If not on Base, you'll be prompted and can switch with one click

## 🔒 Security & Signatures

- All create/cancel operations require signatures
- Signatures include nonce and 5-minute expiration; backend performs replay attack prevention
- Backend uses Supabase to record plans and execution logs
- Service Role key is only used server-side; never exposed to frontend

## 📱 Frame / Mini App

- **Frame post_url**: `/api/frame` (provides Launch button)
- **Preview image**: `/og-image.png`
- **Mini App manifest**: `/miniapp.json`
- **Signature file**: `/miniapp.sig` (must match manifest domain and paths)

## 🛠️ Development & Deployment

### Environment Variables

```env
NEXT_PUBLIC_APP_URL=https://base-piggy-bank.vercel.app
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
MOCK_DATA_SECRET=your_secret_for_mock_data_generation
```

### Installation

```bash
npm install
```

### Local Development

```bash
npm run dev
```

### Production Deployment

Deploy to Vercel or any platform that supports Next.js.

## 📦 Assets

- **App icons**: `/icon-192.png`, `/icon-512.png`
- **Preview image**: `/og-image.png`
- **PWA manifest**: `/manifest.json`

## ❓ FAQ

**Q: Not seeing preview cards when sharing?**  
A: Ensure your domain is crawlable and OG/Frame meta tags are aligned with your production domain.

**Q: Smart wallet signature failing?**  
A: Backend uses `viem.verifyMessage` with EIP-1271 support. If it still fails, check if your wallet is on Base Mainnet.

**Q: Replay attack protection?**  
A: Signatures include nonce + expiration time. Backend stores nonces to prevent reuse.

## 📄 License

See [LICENSE](LICENSE) file for details.
=======
# Base Piggy Bank

Base Piggy Bank is a mini app for Dollar Cost Averaging (DCA) from USDC to cbBTC on Base chain. It's non-custodial, simple to use, and supports Farcaster Frame / Base Mini App experience.

## ✨ Features

- **One-click wallet connection** (RainbowKit + wagmi) with automatic USDC balance reading
- **Configure DCA plans**: Set amount per trade, frequency, and duration; create/cancel plans
- **Transaction history**: View plan execution records and transaction history
- **Leaderboard**: See rankings with shortened address display
- **Share functionality**: Share results with site links; social platforms will fetch OG preview images
- **EIP-1271 compatible**: Smart wallet signature verification support

## 🚀 Quick Start

1. Open the app: [https://base-piggy-bank.vercel.app](https://base-piggy-bank.vercel.app)
2. Connect your wallet (recommended: Base Mainnet) and ensure you have USDC
3. Configure amount per trade, frequency, and duration, then click **"Start DCA"**
4. View or cancel plans in the **"Assets"** tab; check rankings in the **"Rank"** tab

## 🌐 Supported Networks

- **Base Mainnet** (Chain ID: 8453)
  - If not on Base, you'll be prompted and can switch with one click

## 🔒 Security & Signatures

- All create/cancel operations require signatures
- Signatures include nonce and 5-minute expiration; backend performs replay attack prevention
- Backend uses Supabase to record plans and execution logs
- Service Role key is only used server-side; never exposed to frontend

## 📱 Frame / Mini App

- **Frame post_url**: `/api/frame` (provides Launch button)
- **Preview image**: `/og-image.png`
- **Mini App manifest**: `/miniapp.json`
- **Signature file**: `/miniapp.sig` (must match manifest domain and paths)

## 🛠️ Development & Deployment

### Environment Variables

```env
NEXT_PUBLIC_APP_URL=https://base-piggy-bank.vercel.app
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
MOCK_DATA_SECRET=your_secret_for_mock_data_generation
```

### Installation

```bash
npm install
```

### Local Development

```bash
npm run dev
```

### Production Deployment

Deploy to Vercel or any platform that supports Next.js.

## 📦 Assets

- **App icons**: `/icon-192.png`, `/icon-512.png`
- **Preview image**: `/og-image.png`
- **PWA manifest**: `/manifest.json`

## ❓ FAQ

**Q: Not seeing preview cards when sharing?**  
A: Ensure your domain is crawlable and OG/Frame meta tags are aligned with your production domain.

**Q: Smart wallet signature failing?**  
A: Backend uses `viem.verifyMessage` with EIP-1271 support. If it still fails, check if your wallet is on Base Mainnet.

**Q: Replay attack protection?**  
A: Signatures include nonce + expiration time. Backend stores nonces to prevent reuse.

## 📄 License

See [LICENSE](LICENSE) file for details.
>>>>>>> 5cd363bb994f0fd88d630a5340afb06e48edefab
