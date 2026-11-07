# Voxdria

Windows proximity voice for League of Legends, based on **LoLProxChat** by danthi123 and its contributors, with Voxdria modifications.

## Download

Download the Windows setup from [Releases](https://github.com/ticanandrei99/riftvcs/releases). Releases include the corresponding complete source, license, notices and SHA-256 checksums.

Community test build. Voxdria has not been reviewed or endorsed by Riot Games. No guarantee of compatibility with Vanguard or protection from account penalties is made. The Windows binaries are currently unsigned.

## Current features

- Organizer-invited custom rooms with server-assigned identities and teams.
- Password-protected organizer panel, named moderators, a shared 10-player voice invitation and pregame check-in with a claimed Riot ID.
- Pregame team moves/swaps, live attendance, moderation voice suspension, protected administrator voice and a private named audit trail.
- Approved, team-isolated lobby voice before the match, with automatic teardown when the event binds to a game.
- Proximity as the standard player mode: nearby allies and visibly identified nearby enemies inside your camera; enemy audio is enforced by a server media gateway.
- Isolated Caster Mode with receive-only spectator role, OBS mix and individual mute controls.
- Optional camera listening, team settings and position recalibration.
- Manual Natural and Robotic voice effects; local processed-microphone preview.
- Muting your microphone or all voices also stops the local preview. Unmuting does not restart it.
- TURN-only WebRTC audio; connection status and quality information.
- Diagnostic summary that excludes player names, IP addresses and credentials.
- Incoming-voice mute for the local stream mix, independent of microphone transmission; it also mutes local playback.
- Fixed Discord community shortcut and a private Streamer-channel shortcut in Caster; Discord controls access and audio separately.
- English/Romanian interface, black-and-red theme, minimize and close controls.
- Update checks at application startup, with a notice and link to the official installer. Installation is initiated by the player.

Proximity relies on minimap tracking and may be inaccurate. Champion/skin-based voice selection is not part of the current interface. Effects use local signal processing, not official champion recordings or AI voice cloning.

## Getting started / Pornire

Requires Windows x64, WebView2, a microphone and access to the shared voice server. Players need their own organizer invitation and must be in the same custom match; casters use a separate audio channel. Headphones are recommended for the local preview.

Instalează setup-ul, deschide Voxdria și verifică microfonul. Serverul implicit este `https://riftvoice-server.onrender.com`. În panoul Conectare, lipește codul RV- sau invitația completă din Caster, completează Riot ID-ul și apasă Conectează cu invitația. Pentru voce înainte de meci, ambele aplicații și serverul trebuie actualizate la 0.4.2; după aprobarea organizatorului, coechipierii pot vorbi în lobby. La identificarea meciului, această voce se închide și începe autentificarea de joc. Modul normal păstrează proximity/team voice și efectele opționale.

Din 0.3.0, streamerul/organizatorul se autentifică în Caster, generează un cod `RV-` pentru cei 10 jucători și aprobă înscrierile trimise din aplicație înainte de meci. Conturile nominale ale moderatorilor permit identificarea autorului fiecărui mute. Repartizarea din Voxdria nu modifică lobby-ul LoL; numele este declarat de participant și confirmat manual. Configurează `ORGANIZER_PASSWORD` și `MODERATOR_ACCOUNTS_JSON` numai pe server. Vezi [organizare și moderare](docs/organizer.ro.md).

## Source and build

Current verification and limits: [Romanian feature checklist](docs/function-checklist.ro.md), [security review](docs/security-review.ro.md), [test/build results](docs/verification-results.ro.md). Test tooling uses a checked-in, MIT-licensed local deepmerge patch; see [vendor/deepmerge](vendor/deepmerge/README.md). This is not an upstream patched release.

Client: `src/` and `src-tauri/`. Server: `server/`. Deployment: `render.yaml`, with Render root directory `server`.

Windows build requires Node 22.12+, the Rust MSVC toolchain specified in `rust-toolchain.toml`, Visual Studio C++ Build Tools, Windows SDK and WebView2.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-windows.ps1
```

The script installs locked dependencies, runs checks/tests and builds the Windows executable and NSIS installer. Outputs, corresponding source and checksums are in `artifacts/`.

See [enemy camera voice and its limits](docs/enemy-camera.ro.md), [security review](docs/security-review.ro.md), [Caster Mode and OBS](docs/caster-mode.ro.md), [operation and validation](docs/VOXDRIA.md), [Render setup](docs/RENDER.ro.md) and [publishing updates](docs/UPDATES.ro.md).

Use Voxdria 0.4.2 and the updated server with working TURN. Enemy proximity is enabled by default; ENEMY_CAMERA_VOICE=0 is an explicit operator suspension. An existing Render value of 0 must be changed to 1. The existing public service and GitHub addresses are retained for compatibility; see [name and update migration](docs/rebrand.ro.md). The public server was not deployed in this session. Visibility is client-reported, not Riot attestation; a modified client can fabricate reports. The trusted media server terminates enemy audio encryption.

Caster guests use a separate VC invitation link, choose a name and caster/listener role, and wait for organizer approval before joining audio. They receive no administrator privileges. See the [Caster invitation guide](docs/caster-invites.ro.md). Opening the link in a browser shows instructions; paste the complete link into the native Caster application.

## Privacy

Audio connections require an authenticated TURN relay. Direct peer connections are disabled. This avoids exposing direct peer connection addresses through the normal client connection; server and TURN operators can still see connection metadata, including IP addresses. This is not an anonymity guarantee.

Configure TURN credentials only in the server environment. Never commit `.env`, API tokens, passwords or signing keys.

## Attribution and license

Source base: [LoLProxChat](https://github.com/danthi123/LoLProxChat), modified by Voxdria. Original notices and license are retained. See [NOTICE.md](NOTICE.md) and [LICENSE](LICENSE), **AGPL-3.0-or-later**. Third-party components retain their respective licenses.

League of Legends names, artwork and related data belong to their respective owners. Voxdria is not endorsed by Riot Games. Approval claims in historical upstream documentation do not establish approval for Voxdria.

Voxdria isn’t endorsed by Riot Games and doesn’t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
