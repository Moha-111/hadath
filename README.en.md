<p align="center"><img src="docs/assets/readme-banner.png" alt="HADATH — Shared readiness. Unified operations. Resilient response." width="100%"></p>

<p align="center">
  <a href="LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-0f5257"></a>
  <a href="https://github.com/Moha-111/hadath/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Moha-111/hadath/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="Synthetic data only" src="https://img.shields.io/badge/data-synthetic%20only-ffd166">
  <img alt="Status: research prototype" src="https://img.shields.io/badge/status-research%20prototype-c98a12">
</p>

# HADATH | حدث

**Shared readiness. Unified operations. Resilient response.**

> The citizen is a partner, a responder according to their qualification, and committed to official directives.

**[Try the live demo](https://moha-111.github.io/hadath/)** · [README بالعربية](README.md)

> [!WARNING]
> **Research and simulation prototype only — NOT an approved system for use in real emergencies.**
> All data, organisations, people and the facility are synthetic and fictional. The project claims no partnership with, or endorsement by, any government or commercial body.

## What is HADATH?

An open-source prototype exploring one question: **how can agency readiness, private-sector capabilities and citizen participation come together in one integrated response?**

Everyone works on **one unified incident file** — current situation, objectives, command, participating organisations, tasks, resources, decisions, support requests, update log and recovery — while each organisation keeps its own mandate and permissions, and each role sees only what it needs.

| Role | What you can try |
|---|---|
| Incident manager | Verify a report and create the file, set objectives and permitted work zones, assign tasks and tools, approve support requests, approve gap-engine alternatives, publish directives, run recovery |
| Readiness officer | Equipment checks with last-verified dates, personnel qualifications, plans and exercises, open gaps |
| Private partner | Register capabilities (transport, logistics, care, comms) with availability conditions, update readiness, accept activations, track fulfilment |
| Qualified responder | Demo badge with training and certification, opt-in availability, accept / update / deliver a task, report a fault |
| Citizen | Simulated official instructions in three languages, simple report, training and exercises, compliance & privacy guidance — no sensitive operational detail |

Also included: a **synthetic schematic map** of AEDs, trauma kits and bleeding-control kits; **"Event Eye"**, a clearly-labelled synthetic visual source (no real connection of any kind); the **Readiness & Response Gap Engine** with transparent rules; and an explicit **connection-lost state**.

## Run it

Requires Node.js 20+. No paid services, external keys or network access needed after install.

```bash
npm ci            # install dependencies
npm run dev       # start the app at http://localhost:5173
npm test          # run the test suite
npm run build     # production build into dist/
npm run scenario  # replay the scenario headlessly and print indicators (add -- --en for English)
```

**5-minute tour:** open the app, open the "Scenario player" at the bottom, run the steps one by one and switch role tabs to see the same incident from each role — or perform each step yourself with the buttons. Toggle Arabic/English at the top. Append `#role=manager&lang=en` to the URL to deep-link.

## The synthetic scenario

A fictional multi-casualty incident: **partial collapse of a temporary stand** during a community event at the fictional "Oasis Events Complex". It re-enacts no real event and uses no victim data or real site plans. Seven phases: before → start → operations → integration → resilience (trauma kit failure with alternative, and connectivity loss) → citizen participation → recovery. It is deterministic. See [docs/SCENARIO.md](docs/SCENARIO.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) · [Data model](docs/DATA_MODEL.md) · [Permissions](docs/PERMISSIONS.md)
- [Gap engine](docs/GAP_ENGINE.md) · [Scenario](docs/SCENARIO.md)
- [Implemented vs simulated vs proposed](docs/STATUS.md)
- [Future integrations (incl. Tawakkalna)](docs/INTEGRATIONS_FUTURE.md)
- [Simulation video: how to reproduce](recordings/README.md)

## Safeguards

- Synthetic data only; no secrets or access keys in the repository.
- The system never auto-assigns anyone into a hazard zone, and never assigns community responders to the hot zone. Every assignment is a human decision.
- No automated treatment decisions.
- The gap engine is written, explainable rules — **not a learned predictive model** — and executes no alternative without the incident manager's approval.
- Indicators are computed from the simulation log only and are not real or clinical outcomes.

## Contributing

Developers, designers, practitioners and researchers are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for ready-to-pick tasks per group. We are specifically looking for: **operations-scenario review, technical integrations, and scientific performance-evaluation design.**

See also: [Code of Conduct](CODE_OF_CONDUCT.md) · [Security policy](SECURITY.md)

## License

Original code is licensed under the [Apache License 2.0](LICENSE). Dependencies keep their own licenses: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md). Bundled fonts (IBM Plex Sans Arabic, Noto Sans Arabic) are under the SIL Open Font License 1.1.
