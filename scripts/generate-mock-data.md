# ⚠️ COLD START HACK - Mock Data Generator

**This is a temporary growth strategy script. Remove after cold start success.**

## Purpose
Generate realistic-looking mock accounts for leaderboard to create social proof during cold start phase.

## Usage

### Method 1: Direct API Call (Recommended)
```bash
curl -X POST https://base-piggy-bank.vercel.app/api/generate-mock-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -d '{"count": 50, "secret": "YOUR_SECRET_KEY"}'
```

### Method 2: Environment Variable
Set `MOCK_DATA_SECRET` in your environment variables, then call:
```bash
curl -X POST https://base-piggy-bank.vercel.app/api/generate-mock-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MOCK_DATA_SECRET" \
  -d '{"count": 50}'
```

## Features
- Generates realistic Ethereum addresses (not obviously random)
- Natural transaction timing with small random offsets
- Realistic success/failure rates (95% success, with failure streaks)
- Each account total invested ≤ 20,000 USDC
- Silent operation (no console logs in production)
- Preserves real user data

## Cleanup After Cold Start
1. Delete `app/api/generate-mock-data/route.ts`
2. Delete this file (`scripts/generate-mock-data.md`)
3. Remove `MOCK_DATA_SECRET` from environment variables
4. Optionally clean up mock data from database:
   ```sql
   -- Identify mock accounts (addresses starting with 0x1-0xe, not 0x0 or 0xf)
   -- Then delete from dca_jobs, dca_transactions, leaderboard
   ```

