# RiftVoice 0.2.0 — configurarea hostului / Render

Publică sursele complete extrase din arhiva GitHub în rădăcina repository-ului. Păstrează server/, src/, src-tauri/, configurațiile și fișierele de licență. Nu înlocui doar trei fișiere din server: 0.2.0 are și module media noi plus package-lock actualizat. Nu publica .env, chei, invitații sau capturi.

render.yaml definește serviciul Node cu root server, build npm ci --include=dev && npm run build, start npm start și /health. Configurează versiunea Node cerută de package.json, HTTPS și proxy-ul conform hostului. Invitațiile PLAYER_GRANTS_JSON și CASTER_GRANTS_JSON se introduc numai în mediul serverului. ALLOWED_WEB_ORIGINS permite explicit originile suplimentare de browser; originile native Tauri sunt incluse.

TURN este separat de găzduirea aplicației. Configurează TURN_KEY_ID și TURN_KEY_API_TOKEN pentru Cloudflare, TURN_URLS / TURN_USERNAME / TURN_PASSWORD pentru credențiale statice sau TURN_SERVER / TURN_SECRET pentru coturn HMAC. Folosește datele propriului operator și nu le pune în build-ul frontend. Repornește serverul după configurare. /health singur nu demonstrează că audio-ul funcționează.

Implicit, ENEMY_CAMERA_VOICE=0 și jucătorii rămân separați pe echipe. Pentru adversari apropiați în cameră, operatorul activează ENEMY_CAMERA_VOICE=1 numai după verificarea TURN și a resurselor hostului. Componenta media are nevoie de conexiuni WebRTC active și trafic TURN; compatibilitatea și capacitatea planului de găzduire ales nu au fost validate aici. Nu există fallback direct dacă releul nu funcționează. Nu configura CAMERA_MEDIA_LOOPBACK_TEST sau RIFTVOICE_INSECURE_TEST_MODE pe host.

Cu funcția activă, /health indică authenticationRequired=true, teamIsolation=true, enemyCameraVoice=true. teamIsolation se referă la rutele directe; adversarii trec prin filtrul media. Configurează aceeași origine HTTPS în toate aplicațiile și distribuie invitații distincte. Clienții fără suport rămân separați pe echipe.

Pentru validare: două calculatoare în același custom, audio în ambele sensuri, apropiere și îndepărtare, icon dispărut, cameră mutată, alt-tab, moarte/respawn, expirare, reconnect și un Caster separat. Urmează testul cu zece jucători. Vezi [configurarea și limitele vocii adversarilor](enemy-camera.ro.md), [invitații și OBS](caster-mode.ro.md), [rezultatele locale](verification-results.ro.md).

Rapoartele vizuale sunt furnizate de client și pot fi falsificate. Serverul media are acces tehnic la audio-ul adversarilor și trebuie considerat de încredere. Nu este o atestare Riot. Serverul public existent nu a fost actualizat în această sesiune; aceste instrucțiuni și pachetele sunt pregătire pentru testare, fără deploy automat.