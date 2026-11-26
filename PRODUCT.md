# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

JEE aspirants and their parents during JoSAA and CSAB counselling. They usually have a rank, category, gender and home state in hand, and need to compare many college and branch combinations under time pressure. They often work in a browser tab next to the official JoSAA portal, on a laptop at home or on a phone.

## Product Purpose

Deebo's College filters official JoSAA cutoffs by rank, category and home state, ranks the eligible branches with a hybrid of embedding similarity and structured signals, and explains why each option fits. Success is a short, trustworthy choice list a student can act on.

## Positioning

The product combines cutoff eligibility, campus and placement fit, and an LLM explanation in one flow, then exports a JoSAA-ready choice list. It is not just a rank-to-college lookup table.

## Operating Context

A search is a one-off session: enter rank, category, gender, home state, optional JEE Advanced rank, and free-text preferences; answer a short follow-up interview; scan the ranked index; refine the preferences; export a CSV. The current dataset covers 79 IITs, NITs and IIITs, with 2024 and 2025 cutoff rounds.

## Capabilities and Constraints

- FastAPI backend, React and Vite frontend, PostgreSQL or SQLite, Qdrant, Gemini or an OpenAI-compatible LLM.
- Existing endpoints and response shapes must keep working: `/generate-questions`, `/recommend`, `/export-choices`, `/statistics`, `/colleges`, `/branches`.
- There are no accounts or sign-in. Everything works anonymously.
- Some cutoff and campus fields are missing or incomplete. The interface must show missing data honestly.
- The design is dark only, by explicit user choice.
- The visual direction is pinned to the pi.dev editorial and terminal language, adapted to an Operate surface.

## Brand Commitments

- Name: Deebo's College.
- The existing course-project identity stays, with the new name applied everywhere.
- The user explicitly pinned the visual reference: `https://pi.dev/`, dark only, for every screen.

## Evidence on Hand

- `data/structured_json`: 79 college records.
- `data/source/josaa`: raw JoSAA 2024 round 5 dumps.
- Live API returns recommendations, explanations, questions, search statistics, colleges and branches.
- Real cutoff data. Do not invent testimonials, customer logos, usage metrics, placement claims, or pricing.

## Product Principles

- Eligibility first: the rank and category answer must be legible before any AI prose.
- Show the evidence: closing rank, placement, CTC, NIRF and campus signals.
- One continuous flow: profile, interview, index, export.
- Calm density: many options, but a clear scan path.
- Honest limits: say when data is missing.

## Accessibility & Inclusion

Keyboard-complete, visible focus, body text at 4.5:1 contrast, no color-only meaning, reduced-motion support, and a layout that holds at 360px.
