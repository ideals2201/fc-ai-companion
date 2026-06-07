# Contra Strategy Pack Implementation Notes

This directory is the standard source of truth for `gameProfileId = contra`.

The browser cockpit can keep legacy route JSON files for runtime compatibility, but those files must be generated from this pack and must include `generatedFrom` plus `sourceVersion`.

Current migration scope:

- Build Protocol 1.0.0 pack structure.
- Preserve existing browser route loading behavior.
- Keep the pack at `candidate` status until real trace evidence validates a mode.

