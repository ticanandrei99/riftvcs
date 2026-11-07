# Voxdria — player 0.4.3, original engine

Windows voice for League of Legends community custom games. This player uses the **unchanged LoLProxChat 0.5.24 engine** supplied locally by the owner, with the Voxdria interface and authenticated invitation adapters. Upstream: [danthi123/LoLProxChat](https://github.com/danthi123/LoLProxChat). AGPL-3.0-or-later; see LICENSE and NOTICE.md.

**Experimental custom-game test build.** This is not Riot-approved software. Reverting to upstream does not establish Riot compliance or prove that a GPU crash is fixed. Windows installers are unsigned.

## Current behavior

- Red Voxdria player interface, RV invitation parsing, pregame registration and organizer approval.
- Game voice only during a detected game. No player lobby audio controller or lobby voice button.
- Original tracking, camera recognition, volume calculation, microphone, playback and WebRTC source, without edits.
- Upstream camera mode enabled by default. Original distance and camera options remain available.
- Original microphone mute, receive mute, individual ally/enemy mute, volume sliders and push-to-talk.
- Organizer-authorized sessions; separate player/Caster invitations and rooms; moderation revokes audio.
- Authenticated TURN configuration in production. Loopback ICE and synthetic microphones are test fixtures only.
- Player update notification and Discord community shortcut.

**Voxdria Caster stays at 0.4.2.** Use its existing installer. This branch delivers no new Caster installer. All players in an original-engine room need player 0.4.3 and server 0.4.3. The server continues to support the existing Caster protocol. Player 0.4.2 audio is in a separate legacy room.

Custom voice effects and the processed-microphone preview are hidden and inactive in this original-audio variant. Their historical code is not inserted into the active microphone path.

## Visibility and trust

The original camera engine recognizes icons drawn on the player's own minimap. No hidden game positions or automatic spectator feed are acquired. There is no injection, game-memory reading or Vanguard bypass.

Original audio is relayed through TURN between players, **not filtered by the legacy server media gateway**. A modified client can bypass its local receive filter. Camera recognition can fail or retain a recent observation; unavailable templates cause the original proximity fallback. Original server distance calculation is not an authoritative fog-of-war filter. This variant does not guarantee prevention of information leakage and is not an anti-cheat system.

Caster audio is isolated from active players. Caster permissions cannot query player volumes or enter player rooms. Spectator/stream delay remains the streamer's responsibility.

## Setup and source

Read [setup and test instructions in Romanian](docs/player-original.ro.md) and [current verification results](docs/verification-0.4.3.ro.md). Older feature/security documents describe legacy 0.4.2; this guide takes precedence for player 0.4.3.

The complete original reference is in `upstream/LoLProxChat/`. `upstream/SOURCE.json` records its 213 hashes. Runtime copies are in `src/upstream/`, `server/src/upstream/` and `src-tauri/src/player_original_capture.rs`. Adapters are in `src/player-original/` and `server/src/original-player.ts`. Webpack redirects only upstream network configuration and logging to authenticated Voxdria equivalents.

Frozen reference manifests are provenance material, not application dependencies. Install only at the repository root and in `server/`, using their maintained lockfiles; do not install the old reference lockfiles.

```powershell
npm ci
npm --prefix server ci
npm run verify:source
npm run typecheck
npm test -- --runInBand
npm run test:original -- --silent
npm --prefix server test -- --run
npm run test:original-player
npm run build:windows
```

Original CV tests: `npx jest --config jest.original.cv.config.js --runInBand`. Recording-dependent suites require real captures. Build only the Windows player from this branch; retain Caster 0.4.2.
