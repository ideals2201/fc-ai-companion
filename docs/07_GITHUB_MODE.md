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

## Version Guidance

PM Control Console must actively recommend version actions when the project reaches a meaningful checkpoint.

Recommendation types:

- Save checkpoint: recommend a commit when a coherent task is complete, tests/build pass, or a decision boundary changes.
- Upgrade version: recommend a version bump, tag, or release only when a project milestone is actually reached.

Execution boundary:

- PM may create ordinary task commits after verification.
- PM may recommend a merge, tag, release, or version bump.
- The project owner must approve merges to `main`, tag creation, release publication, version-number changes, pushes to GitHub, branch deletion, or history rewriting.

Current default:

- Feature branches are working checkpoints.
- `main` is stable.
- Tags are milestone markers, not routine save points.

## PR Gate

Before merge:

- no ROMs or local files committed
- no fast-brain LLM dependency
- no screenshot/OCR main-route logic
- tests or verification notes added
- decision log updated for route/model/compliance changes
