# FC AI Standards V1.0.0

Status: stable release snapshot

This directory is the complete `v1.0.0` standard package. It can be given to another expert, developer, or AI system as the reference set for building compatible FC/NES AI operation strategy assets.

## Reading Order

1. `OPERATION_STRATEGY_STANDARD_V1.0.0.md`
   - Overall standard entry.
   - Defines the project-level idea of operation strategy, strategy categories, evidence, runtime usage, and acceptance boundaries.

2. `STRATEGY_PROTOCOL_CORE_V1.0.0.md`
   - Runtime protocol.
   - Defines semantic state, condition registry, action mapping, safety override, intent fusion, RNG metadata, and runtime API boundaries.

3. `STRATEGY_PACK_STANDARD_V1.0.0.md`
   - Strategy Pack product standard.
   - Defines how an external expert system must package files, ROM compatibility, strategy fragments, training data ledgers, battle results, README usage notes, validation evidence, and distribution metadata.
   - This is the key file for anyone who wants to generate a Strategy Pack usable by our system.

4. `STRATEGY_TRAINING_STANDARD_V1.0.0.md`
   - Internal training operating manual.
   - Defines this project's preferred training workflow. External experts may use different methods, but their final package must still satisfy `STRATEGY_PACK_STANDARD_V1.0.0.md`.

5. `STANDARDIZED_OPERATION_MANUAL_V1.0.0.md`
   - Practical execution manual.
   - Defines how the standard should be applied during day-to-day development, testing, validation, and handoff.

## Compatibility Principle

A Strategy Pack is compatible with this standard release only when it can be checked against the `v1.0.0` files in this directory. The pack must not rely on private conversation context, local-only assumptions, or undocumented training workflows.

## Release Rule

Do not edit this directory silently after release. If the standard changes, create a new version directory and update `docs/standards/README.md`.
