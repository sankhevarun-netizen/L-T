# KPMG DICE — Customer Journey Command Center

An AI-powered customer intelligence platform, built as a front-end POC for a
pitch. **DICE** (*Digital Infrastructure & Customer Experience*) is positioned as
the intelligence and orchestration layer that sits **on top of** a client's
existing Salesforce CRM and Agentforce — not a replacement for either.

The demo client is a fictional Mumbai real-estate developer, **Meridian
Developers**. Nothing here is tied to a real account.

> **One AI brain. Every customer interaction. Every journey.**

---

## Running it

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. No API key, no backend, no database — the app
runs entirely on a deterministic in-memory dataset and a mock AI service.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |

> **Note on this folder's name:** the `&` in `L&T` breaks npm's `.bin` shims on
> Windows, so `npx <anything>` fails from here. The `npm run` scripts call
> `node ./node_modules/...` directly and work fine. Moving the project to a path
> without `&` removes the limitation entirely.

---

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · shadcn/ui on
Radix · Recharts · lucide-react · Zustand.

```
src/
  app/               routes (App Router) + /api/ai server route
  components/        UI, grouped by feature area
  config/            brand tokens, navigation
  data/              seed dataset — reference data, generator, featured profiles
  lib/
    agents/          agent framework + the 11 agents
    ai/              AI service abstraction (mock + live Anthropic)
    copilot/         intent routing for the three copilots
    crm/             simulated Salesforce facade
    personas/        persona mapping engine
    selectors/       computed metrics (overview, pipeline, team)
    transcript/      live-call analysis + trigger engine
  store/             Zustand stores (CRM, UI, settings)
```

---

## The demo script

Roughly ten minutes, in order. The **Demo** menu above the page header jumps
straight to each beat and can reset the dataset between runs.

1. **Overview** (`/`) — the Command Center. 12,842 leads, ₹1,245 Cr booked,
   ₹100 Cr at risk. Every figure is computed from the dataset, not typed into a
   card.

2. **Run an agent** (`/ai-insights`) — 11 agents grouped by KPMG AI archetype.
   Hit **Run all agents**, then **Apply** on the *AI Lead Validation Agent*. The
   activity feed on the right fills with real Salesforce writes showing
   field-level before → after.

3. **Watch the CRM change** — back on the Overview, Revenue at Risk has dropped.
   *DICE just found pipeline that wasn't real.*

4. **Play a live transcript** (`/live-transcript`) — pick **Vikas Deshmukh —
   opt-out request**, set 4×, press Play. Intent, sentiment and
   entities update line by line; two agents fire mid-call and write to
   Salesforce before the call ends.

5. **Open Customer 360** — from the call summary, click through to the lead. His
   status now reads **Do Not Contact** with a **Cold Intent** badge, written
   live by the call. The **CRM Sync** tab shows the Agentforce-vs-DICE split.

6. **Show persona mapping** (`/persona-mapping`) — all 12,022 open leads bucketed
   across six buyer personas. Click **Priya Shah** to see the exact signals that
   mapped her to *Upgrade / Trade-Up Buyer*.

7. **Manager pipeline truth** (`/pipeline-dashboard`) — stage velocity, weighted
   value, and where deals are stalling, filterable by micro-market, campaign,
   owner and persona. Then `/risk-alerts` to assign a rescue task in one click.

8. **The architecture** (`/platform`) — sources → EAI → sanitization → Salesforce
   + Agentforce → DICE intelligence → experience layer, plus the
   Agentforce-alone-vs-DICE comparison and the KPMG archetype framework.

A good closing line for step 8: *the CRM was never the problem — nothing was
turning what customers actually did into something the CRM could act on.*

---

## How the data works

There is no backend. The entire dataset is generated at runtime by a seeded
PRNG in [`src/data/generator.ts`](src/data/generator.ts).

- **12,842 leads** across nine campaigns and twelve Mumbai/MMR micro-markets,
  emitted against exact per-campaign funnel targets so every derived figure
  (4,652 qualified → 842 site visits → 326 bookings → 246 closed won) falls out
  of the data rather than being written into a card.
- **Nine hand-authored profiles** — Priya Shah and the rest — carry full
  journeys, engagement histories and call transcripts. They are the records a
  presenter actually opens.
- **Deterministic.** A fixed seed plus a pinned demo clock (`DEMO_NOW`,
  31 May 2026) means the server and the browser generate byte-identical data,
  and every run of the demo shows the same numbers.

Writes go through a simulated Salesforce facade
([`src/lib/crm/`](src/lib/crm/)) that mirrors Lead, Contact, Opportunity, Task
and Activity operations, so an agent, a copilot and the transcript engine all
write through one seam and show up everywhere at once.

---

## Enabling live AI

The app ships on a **mock AI service** that derives believable, varied output
from the lead data — no key required, and the demo never depends on a network
call.

To use Claude for real:

1. Create `.env.local` in the project root:

   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. Restart `npm run dev`.

3. Open the **Demo** menu → **AI mode** → **Live**.

The key is read **server-side only**, by the route at
[`src/app/api/ai/route.ts`](src/app/api/ai/route.ts) — it is never exposed to
the browser and there is no `NEXT_PUBLIC_` variable involved. The route calls
`claude-opus-5` through the official `@anthropic-ai/sdk`, using structured
outputs so each typed task (sentiment, summary, next best action, coaching,
message drafting) returns schema-valid JSON.

Both implementations satisfy the same `AIService` interface, so **every feature
behaves identically in either mode**. If the key is missing, the toggle disables
itself and says so; if a live call fails for any reason, that individual call
falls back to the mock rather than breaking the page.

---

## What's simulated

Worth being straight about in the room:

- No backend, database, or real Salesforce org — the CRM is an in-memory
  simulation with Salesforce-shaped objects.
- The dataset is synthetic and deterministic; "Meridian Developers" is fictional.
- Month-on-month deltas and the five historical points on the conversion trend
  are stored rollups. Historical conversion cannot be recomputed from a
  current-state snapshot — a lead only carries the stage it is in today. The
  latest point on that chart *is* computed live.
- Agent detection is deterministic rule logic; the AI service supplies the
  narrative layer on top. That is deliberate — it means the same demo produces
  the same findings every time.
