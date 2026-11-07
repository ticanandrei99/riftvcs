# Inventar de verificare — Voxdria / Voxdria Caster 0.4.1

Inventarul separă comportamentele verificate automat, probele audio locale și verificările care cer un custom, OBS sau alt calculator. Nu declară că fiecare funcție internă ori combinație de dispozitive este dovedită printr-un test. Rezultatele și numerele finale sunt în [raportul de verificare](verification-results.ro.md); constatările de securitate sunt în [audit](security-review.ro.md).

| Funcție / comportament | Proba disponibilă | Limită practică |
|---|---|---|
| Pornire aplicație normală / Caster | Build-uri Windows distincte; configurații și verificări native | Instalare/upgrade pe Windows curat rămâne manual |
| Minimizare, închidere, redimensionare overlay | Cod nativ verificat, build, calcule de geometrie | Necesită probă interactivă la DPI diferit |
| Română/engleză, stocarea preferințelor | Type-check, teste de preferințe, interfață de probă | Nu s-a bifat manual fiecare traducere |
| Culori și lizibilitate Caster | Capturi și verificări la 800/520 px, fără overflow orizontal | Verificare suplimentară utilă la 125–200% DPI |
| Server HTTPS, validare adresă, schimbare server | `server-address`, eliminare credențiale vechi | Certificatul și disponibilitatea hostului aparțin operatorului |
| Verificare stare server / TURN | `connection-status`, `config`, proba de compatibilitate | `/health` nu confirmă că un apel real funcționează |
| Cod RV- brut și invitație completă | `invitation-input`, proba cu panoul real al jucătorului | Linkul Riot singur nu este cod vocal |
| Mesaje pentru cod lipsă/expirat, refuz, server inaccesibil | `voice-invitation`, `lobby-registration`, teste server | Codul expirat trebuie reemis de organizator |
| Cerere înainte de meci, aprobare, refuz | Server real + interfețe Caster/jucător | Riot ID este declarat, apoi confirmat manual |
| Rezervare privată și reluare înscriere | `lobby-registration`, `organizer-events` | Închiderea aplicației pierde rezervarea sesiunii |
| Generator aleatoriu de invitații / maximum zece | Teste server și UI | Nu generează coduri oficiale Riot |
| Link lobby LoL copiat manual | `lobby-link`, copiere invitație în UI | Aplicația nu intră și nu mută persoane în clientul Riot |
| Cinci persoane pe echipă | Teste de capacitate/admitere pe server | Proba cu zece PC-uri este separată |
| Mutare și schimb între echipe | Teste server + două interfețe reale | Permise înainte de identificarea meciului |
| Listă de cereri / înscriși / voce lobby / voce meci | Roster server, UI Caster, proba de compatibilitate | Nu este lista preluată automat din LoL |
| Voce de lobby între coechipieri | Audio sintetic real WebRTC, AudioService și LobbyVoiceController | Factory de test pe loopback; producția rămâne TURN-only |
| Separare Albastru/Roșu în lobby | Test server cu trei jucători; mutare în proba UI | Clienții modificați pot păstra media P2P negociată |
| Reînlocuire sesiune, reconnect și stare veche | Teste lifecycle + takeover pe server | O sesiune preluată cere reconectare manuală |
| Închiderea lobby audio la meci | Server real și SignalingService real | Identificarea reală a unui custom trebuie probată în joc |
| Proximity standard implicit / team la alegere | Preferințe fresh-install și fallback sigur, lifecycle în ambele moduri, volume și e2e | Urmărirea minimapei poate fi greșită |
| Proximity implicit pentru adversari apropiați vizibili în cameră | Politică implicită pe server, sesiuni autentificate și 15 scenarii cu RTP real, inclusiv unmute forțat | TURN și server actualizat necesare; valoarea operatorului 0 suspendă ruta; vizibilitatea clientului nu este atestare anti-cheat |
| Ascundere icon, cameră mutată, captură oprită, moarte/respawn | Simulări CV și poarta media | Două suite cu înregistrări de meci rămân fără date reale |
| Detectare nume, echipă, cameră, recalibrare | `identity`, `game-state`, `map-calibration`, CV, teste Rust | Nu se reconstruiesc nume mascate; trebuie test în patch-ul LoL curent |
| Mute propriu, mute individual, mute all/deafen | Teste AudioService/PeerConnection și rutare Caster | Nu controlează microfonul Windows sau alte programe |
| Push-to-talk, eliberare, pierdere focus | Teste de stare audio / keymap / Rust; handler Caster revizuit | Tastele și alt-tab trebuie verificate în meci |
| Oprire voci în mixul streamerului | Proba UI/audio reală, teste pentru gate și mute-uri combinate | Oprește și căștile; nu există bus OBS independent |
| Alegere input/output și revenire la dispozitiv implicit | `devices`, `audio-mic`, `peer-connection` | USB/Bluetooth, scoatere/reintroducere și mix Windows cer probe hardware |
| Ieșire audio nativă a procesului | Proba hardware de 3 s și QA pornire/mute/stop, Realtek 48 kHz, 0 underruns/cadre eliminate; teste jitter buffer | Nu dovedește volumul auzit de utilizator |
| Captură audio pe aplicație în OBS | OBS 33.0.1, probă din etapa RiftVoice 0.4.0 pe mixerul păstrat: 14,93 s, 440 Hz și liniște după stop, microfon/desktop excluse | Nu este o nouă probă hardware 0.4.1, mix real de comentatori, stream sau probă de delay |
| Microfon Windows / ascultare procesată și oprire preview | Microfon Realtek deschis și semnal detectat local; `microphone-test`, teste engine/audio | Vârf 1 în proba locală: nivelul și calitatea trebuie reglate/ascultate cu căști; sunetul nu a fost stocat sau transmis |
| Natural/Robotic, bypass, intensitate | OfflineAudioContext și WebRTC cu ton sintetic | Nu sunt voci oficiale de campioni și nu există voice cloning |
| Caster / spectator audio distincte | Teste admitere, roluri și SDP; validare client înainte de microfon | Spectatorul LoL nu este detectat automat |
| Izolare caster–jucători, fără poziții spectator | Manager separat, refuz rute/payload-uri, e2e | Nu împiedică Discord, stream sniping sau partajarea voluntară |
| Volum comentariu / co-caster / individual | Controale audio, teste PeerConnection, cod revizuit | Mixul final cu OBS și delay cere înregistrare reală |
| Administrator / moderatori nominali / parolă | Teste scrypt, rate limit, server real și UI | Parolele și hostul sunt administrate de operator |
| Mute de moderare, unmute, eliminare, închidere, expirare | Teste server, revocare bearer și websocket | Media P2P între clienți modificați nu este strict revocabilă |
| Administrator protejat / istoric nominal | Tentative fabricate refuzate; audit doar pentru admin | Istoricul local nu este registru extern imuabil |
| Persistență evenimente / audit | Teste de salvare atomică și reluare | Necesită disc persistent privat pe host |
| Refuz video/data channels, flood și input invalid | Teste audio-signal, rate limits, HTTP/WS și acces | Nu înlocuiește un test de penetrare independent |
| Loguri și diagnostic fără credențiale uzuale | Teste redactare și integrare cu loggerul | Secretele arbitrare fără etichetă și capturile necesită verificare umană |
| Update notificat la pornire / verificare manuală | Teste client și Rust: versiune, variantă, URL, asset, limită răspuns | Instalare manuală; nu există canal de instalare automată semnat |
| Discord comunitate și canal privat Streamer | Destinații fixe, refuz nativ în varianta player, butoane în proba UI | Accesul pe roluri și vocea sunt controlate de Discord; fără login/roluri/punte audio automată |
| Surse GitHub, release, hash-uri și licențe | Validare arhive și hash-uri corespunzătoare build-urilor | Încărcarea și deploy-ul public nu sunt implicate de crearea arhivei |

## Probe care necesită un custom real

Zece participanți pe calculatoare/rețele diferite; Riot ID-ul exact returnat de clientul curent; identități și echipe confirmate; microfoane reale, PTT și alt-tab; camera, fog of war, moarte/respawn; reconnect în lobby și meci; streamer/caster separat, OBS și delay spectator; instalare curată și upgrade între release-uri publicate. Fără acestea nu se afirmă „fiecare funcție merge în orice situație”.

Pentru cele două suite vizuale lipsesc înregistrările/cadrele reale descrise în raport. Utilizatorul a confirmat că nu are încă aceste fișiere. Nu au fost inventate rezultate sau înlocuite meciurile reale cu imagini sintetice prezentate drept reale.
