# Voxdria 0.4.2 — configurarea hostului / Render

La verificarea publică din această etapă, `/health` a răspuns HTTP 200 și `organizerAvailable=true`, însă nu anunța `serverVersion` / `lobbyVoiceProtocol`. Aceasta confirmă disponibilitatea administrării vechi, nu publicarea serverului 0.4.2 sau existența vocii înainte de meci. Versiunea locală nu publică automat pe GitHub/Render.

Serverul 0.4.2 pornește prin `node dist/bootstrap.js` (via `npm start`). Afișează Voxdria, versiunea/Node, încărcarea modulelor, verificarea configurației și bind-ul portului. Erorile de JSON sunt redactate. Motorul `werift` se încarcă implicit pentru proximity; ENEMY_CAMERA_VOICE=0 îl suspendă explicit. Nu elimina health check-ul pentru a masca o pornire incompletă. Numele serviciului riftvoice-server și adresa sa rămân cele existente, pentru compatibilitate.

După deploy complet verifică `serverVersion=0.4.2`, `eventInviteProtocol=1`, `lobbyVoiceProtocol=1`, `casterInviteProtocol=1`, `organizerAvailable=true`, `lobbyVoiceAvailable=true` și `casterRequestsAvailable=true`. Nu configura manual un port diferit de cel furnizat de Render. Root Directory rămâne `server`, Start Command `npm start`, Health Check `/health`. Node respectă `>=22.12.0`. Dacă logul se oprește, folosește noul ultim mesaj de pornire pentru diagnostic; validarea locală Windows/Node nu dovedește funcționarea instanței Render.

Publică sursele complete extrase din arhiva GitHub în rădăcina repository-ului. Păstrează server/, src/, src-tauri/, configurațiile și fișierele de licență. Nu înlocui doar trei fișiere din server: 0.4.2 are și module media noi plus package-lock actualizat. Nu publica .env, chei, invitații sau capturi.

render.yaml definește serviciul Node cu root server, build npm ci --include=dev && npm run build, start npm start și /health. Configurează versiunea Node cerută de package.json, HTTPS și proxy-ul conform hostului. Invitațiile PLAYER_GRANTS_JSON și CASTER_GRANTS_JSON se introduc numai în mediul serverului. ALLOWED_WEB_ORIGINS permite explicit originile suplimentare de browser; originile native Tauri sunt incluse.

TURN este separat de găzduirea aplicației. Configurează TURN_KEY_ID și TURN_KEY_API_TOKEN pentru Cloudflare, TURN_URLS / TURN_USERNAME / TURN_PASSWORD pentru credențiale statice sau TURN_SERVER / TURN_SECRET pentru coturn HMAC. Folosește datele propriului operator și nu le pune în build-ul frontend. Repornește serverul după configurare. /health singur nu demonstrează că audio-ul funcționează.

Proximity pentru adversari vizibili este standard și implicit activ în 0.4.2. Blueprint-ul folosește ENEMY_CAMERA_VOICE=1; o valoare 0 deja salvată în Render trebuie schimbată la 1 pentru acest comportament. Operatorul poate suspenda explicit ruta cu 0. Configurează și verifică TURN și resursele hostului: componenta media are nevoie de conexiuni WebRTC active și trafic TURN, iar capacitatea planului ales nu a fost validată cu zece PC-uri aici. Nu există fallback direct dacă releul nu funcționează. Nu configura CAMERA_MEDIA_LOOPBACK_TEST sau RIFTVOICE_INSECURE_TEST_MODE pe host.

Cu funcția activă, /health indică authenticationRequired=true, teamIsolation=true, enemyCameraVoice=true. teamIsolation se referă la rutele directe; adversarii trec prin filtrul media. Configurează aceeași origine HTTPS în toate aplicațiile și distribuie invitații distincte. Clienții fără suport rămân separați pe echipe.

Pentru validare: două calculatoare în același custom, audio în ambele sensuri, apropiere și îndepărtare, icon dispărut, cameră mutată, alt-tab, moarte/respawn, expirare, reconnect și un Caster separat. Urmează testul cu zece jucători. Vezi [configurarea și limitele vocii adversarilor](enemy-camera.ro.md), [invitații și OBS](caster-mode.ro.md), [rezultatele locale](verification-results.ro.md).

Rapoartele vizuale sunt furnizate de client și pot fi falsificate. Serverul media are acces tehnic la audio-ul adversarilor și trebuie considerat de încredere. Nu este o atestare Riot. Serverul public existent nu a fost actualizat în această sesiune; aceste instrucțiuni și pachetele sunt pregătire pentru testare, fără deploy automat.
## Administrare și moderatori în 0.4.2

ORGANIZER_PASSWORD activează panoul cu parolă. MODERATOR_ACCOUNTS_JSON permite conturi nominale cu parole distincte; implicit este []. Nu pune aceste valori în .env frontend sau în surse. După restart, /health arată organizerAvailable=true. Fără parolă de administrator, rutele obișnuite bazate pe invitațiile statice continuă să funcționeze, iar generarea din Caster rămâne dezactivată.

Camerele generate și istoricul de moderare sunt temporare în lipsa ORGANIZER_STORE_PATH. Pentru persistență, calea .private.json trebuie să fie pe un volum persistent și protejat al hostului; un disc temporar nu păstrează datele după redeploy. Operatorii sunt de încredere, iar numele înscris nu este o identitate verificată Riot. Configurare completă, înscriere înainte de start și reguli de moderare: [ghidul de organizare](organizer.ro.md).
