# Caster Mode, invitații și OBS

În 0.4.1, ambele aplicații și serverul folosesc același flux de invitație: panou de conectare vizibil în Voxdria, aprobare în Caster și voce de lobby separată pe echipe. Caster păstrează canalul izolat pentru comentatori și interfață negru/roșu, câmpuri închise la culoare, cereri distincte și cinci locuri vizibile pe fiecare echipă. Este o aplicație desktop Tauri pe Windows; fișierele interfeței sunt resurse interne ale aplicației.

Din 0.3.0 există panou de administrator/moderator cu parolă, invitație comună pentru 10 jucători, înscriere înainte de start, repartizare pe echipe și moderare cu istoric nominal. Pentru utilizarea curentă urmează [ghidul de organizare](organizer.ro.md). Instrucțiunile de invitații statice de mai jos rămân disponibile pentru operatorii care folosesc configurarea manuală.

## Utilizare

Producția folosește invitații și separă rutele directe pe echipe. Din 0.2.0, organizatorul poate activa vocea adversarilor apropiați în cameră, exclusiv prin filtrul media al serverului; vezi [configurarea și limitele](enemy-camera.ro.md). Caster Mode are propriul canal și build; nu transmite către jucători și nu primește vocea acestora. Rolul spectator este audio, fără detectarea automată a spectatorului LoL.

În aplicația de jucător, lipește codul RV- sau invitația completă în panoul Conectare, completează Riot ID-ul și apasă Conectează cu invitația. După aprobare, vocea de lobby poate porni între coechipierii aprobați. Codul personal este păstrat numai în sesiunea aplicației. În Caster Mode, autentifică-te și folosește conectarea cu rolul propriu, ori introdu invitația separată de caster/spectator și apasă Conectează. Un server vechi fără sesiuni securizate este refuzat de clientul normal.

Mute individual oprește persoana doar pentru tine; unmute o reactivează. Mute All are prioritate. Mute-ul se păstrează la reconectarea persoanei în același meci; în canalul caster este păstrat în memoria aplicației până la închidere. Pentru streamer, mute-ul influențează și mixul local capturat din Voxdria, nu înregistrările făcute de alte persoane.

Casterul pornește cu microfonul oprit, PTT activ și monitorul comentariului local oprit. Space este PTT numai cu fereastra activă, în afara câmpurilor de input; pierderea focusului eliberează PTT. Deafen oprește ascultarea și transmisia. Spectatorul nu cere microfon și nu transmite. Reconectarea este manuală și pornește din nou cu microfonul oprit. Nivelurile globale și cele individuale ale co-casterilor se combină.

## Organizator / operator

Instalează serverul actualizat pe propriul host HTTPS/WSS. Configurează TURN valid și verifică certificatul/reverse proxy. Nu pune invitații sau chei TURN în build-ul frontend, URL, capturi ori repo. Serverul public existent nu a fost actualizat automat.

PLAYER_GRANTS_JSON și CASTER_GRANTS_JSON sunt liste JSON pe server. Fiecare obiect are token aleatoriu de minimum 32 caractere, room, name, role, expiresAt (Unix, milisecunde); player are și team ORDER/CHAOS. Numele și camera trebuie să corespundă sesiunii custom. Organizatorul verifică manual participanții; tokenul nu este autentificare Riot.

Pentru a genera invitații locale:

    node scripts/create-invitations.mjs --roster roster.json --out event.private.json --hours 8

roster.json este o listă ca aceasta, fără secrete:

    [
      {"room":"id-camera","name":"Nume#TAG","role":"player","team":"ORDER"},
      {"room":"id-camera","name":"Comentator1","role":"caster"},
      {"room":"id-camera","name":"Observator1","role":"spectator"}
    ]

ID-ul camerei jucătorilor este generat din lista completă a numelor afișate/reconstruite de client; nu este un secret și nu autorizează accesul. Pentru un custom 5v5, opțiunea --derive-room calculează același ID din cele zece intrări player, folosind exact numele complete din client. Include toate cele zece persoane chiar dacă unele nu vor folosi voice. Nu folosi această opțiune pentru o listă parțială sau identități ascunse/neclare.

Fișierul event.private.json conține valorile de configurat pentru cele două variabile server. Nu suprascrie fișiere existente; este exclus din source archives și git. Distribuie fiecărui participant doar propriul token. Setează durata minimă practică pentru eveniment (generatorul permite maximum 24h). Pentru revocarea unei invitații statice, scoate-o din configurație și repornește serverul. Camerele generate din panoul 0.3.0 au revocare, mute de moderare și închidere direct din aplicație.

Fără invitații valide serverul refuză accesul. /compute-volumes și /turn-credentials cer sesiune autentificată, legată de socket. Un caster nu poate folosi endpointul de volume al jucătorilor. ALLOWED_WEB_ORIGINS adaugă explicit originul unui frontend HTTPS/localhost pentru test în browser. Pagina nativă Tauri este deja permisă. RIFTVOICE_INSECURE_TEST_MODE nu trebuie configurat pe host; este exclusiv pentru testele locale și forțează ascultarea pe loopback.

## OBS pe Windows

Pentru comunitate și canalul privat league-comentator există butoane Discord. Accesul se acordă prin rolul Streamer în Discord și nu oferă administrare în Voxdria. Sunt linkuri externe, fără punte audio; mixul și mute/PTT din Voxdria Caster nu controlează Discord. Configurare: [Discord și rolul Streamer](discord.ro.md).

**Oprește vocile participanților în mix** oprește redarea tuturor co-casterilor, inclusiv în căști, și mixul lor capturat din aplicație. Microfonul propriu și monitorizarea comentariului rămân controale separate. Acest buton nu suspendă participanții și nu le oprește microfonul. Pentru streamerul care joacă, opțiunea echivalentă se găsește în panoul de lobby al aplicației normale; nu se transmite vocea jucătorilor către Caster.

În build-ul Windows Caster, păstrează activă opțiunea Ieșire audio dedicată OBS înainte de conectare. Refolosește infrastructura nativă AppAudioOutput: co-casterii sunt redați de procesul Voxdria, potrivit pentru captură pe aplicație. În browser, această opțiune este dezactivată și sunetul este redat de browser; folosește o instanță de browser dedicată pentru probă.

Adaugă o sursă Application Audio Capture pentru Voxdria Caster și dezactivează Desktop Audio pentru a evita dublarea. Verifică metrul sursei și o înregistrare locală. Ghid oficial: https://obsproject.com/kb/application-audio-capture-guide

În etapa RiftVoice 0.4.0, ruta a fost probată local cu OBS 33.0.1 și AppAudioOutput într-o aplicație QA: înregistrarea de 14,93 s conține tonul sintetic de 440 Hz, apoi liniște după oprire. Microfonul/desktopul au fost excluse și nu s-a pornit stream. Codul mixerului este păstrat în Voxdria; această înregistrare nu este o nouă probă hardware 0.4.1 și nu echivalează cu un mix de comentatori, delay sincronizat sau custom real. Rezultatele curente și pașii rămași sunt în verification-results.ro.md.

Varianta 1: monitorul local Voxdria rămâne oprit. OBS captează co-casterii din aplicație; microfonul local este o sursă separată în OBS. Mute/PTT din Voxdria NU controlează acea sursă OBS: configurează mute/hotkey și acolo.

Varianta 2: activează monitorul local al comentariului în Voxdria și dezactivează sursa separată de microfon în OBS. Nivelul comentariului și nivelurile co-casterilor formează mixul capturat. Folosește căști; deafen/mute/PTT controlează și monitorul local. Nu există încă un bus OBS separat cu ascultare independentă.

Alege căștile/dispozitivul dorit ca ieșire Windows înainte de conectare. Dacă ieșirea nativă se oprește, sesiunea caster se închide cu un mesaj; verifică dispozitivul și reconectează. Nu se revine în tăcere la o altă rută audio pentru stream.

## Delay și fog of war

Caster Mode nu colectează poziții, nu citește memoria jocului și nu obține automat date de spectator. Nu ocolește Vanguard. Fereastra caster nu are acces la comenzile native pentru joc, captură sau hotkey-uri.

Imaginea spectatorului și comentariul trebuie aliniate manual. Măsoară decalajul într-o înregistrare și ajustează sincronizarea surselor plus delay-ul final în OBS conform regulilor evenimentului. Voxdria nu cunoaște și nu compensează automat delay-ul spectatorului. Jucătorii activi nu trebuie să urmărească streamul; un delay nu autorizează transmiterea comentariului către ei.

Rutele P2P ale aliaților/casterilor nu pot revoca strict media deja negociată între clienți modificați. Ruta opțională a adversarilor din 0.2.0 este filtrată pe server la fiecare pachet, dar raportarea vizibilității rămâne furnizată de client. Jucătorii nu negociază niciodată fluxuri cu casterii.

## Build și probe necesare

npm run build:prod compilează inclusiv pagina caster.
npm run build:windows construiește aplicația normală.
npm run build:windows:caster folosește configurația dedicată, cu identificator separat, fără overlay/scanner și fără pornirea capturii/hotkey-urilor de jucător.

Într-un custom real: două echipe, doi casteri și un spectator audio, pe calculatoare diferite. Verifică izolarea audio prin înregistrări, invitațiile, expirarea/revocarea, spectator fără microfon, mute individual și deafen, PTT la alt-tab, reconectarea, TURN între rețele diferite, WebView2, căști/OBS, delay-ul și instalarea/dezinstalarea ambelor variante. Voice Changer trebuie verificat în modul normal. Testele automate nu certifică aceste comportamente hardware sau respectarea regulilor Riot.
