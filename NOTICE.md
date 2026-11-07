# Voxdria notices

Voxdria is a modified derivative of LoLProxChat by danthi123 and its contributors.
It was previously distributed as RiftVoice through version 0.4.0; the public
product names from 0.4.1 are Voxdria and Voxdria Caster. Historical notices remain.
Upstream: https://github.com/danthi123/LoLProxChat
Original copyright, attribution and license notices are retained.
Project license: GNU Affero General Public License, version 3 or later
(SPDX: AGPL-3.0-or-later). See LICENSE for the complete terms.

## Current Voxdria modifications

Modification notice updated: 2026-11-07.

- Manual Natural and Robotic voice options using local audio processing.
- Isolated Caster Mode, organizer grants and server-filtered nearby enemy camera voice.
- Password-protected administration, named moderator accounts, ten-player pregame check-in, team planning and isolated staff credentials.
- Approved, team-isolated lobby audio, explicit invitation/approval status and teardown on game admission.
- Readable Caster desktop theme, independent incoming-stream mix gate and fixed Discord destination shortcuts without account or audio integration.
- Server-revoked moderation voice suspension, administrator protection and a bounded private named audit trail; check-ins do not authenticate Riot accounts.
- Enemy media gateway uses werift 0.26.0 (MIT); see docs/third-party/werift-LICENSE.txt.
- Enemy visibility is client-reported minimap recognition, not trusted Riot visibility attestation.
- Local processed-microphone preview, with an automatic 30-second stop.
- Nearby voice by default, with optional camera listening and team modes restored.
- Visible nearby enemy proximity is standard in 0.4.1, with server media enforcement;
  an explicit operator suspension and personal listening controls remain available.
- In nearby mode, playback is muted when the listener's position cannot be established or the
  required proximity checks cannot be completed.
- Champion- and skin-dependent voice selection has been removed from the
  current user interface. Minimap tracking remains for proximity estimation.
- TURN-only audio connections, without automatic fallback to direct peer
  connections. Server and relay operators can still see connection metadata,
  including connection IP addresses.
- Configurable voice server, with the Voxdria Render service as the default,
  and server support for ExpressTURN credentials supplied through environment
  variables.
- Simplified English/Romanian interface, black-and-red theme, Voxdria V header
  symbol, microphone application icon, taskbar minimization and full exit.
- Clear connection-status messages, Windows executable/installer packaging,
  source archives and SHA-256 checksums. The upstream binary updater is disabled.
- Optional camera modes, resets and diagnostics; connection quality metrics and
  an allow-listed diagnostic summary without player names, IPs or credentials.
- Startup-only checks of Voxdria GitHub releases, with a visible update notice
  and a link to the official installer. Installation remains user initiated.

## Source and third-party components

Redistribution and remote network use are subject to the requirements in LICENSE.
Preserve the required notices and provide Corresponding Source and source access
as specified by the AGPL, including Section 13 where applicable.

Third-party components remain subject to their respective licenses.
The development tools include a locally patched copy of deepmerge 4.3.1,
Copyright (c) James Halliday, Josh Duff and other contributors, under the MIT
license. Its original notice and license are in vendor/deepmerge/LICENSE;
the local security change is described in vendor/deepmerge/README.md.
League of Legends names, game assets and related trademarks belong to Riot Games
or their respective owners; the software license does not transfer rights to
those assets.

## Independence and limitations

Voxdria is an independent community project. Riot Games does not endorse or
sponsor this project. No Riot approval, Vanguard compatibility certification or
guarantee against account penalties is claimed.

No official champion voice recordings or AI voice-conversion models are included.
The Natural/Robotic options use local signal processing, not official voice cloning.
Computer-vision proximity and visibility checks can be inaccurate and are not an
authoritative anti-cheat system.

The software's warranty and liability terms are those stated in LICENSE.
