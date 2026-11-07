# Verificări curente: Player 0.4.3

Pentru varianta cu motor original, vezi [rezultatele 0.4.3](verification-0.4.3.ro.md) și [configurarea](player-original.ro.md). Materialul de mai jos descrie implementarea precedentă 0.4.2; afirmațiile despre gateway și voce în lobby nu se aplică noului jucător.

# Verificări Voxdria / Voxdria Caster 0.4.2 — 7 noiembrie 2026

Copia de lucru este Voxdria-Caster. Aceasta este o versiune locală pregătită pentru test în comunitate, cu installere Windows distincte pentru jucători și comentatori. Pachetele nu publică GitHub și nu actualizează Render. Nu reprezintă o certificare Riot, un test de instalare pe Windows curat sau o validare într-un custom real.

## Probe executate pentru 0.4.2

| Verificare | Rezultat |
|---|---|
| Type-check client și arbore teste | Trecut în copia de lucru și în sursele extrase |
| Client complet | **806 trecute, 2 omise**; 55 suite active trecute, 57 în total |
| Server | **327 trecute**, 26 fișiere |
| Integrare end-to-end | **19 trecute**, 2 suite |
| Rust release | **48 trecute**, 1 test hardware ignored în rularea implicită |
| Clippy release/all-targets | Trecut cu avertismentele tratate ca erori |
| Frontend producție | Ambele build-uri au trecut cu --fail-on-warnings |
| Windows NSIS x64 | Voxdria_0.4.2_x64-setup.exe și Voxdria Caster_0.4.2_x64-setup.exe construite; produsul, versiunea și hash-urile verificate |
| Compatibilitate UI și audio | **12 verificări grupate**, interfețe reale și server local, inclusiv noua cerere/aprobare Caster |
| Organizare și aspect | **12 verificări grupate**, inclusiv migrarea invitațiilor, protecția administratorului și layout 800/520 px fără overflow orizontal; captura de 800 px inspectată vizual |
| Natural/Robotic opțional | Web Audio și WebRTC cu tonuri sintetice, bypass și intensitate zero trecute |
| npm audit, inclusiv dezvoltare | Client **0**, server **0** vulnerabilități cunoscute raportate |
| RustSec | **0 în lista principală**; două avertismente informative Linux, absente din arborele țintei Windows verificat |
| Surse extrase | npm ci --ignore-scripts pentru client/server, type-check client/teste, build backend și pornire de producție trecute |
| Capabilități backend extras | serverVersion=0.4.2, casterInviteProtocol=1, casterRequestsAvailable=true, lobbyVoiceProtocol=1, enemyCameraVoice=true; pagina de invitație disponibilă |

Rularea completă a clientului a folosit un singur proces, colectare explicită a memoriei între suite și limită de heap de 1.536 MiB. A terminat în 765,429 s, cu toate aserțiunile active trecute. O primă rulare suprapusă cu compilarea a fost întreruptă din cauza presiunii asupra memoriei de 8 GB; nu este numărată drept test trecut. Nu a fost necesară schimbarea validărilor aplicației sau a modului de compilare TypeScript al testelor. Testul de bootstrap care pornește două procese are acum 15 s în total, fiecare proces păstrând termenul propriu de 5 s. Proba UI așteaptă confirmarea reactivării de la server în locul unei pauze fixe.

Dovezile locale sunt în verification/: voxdria-042-client-final.log și voxdria-042-client-results.json, voxdria-042-server-final.log, voxdria-042-e2e.log, voxdria-042-native-tests.log, voxdria-042-native-clippy.log, voxdria-042-player-installer.log, voxdria-042-caster-installer.log, voxdria-042-compatibility-ui.log, voxdria-042-organizer-ui.log și voxdria-042-voice-audio.log. Auditul și proba surselor extrase au fișiere voxdria-042-*-audit.json, voxdria-042-windows-dependencies.txt și voxdria-042-fresh-source-result.json. Rapoartele brute, profilurile și configurația privată nu sunt incluse în arhivele de surse/release.

## Ce s-a verificat pentru Caster

Linkul separat VC permite o cerere, fără acces audio sau privilegii de administrare. Solicitarea apare separat de jucători și expiră după cinci minute. Doar administratorul/moderatorul autentificat poate aproba comentator ori spectator audio, respinge, schimba linkul sau elimina accesul. Tokenul personal este livrat numai solicitantului și nu apare în snapshot-ul de organizare. Schimbarea linkului respinge cererile vechi; eliminarea persoanei revocă tokenul și sesiunea ei. Cererile nu sunt persistate. Stocarea privată validată migrează la schema 3, inclusiv din schema anterioară.

Proba UI folosește controllerul Caster real, cu microfon sintetic: lipsa capturii înainte de aprobare, conectarea automată după aprobare cu microfon oprit, reconectarea din memorie și după reîncărcarea aceleiași ferestre, mesajul de microfon refuzat păstrat după închiderea socketului, eliminarea accesului, spectator fără microfon, refuz cu posibilitate de retry și conectarea organizatorului cu rol propriu în locul cererii sale în așteptare. Au fost păstrate probele PTT/blur/input, mute/deafen, niveluri TX/comentariu, oprirea vocilor primite, închiderea microfonului la ieșire, updater și butoane Discord. Apelurile native Discord/update sunt simulate; nu s-au schimbat roluri sau canale Discord.

Serverul refuză codul jucătorilor pentru cererea Caster, roluri privilegiate falsificate, acces fără aprobare și folosirea grantului Caster pe ruta jucătorilor sau la volumele acestora. O cerere doar de spectator nu poate fi promovată la microfon. Limitele de capacitate, anularea, expirarea, rotația, mute/revocarea și validarea datelor persistate sunt acoperite. Verificările de nume normalizat sunt repetate la aprobare pentru a evita aprobarea simultană a aceluiași nume ca jucător și invitat. Un alias poate ocoli verificarea de nume: nu există autentificare Riot/Discord și organizatorul trebuie să confirme identitatea reală.

Canalul comentatorilor rămâne separat de vocea de echipă și proximity, în lobby și în meci. Rolul spectator este doar un rol audio. Aplicația nu obține automat date de spectator, nu citește poziții ascunse și nu ocolește Vanguard. Linkul deschis în browser afișează instrucțiuni; adresa completă se lipește în aplicația desktop. Nu există lansare automată din browser.

## Probe anterioare păstrate, fără relabelare

Raportul [0.4.1](verification-0.4.1.ro.md) conține cele 15 scenarii WebRTC/RTP reale pe loopback pentru gateway-ul adversarilor, cu rapoarte vizuale sintetice. Nu au fost rerulate în 0.4.2; implementarea gateway-ului, filtrul de vizibilitate și rutarea audio a jucătorilor sunt neschimbate. Testele server/client curente acoperă în continuare politica, autorizarea, lifecycle-ul, preferințele și izolarea. Nu se pretinde o nouă probă TURN externă sau o recunoaștere vizuală într-un custom real.

Ultimele probe fizice de microfon/ieșire și OBS sunt din etapa RiftVoice 0.4.0, pe componentele mixerului păstrate. Microfonul Realtek la 48 kHz a produs semnal, cu un vârf la limita 1, care cere reglaj uman al nivelului. Ieșirea nativă nu a raportat underruns/drop în proba respectivă. Înregistrarea OBS 33.0.1 de 14,93 s conține tonul de 440 Hz și liniște după stop; nu a fost stream și nu s-a capturat microfonul/desktopul. Acestea nu sunt probe hardware Voxdria 0.4.2. Pornirea nativă observată parțial în 0.4.1 nu este relabelată drept probă interactivă 0.4.2.

Două suite CV rămân omise deoarece cer debug bundles/cadre din meciuri reale, pe care utilizatorul nu le are încă. Cazurile publice anterior omise au date și rulează; noile pachete de surse nu distribuie automat seturile vizuale externe. Un CI fără acele date poate afișa alte numere. Un test Rust fizic rămâne ignored în rularea implicită și nu se raportează drept probă hardware nouă.

## Limite și testul următor

- Actualizează serverul Render și ambele aplicații la 0.4.2. În Render, o valoare veche ENEMY_CAMERA_VOICE=0 trebuie schimbată la 1 pentru proximity adversari. Nu s-a făcut deploy sau publicare în această revizie.
- Începe cu doi jucători, apoi extinde la zece PC-uri/rețele și casterii reali. Verifică vizibilitatea în camera proprie, distanța, fog of war, moartea/respawn, microfoanele, nivelurile și reconectările. Vezi [planul de custom](custom-test.ro.md).
- Verifică ieșirea dedicată din aplicația nativă actuală, sursa OBS pentru Voxdria Caster, mixul real și delay-ul spectator/stream. Mute/PTT din aplicație nu controlează un microfon separat în OBS sau Discord.
- Măsoară stabilitatea și consumul TURN/hostului pentru durata reală a evenimentului. Nu s-a validat capacitatea ExpressTURN/Render cu zece jucători sau o sesiune de 8–10 ore. Bugetul de 1.000 GB nu este un rezultat de trafic măsurat.
- Instalarea pe Windows curat, upgrade/dezinstalare, update între release-uri publicate, USB/Bluetooth și DPI diferit necesită probe reale. Installerele sunt nesemnate; updaterul notifică și deschide pagina fixă, fără instalare automată semnată.
- Zero alerte cunoscute nu înseamnă zero vulnerabilități. glib 0.18.5 / RUSTSEC-2024-0429 și proc-macro-error 1.0.4 / RUSTSEC-2024-0370 rămân avertismente Linux în lockfile, absente din arborele Windows verificat. Baza RustSec folosită avea ultima actualizare la 6 noiembrie 2026.
- Vizibilitatea și identitatea sunt raportate de client și pot fi falsificate. Media P2P deja negociată poate continua între clienți modificați. Izolarea aplicației nu controlează comunicațiile externe sau urmărirea streamului. Nu există aprobare Riot sau garanție privind sancțiunile.

Configurația și pașii de folosire sunt în [invitațiile Caster](caster-invites.ro.md), [OBS](caster-mode.ro.md), [organizare](organizer.ro.md) și [Render](RENDER.ro.md). Creditul LoLProxChat/danthi123 și licența AGPL-3.0-or-later sunt păstrate. Arhivele finale conțin sursele corespunzătoare, ghidurile și hash-urile; livrarea este locală.
