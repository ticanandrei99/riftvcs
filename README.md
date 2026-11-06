# RiftVoice

Windows proximity voice for League of Legends, based on **LoLProxChat** by danthi123 and its contributors, with RiftVoice modifications.

## Download

Download the Windows setup from [Releases](https://github.com/ticanandrei99/riftvcs/releases). Releases include the corresponding complete source, license, notices and SHA-256 checksums.

Community test build. RiftVoice has not been reviewed or endorsed by Riot Games. No guarantee of compatibility with Vanguard or protection from account penalties is made. The Windows binaries are currently unsigned.

## Current features

- Organizer-invited custom rooms with server-assigned identities and teams.
- Team voice and ally proximity; optional nearby enemy voice when visibly identified inside your camera, delivered through a server media gateway.
- Isolated Caster Mode with receive-only spectator role, OBS mix and individual mute controls.
- Optional camera listening, team settings and position recalibration.
- Manual Natural and Robotic voice effects; local processed-microphone preview.
- Muting your microphone or all voices also stops the local preview. Unmuting does not restart it.
- TURN-only WebRTC audio; connection status and quality information.
- Diagnostic summary that excludes player names, IP addresses and credentials.
- English/Romanian interface, black-and-red theme, minimize and close controls.
- Update checks at application startup, with a notice and link to the official installer. Installation is initiated by the player.

Proximity relies on minimap tracking and may be inaccurate. Champion/skin-based voice selection is not part of the current interface. Effects use local signal processing, not official champion recordings or AI voice cloning.

## Getting started / Pornire

Requires Windows x64, WebView2, a microphone and access to the shared voice server. Players need their own organizer invitation and must be in the same custom match; casters use a separate audio channel. Headphones are recommended for the local preview.

Instalează setup-ul, deschide RiftVoice și verifică microfonul. Serverul implicit este `https://riftvoice-server.onrender.com`. Introdu invitația organizatorului în Setări. Serverul trebuie actualizat pentru autentificare și separarea echipelor. Modul implicit redă coechipierii din apropiere. Opțiunile de cameră sunt facultative. Testul local se oprește după 30 de secunde; apelul cu ceilalți jucători nu are această limită.

## Source and build

Client: `src/` and `src-tauri/`. Server: `server/`. Deployment: `render.yaml`, with Render root directory `server`.

Windows build requires Node 22.12+, the Rust MSVC toolchain specified in `rust-toolchain.toml`, Visual Studio C++ Build Tools, Windows SDK and WebView2.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-windows.ps1
```

The script installs locked dependencies, runs checks/tests and builds the Windows executable and NSIS installer. Outputs, corresponding source and checksums are in `artifacts/`.

See [enemy camera voice and its limits](docs/enemy-camera.ro.md), [security review](docs/security-review.ro.md), [Caster Mode and OBS](docs/caster-mode.ro.md), [operation and validation](docs/RIFTVOICE.md), [Render setup](docs/RENDER.ro.md) and [publishing updates](docs/UPDATES.ro.md).

Enemy voice needs 0.2.0 on both clients, organizer invitations and ENEMY_CAMERA_VOICE=1 on the updated server with working TURN. The existing public server was not deployed in this session. Visibility is client-reported, not Riot attestation; a modified client can fabricate reports. The trusted media server terminates enemy audio encryption. Read the linked limits before event use.

## Privacy

Audio connections require an authenticated TURN relay. Direct peer connections are disabled. This avoids exposing direct peer connection addresses through the normal client connection; server and TURN operators can still see connection metadata, including IP addresses. This is not an anonymity guarantee.

Configure TURN credentials only in the server environment. Never commit `.env`, API tokens, passwords or signing keys.

## Attribution and license

Source base: [LoLProxChat](https://github.com/danthi123/LoLProxChat), modified by RiftVoice. Original notices and license are retained. See [NOTICE.md](NOTICE.md) and [LICENSE](LICENSE), **AGPL-3.0-or-later**. Third-party components retain their respective licenses.

League of Legends names, artwork and related data belong to their respective owners. RiftVoice is not endorsed by Riot Games. Approval claims in historical upstream documentation do not establish approval for RiftVoice.

RiftVoice isn’t endorsed by Riot Games and doesn’t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
