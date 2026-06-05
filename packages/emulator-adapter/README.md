# Emulator Adapter

Adapter layer between browser emulator runtime and policy core.

Responsibilities:

- read RAM
- expose normalized state
- write controller input
- step one frame

The policy core should not depend directly on a specific emulator implementation.

