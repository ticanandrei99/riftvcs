# RiftVoice notices

RiftVoice is a modified derivative of LoLProxChat by danthi123 and its contributors.
Upstream: https://github.com/danthi123/LoLProxChat
Original copyright, attribution and license notices are retained.
Project license: GNU Affero General Public License, version 3 or later
(SPDX: AGPL-3.0-or-later). See LICENSE for the complete terms.

## Current RiftVoice modifications

Modification notice updated: 2026-11-06.

- Manual Natural and Robotic voice options using local audio processing.
- Isolated Caster Mode, organizer grants and server-filtered nearby enemy camera voice.
- Enemy media gateway uses werift 0.26.0 (MIT); see docs/third-party/werift-LICENSE.txt.
- Enemy visibility is client-reported minimap recognition, not trusted Riot visibility attestation.
- Local processed-microphone preview, with an automatic 30-second stop.
- Nearby voice by default, with optional camera listening and team modes restored.
- In nearby mode, playback is muted when the listener's position cannot be established or the
  required proximity checks cannot be completed.
- Champion- and skin-dependent voice selection has been removed from the
  current user interface. Minimap tracking remains for proximity estimation.
- TURN-only audio connections, without automatic fallback to direct peer
  connections. Server and relay operators can still see connection metadata,
  including connection IP addresses.
- Configurable voice server, with the RiftVoice Render service as the default,
  and server support for ExpressTURN credentials supplied through environment
  variables.
- Simplified English/Romanian interface, black-and-red theme, Rift-style header
  symbol, microphone application icon, taskbar minimization and full exit.
- Clear connection-status messages, Windows executable/installer packaging,
  source archives and SHA-256 checksums. The upstream binary updater is disabled.
- Optional camera modes, resets and diagnostics; connection quality metrics and
  an allow-listed diagnostic summary without player names, IPs or credentials.
- Startup-only checks of RiftVoice GitHub releases, with a visible update notice
  and a link to the official installer. Installation remains user initiated.

## Source and third-party components

Redistribution and remote network use are subject to the requirements in LICENSE.
Preserve the required notices and provide Corresponding Source and source access
as specified by the AGPL, including Section 13 where applicable.

Third-party components remain subject to their respective licenses.
League of Legends names, game assets and related trademarks belong to Riot Games
or their respective owners; the software license does not transfer rights to
those assets.

## Independence and limitations

RiftVoice is an independent community project. Riot Games does not endorse or
sponsor this project. No Riot approval, Vanguard compatibility certification or
guarantee against account penalties is claimed.

No official champion voice recordings or AI voice-conversion models are included.
The Natural/Robotic options use local signal processing, not official voice cloning.
Computer-vision proximity and visibility checks can be inaccurate and are not an
authoritative anti-cheat system.

The software's warranty and liability terms are those stated in LICENSE.
