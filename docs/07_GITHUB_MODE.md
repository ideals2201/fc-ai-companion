# GitHub Mode

## Repository Rules

- `main` is the stable branch.
- Feature work should happen in task branches.
- Every meaningful change should update either the task board, decision log, or a test.
- Historical reference folders stay outside this repository.
- ROMs and local assets are never committed.

## Recommended Branch Names

```text
feature/worldx-route-v0
feature/danger-detector-v0
feature/action-lock-v0
feature/fsm-v0
docs/project-baseline
```

## Commit Message Style

```text
docs: establish project baseline
policy: add worldx state derivation
policy: add danger detector v0
tests: cover action lock transitions
```

## PR Gate

Before merge:

- no ROMs or local files committed
- no fast-brain LLM dependency
- no screenshot/OCR main-route logic
- tests or verification notes added
- decision log updated for route/model/compliance changes

