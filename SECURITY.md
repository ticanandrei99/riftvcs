# Voxdria — security policy

Report security issues privately to the maintainer of this Voxdria fork through the repository's Security tab, if private reporting is enabled. Do not post tokens, raw logs, minimap captures or exploit details publicly. If private reporting is unavailable, contact the organizer/maintainer privately first.

The source repository configured in this fork is https://github.com/ticanandrei99/riftvcs. Upstream LoLProxChat is credited in NOTICE.md; it does not operate this fork's releases or invitation service.

Scope: Windows client, custom-game invitation/signaling service, audio routing, update notifications and release packaging. Riot/Vanguard, OBS, Windows/WebView2 and TURN-provider security are separate services.

See docs/security-review.ro.md for current findings, limitations and evidence. This is an internal source/dependency review, not a penetration-test certification or Riot endorsement. A zero-finding dependency scan does not prove absence of vulnerabilities.

Updates are checked automatically at startup by default. Installation is manual through the fixed official release page until a cryptographically signed updater channel is provisioned and tested. Never execute an installer supplied through chat or an arbitrary mirror URL.
