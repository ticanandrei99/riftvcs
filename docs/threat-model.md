# Threat model — current RiftVoice fork

This document supersedes inherited upstream claims. The security boundary is the production server plus native client restrictions, not the volume slider.

## Access and isolation

Version 0.3.0 adds an optional password-protected organizer endpoint and a separate pregame registration endpoint. Named moderator identities are selected by server-configured credentials; caller-supplied roles/names do not grant authority. Passwords use salted scrypt verifiers, with bounded concurrent verification, per-IP/global login limits, command rate/queue limits and one-hour console sessions. A shared legacy moderator password identifies only the fixed shared account, not an individual human.

Common event codes permit a pending request only. Pregame approval creates a private reservation, with no player or caster media session. At match entry the reported name/team must match the reservation; normal socket-bound voice authentication then applies. Team planning is limited to five per side and ten total, and cannot change once the match is bound. These are organizer-approved claims, not Riot-verified identities or proof that the match is custom. Organizers must confirm the actual lobby.

Staff caster credentials are personal to the authenticated console identity and are never included in other operators' snapshots. A moderator cannot mute/unmute an administrator voice identity, including via a forged role field. Moderation suspends voice access, revokes sessions and closes the voice socket; unmute permits manual reconnect. Official peers discard the departed audio connections. This does not make already-negotiated ally/caster P2P media revocable between modified clients. Personal local mute remains unrestricted.

The server retains a bounded named mute/unmute/denial audit (1,000 records, latest 200 in the administrator UI). Moderators cannot read it or clear it through the API. Actor identity and time are server assigned. Optional atomic private-file storage persists events, voice credentials, claimed player names and audit records. Without persistent storage all of these are lost on restart. This audit is explicitly identifiable operator data, separate from aggregate operational logs; the trusted server operator can alter/remove the file. See [organizer configuration and retention](organizer.ro.md).

Production has no anonymous voice rooms. The operator provisions short-lived, random invitations bound to a room, participant name, role and (for players) team. These are event credentials, not Riot authentication. The organizer must check membership and assign teams correctly. Tokens are not passed to other clients, written to URLs or included in debug diagnostics.

The server issues a fresh HTTP bearer credential to an authenticated socket. It is bound to that socket, expires with the invitation, and is revoked on close/replacement. Volume and TURN endpoints require it. A caster/spectator session cannot query player volumes. An HTTP requester cannot choose another identity or use arbitrary coordinates to scan the map.

With enemy camera voice disabled (the deployment default), player discovery, presence, signaling and volume responses are team-restricted. With ENEMY_CAMERA_VOICE=1, capable player clients can discover enemies, but enemy SDP/ICE terminates at the server media gateway and never passes to the other player. Only currently authorized RTP is forwarded. Caster/spectator signaling uses separate rooms; no player/caster bridge exists. Spectator audio is receive-only/inactive. Video and application media are rejected.

The old protocol remains solely for the automated compatibility suite when RIFTVOICE_INSECURE_TEST_MODE=1, which binds the server to loopback. It is not a production mode and its legacy volume helpers do not establish a fog-of-war guarantee. Browser access to that test mode is also limited to configured/local origins.

## Information and media trust

Self-reported position and screen recognition are not authoritative Riot state. A compromised teammate may falsify them. No hidden enemy positions or game memory are read for Caster Mode. Only the player's own on-screen minimap is used for ally proximity, and the native capture requires League to be foreground and caps dimensions before allocation.

WebRTC uses DTLS-SRTP and relay-only browser connections. TURN alone does not revoke media. Modified clients can retain an allowed ally/caster P2P stream after signaling closes. The optional enemy gateway checks each RTP packet, live authenticated sockets and fresh camera permission; changing local volume cannot recover dropped RTP. Enemy audio is decrypted/re-encrypted at the trusted server, not end-to-end between players. The server does not record it.

Camera recognition is not trusted visibility attestation. An authenticated modified client can fabricate a fresh report with roster names and false coordinates. Short challenges prevent stale/replayed authorization but cannot prove that the reported pixels were captured honestly. This implementation cannot guarantee fog-of-war integrity against that attacker and must not be called Riot-approved or anti-cheat-secure. A stronger guarantee needs an authorized, verifiable visibility source that is not assumed available. See [enemy camera voice](enemy-camera.ro.md).

No software here can prevent a person from relaying commentary in another application, sharing their invitation, listening to a stream out of band, or running a modified game client. Roles are organizer-assigned, not automatically detected spectator identities. Stream delay and commentator synchronization are manual in OBS; delay does not authorize an audio route to players.

## Native and web boundaries

Bundled pages have a CSP, blocked remote top-level navigation, microphone access limited to the app origin, and per-window native-command restrictions. The caster window can use update checks and audio output, but cannot call game inspection, capture or keyboard commands. The League loopback HTTP client has no proxy or redirect following; its self-signed certificate exception is not used by the updater/signaling service. Keyboard handling produces PTT/mute events without synthetic key input.

Release metadata is fetched from a fixed HTTPS GitHub endpoint, with a size/time limit, redirect blocking and short cache. Stable version and exact variant installer checks determine whether a notification appears. No WebView command downloads or executes arbitrary update URLs. There is no signed automatic-install channel yet.

## Availability and privacy

Per-IP/per-player/per-socket rate limits, bounded HTTP/WS bodies, room/global connection caps, authentication deadlines, request timeouts and heartbeat cleanup reduce abuse. These are single-process controls, not global DDoS protection. Multiple instances need shared authorization/routing/limits or event stickiness.

No telemetry or automatic log upload is added. Debug is opt-in and local; logs/captures may contain participant identities and visible minimap information. Review/redact them before sharing. Private invitation files, keys, local profiles and build caches are excluded by the source-packaging rules; human review remains necessary before any release.

## Third-party programs

RiftVoice does not scan for Rose/skin changers, attest a clean machine, modify another program or replace Vanguard. A visual anomaly is not proof of cheating. Uncertain tracking should silence position-based routing instead of inferring a hidden position. The organizer applies community rules; Riot decides its own game sanctions. RiftVoice cannot shield a user from sanctions caused by another program.
