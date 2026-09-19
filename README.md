# Sasyathra — starter build (v0.2)

Real database (Supabase/Postgres), no fake data. Core loop: demand → farmer
pledge (with atomic over-pledge protection) → auto-confirm at 100% matched →
cooperative schedules milling at an *existing* processing partner → delivered.

**New in this version: the advance-payment mechanism.** This is the direct
answer to "why wouldn't a farmer just sell raw paddy to the local mill
today instead of waiting" — the moment a pledge is accepted, the farmer's
advance (default 70% of that pledge's value) shows as available immediately
in their earnings ledger. The remaining balance releases once the order is
marked delivered. See `computeEarnings()` in `src/lib/sasyathraData.js` —
it's the single source of truth for this math; every screen reads from it
rather than recomputing it.

## Day 1 setup

1. Create a free project at https://supabase.com
2. Open **SQL Editor > New query**, paste `sql/schema.sql`, run it.
   - If you already had a version of this schema running, the `alter table`
     lines near the top add the new `price_per_kg` / `advance_percent`
     columns without touching existing rows.
3. **Project Settings > API** → copy your Project URL and `anon public` key.
4. `cp .env.example .env` and fill in those two values.

## Running locally

```
npm install
npm run dev
```

## Try the full loop, including the advance payment

1. As **Buyer**, post a demand — this time you'll also set an **expected
   price per kg**. That price drives every earnings number downstream.
2. Switch to **Farmer**, pledge quantity. Check the "Your earnings" panel —
   you'll immediately see an advance amount marked "available now," even
   though nothing has been processed or delivered yet.
3. Pledge the rest to fully match the demand, switch to **Cooperative**,
   schedule it at one of the existing processing partners, then mark it
   delivered.
4. Switch back to **Farmer** — the balance for that contribution now shows
   as released instead of pending.

This is the mechanism to walk a judge through live if they ask the "why
would a farmer bother" question: point at the ledger updating from "pending"
to "available now" the moment a pledge is accepted, before any processing
has happened.

## Deploying

Push to GitHub → import into Vercel → add the two env vars in project
settings → deploy.

## Deliberate simplifications (say so if asked, don't hide it)

- **No real payment rail** — the advance/balance split is calculated and
  displayed, not actually disbursed. That's the correct hackathon scope;
  wiring a real payment gateway is a post-hackathon step, not a demo
  requirement.
- **No auth / RLS is permissive** — anyone can act as any role for the demo.
- **Processing partners are seeded, not onboarded** — presented as *existing*
  FPO/CHC-registered mills Sasyathra schedules against, not infrastructure
  Sasyathra built. Keep that framing consistent in your pitch.
- **Verification-status tagging (declared / cooperative-confirmed / lab-tested)
  for the traceability QR screen is not yet built** — it's the next logical
  addition once produce lots exist as their own entity.
