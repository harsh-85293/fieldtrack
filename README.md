# Vera — Message Engine

A deterministic message composition engine for merchant growth. Built for the magicpin AI Challenge.

## What Vera Does

Vera is an AI assistant that helps merchants improve listings, run campaigns, and reply faster. The core is a deterministic `compose(category, merchant, trigger, customer?)` function that returns:

- **message** — the next message to send
- **cta** — a single clear call-to-action
- **send_as** — the identity Vera sends as
- **suppression_key** — deduplication key to prevent repeat sends
- **rationale** — why this message was chosen

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/healthz` | GET | Health check with live stats |
| `/v1/metadata` | GET | Engine name, version, capabilities, categories, triggers |
| `/v1/context` | POST | Push merchant or customer context (idempotent by scope + version) |
| `/v1/tick` | POST | Process pending triggers and compose actions |
| `/v1/reply` | POST | Handle merchant replies and generate follow-ups |
| `/v1/trigger` | POST | Inject a trigger for testing |
| `/v1/merchants` | GET | List all tracked merchants |
| `/v1/actions/:id` | GET | Get actions and conversation for a merchant |
| `/v1/context/:id` | GET | Get stored context by ID |

## Categories

Five business verticals, each with tailored tone, offer patterns, and seasonal moments:

- **Dentists** — clinical-professional, appointment-focused
- **Salons** — visual-lifestyle, booking-focused
- **Restaurants** — timely-appetite-driven, order-focused
- **Gyms** — motivational-community, session-focused
- **Pharmacies** — utility-trust-first, service-focused

## Triggers

- **recall** — bring back inactive customers using days-since + last service + offers
- **spike** — capture demand surges using search volume + trend + active offers
- **dip** — recover from performance drops with counter-offers
- **research** — surface untapped opportunities with search volume + competitor gaps
- **festival** — seasonal campaigns timed to festivals with active searches

## How It Works

1. **Push context** — `POST /v1/context` with merchant identity, performance metrics, offers, and conversation history
2. **Inject triggers** — `POST /v1/trigger` with the signal (recall, spike, dip, research, festival)
3. **Run a tick** — `POST /v1/tick` processes pending triggers and composes messages
4. **Handle replies** — `POST /v1/reply` lets merchants approve, reject, or free-form respond

The compose function is fully deterministic — the same inputs always produce the same output.

## Running Locally

```bash
npm install
npm run dev
```

The app runs on http://localhost:5173. The API is served by the Vite dev server middleware — no separate backend needed.

## Architecture

```
src/vera/
├── types.ts       # All TypeScript interfaces
├── store.ts       # In-memory state (merchants, customers, triggers, actions)
├── categories.ts  # Category configs (tone, offers, seasonal moments)
├── triggers.ts    # Trigger strategies (recall, spike, dip, research, festival)
├── compose.ts     # Core compose() function
├── api.ts         # API handler (browser-side)
└── node-api.ts    # API handler (Vite dev server middleware)
```

## Design Principles

- **Deterministic** — same input always yields same output
- **Grounded** — every message uses real numbers, offers, and dates from context
- **One CTA** — each message has exactly one clear next action
- **Category-fit** — tone and vocabulary match the business type
- **No fake claims** — only references data present in the context
