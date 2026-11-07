# Verificări Voxdria / Voxdria Caster 0.4.1 — 7 noiembrie 2026

Copia de lucru este Voxdria-Caster. Produsele, interfața, procesul Windows și installerele sunt Voxdria / Voxdria Caster. Este o versiune locală pentru testare în comunitate, nesemnată și fără aprobare Riot. Crearea pachetelor nu publică GitHub și nu actualizează Render. Documentele istorice păstrează numele RiftVoice și probele versiunilor respective.

## Rezultate executate pe sursele curente

| Verificare | Rezultat |
|---|---|
| Type-check client și arbore teste | Trecut, inclusiv după adaptarea testelor de integrare pentru noul mod implicit |
| Client complet | **798 trecute, 2 omise**; 53 suite active trecute, 55 în total |
| Server | **315 trecute**, 24 fișiere; politică proximity implicită, suspendare explicită, autorizare, moderare și rutare |
| Integrare end-to-end | **19 trecute**, 2 suite; modul implicit proximity și lista strictă a câmpurilor din răspunsurile de volume |
| Rust release/locked | **48 trecute**, 1 test hardware ignored în rularea implicită |
| Clippy release/all-targets | Trecut cu avertismentele tratate ca erori |
| Frontend producție | Trecut cu --fail-on-warnings și bugete explicite pentru resursele desktop ONNX/WASM |
| Installere Windows NSIS x64 | Voxdria_0.4.1_x64-setup.exe și Voxdria Caster_0.4.1_x64-setup.exe compilate; metadatele produs/versiune verificate |
| Compatibilitate UI și audio | **9 verificări grupate** cu interfețele reale și server local, inclusiv invitații vechi/noi și WebRTC cu ton sintetic |
| Organizare / aspect / migrare invitație | **12 verificări grupate**, inclusiv parserul clientului anterior și layout 800/520 px fără overflow orizontal |
| Natural/Robotic opțional | Web Audio și WebRTC cu tonuri sintetice, bypass și intensitate zero trecute |
| Proximity adversari, media reală | **15 scenarii trecute** cu WebRTC/RTP pe loopback și rapoarte vizuale sintetice |
| npm audit complet, inclusiv dezvoltare | Client **0**, server **0** alerte cunoscute raportate |
| RustSec | **0 vulnerabilități în lista principală**; două avertismente informative Linux, absente din arborele Windows verificat |
| Pornire nativă Caster | Titlul Voxdria Caster și interfața parțial randată observate cu profil separat; o altă fereastră acoperea o parte a aplicației; fără acțiuni de autentificare/microfon |

Dovezile locale sunt în verification/: voxdria-client-final.log, voxdria-server-tests.log, voxdria-e2e-final.log, voxdria-typecheck.log, voxdria-test-typecheck.log, voxdria-native-tests.log, voxdria-native-clippy.log, voxdria-frontend.log, voxdria-player-installer.log și voxdria-caster-installer.log. Probele UI/audio sunt în voxdria-compatibility-ui.log, voxdria-organizer-ui.log, voxdria-voice-audio.log, voxdria-camera-media.log și voxdria-native-ui-proof.json. Rapoartele brute și profilurile nu intră în surse sau release.

Două așteptări vechi din integrare presupuneau Hybrid și un răspuns fără marcajul strictProximity. Au fost adaptate la noul comportament: proximity implicit și un câmp boolean explicit, cu aceeași listă strictă de câmpuri și verificare împotriva coordonatelor altor jucători. Rularea finală are 19/19; nu sunt prezentate eșecurile intermediare drept rezultat final.

## Ce verifică noul comportament

Instalările noi folosesc proximity, cu modurile extinse de cameră oprite implicit. Pierderea poziției nu deschide automat vocea întregii echipe. Testele lifecycle acoperă separat proximity și modul team ales explicit. Preferințele și opririle personale deja salvate rămân respectate.

Serverul 0.4.1 activează implicit gateway-ul pentru adversari vizibili, fără un flag suplimentar obligatoriu. ENEMY_CAMERA_VOICE=0 îl suspendă explicit; valori nevalide sunt refuzate. Blueprint-ul folosește 1, dar o valoare veche 0 păstrată în Render trebuie schimbată la 1. Testul HTTP/WebSocket pornește serverul fără această variabilă și verifică activarea, autentificarea și separarea rutelor directe. Protocolul legacy de test rămâne exclus din gateway.

Filtrul media verifică sesiuni active, ambele opțiuni personale de ascultare, identitate, cameră, icon vizibil, distanță, prospețimea raportului și starea alive. Scenariile RTP includ acord lipsă, icon/cameră lipsă, unmute local forțat, distanță, expirare/replay, captură oprită, moarte/respawn și dezactivare. Sunt rapoarte sintetice, nu dovezi de recunoaștere într-un meci real. Clientul poate fabrica rapoarte; nu există atestare Riot pentru fog of war.

Vocea de lobby este permisă după aprobare și separată pe echipe. Probele reale de interfață confirmă rezervarea privată, mute/gate fără oprirea transmisiei proprii, moderare și reconectare manuală, mutare și închiderea tuturor canalelor de lobby la prima admitere în meci. Factory-ul de probă permite explicit ICE local; producția păstrează TURN-only. Lipsa TURN este afișată ca indisponibilitate, fără declararea apelului drept funcțional.

Casterii și spectatorii audio rămân separați de jucători. Proba verifică lipsa microfonului înainte de admitere și pentru spectator, mute/deafen/PTT cu pierdere focus, niveluri de transmisie/comentariu, gate independent și cleanup. Comenzile native de Discord/update sunt simulate în proba de interfață; destinațiile și asseturile sunt validate separat în Rust. Nu este o probă de roluri Discord live sau de update între release-uri publicate.

## Redenumire și distribuție

Parserul acceptă Cod vocal, Cod vocal RiftVoice și Cod vocal Voxdria și refuză invitațiile ambigue cu două coduri. Generatorul folosește antetul Voxdria și eticheta generică, verificată cu parserul versiunii precedente. Identificatorii com.riftvoice.desktop / com.riftvoice.caster, cheile preferințelor, protocolul RV- și adresele reale de hosting/release sunt păstrate. Detalii: [migrarea numelui](rebrand.ro.md).

Installerele canonice se distribuie sub numele Voxdria. Un director separat de compatibilitate conține copii identice prin SHA-256 sub numele de asset cerute de updaterul RiftVoice vechi. Aceste aliasuri nu sunt build-uri vechi. Updaterul Voxdria cere assetul canonic al variantei proprii, versiune stabilă și URL exact; instalarea rămâne manuală.

Pachetele includ surse corespunzătoare, licențe, ghiduri și checksum-uri. Se folosesc numai cele două installere selectate explicit, niciodată executabilul brut target/release/voxdria.exe, care este suprascris la schimbarea variantei/QA. Sunt excluse dependențe instalate, cache-uri, profiluri, capturi, rapoarte, fișiere private și .env reale. Verificările bazate pe liste/tipare nu identifică orice formă posibilă de secret arbitrar.

NSIS leagă și intrarea Windows de numele produsului. Păstrarea identificatorului Tauri nu certifică un upgrade NSIS în loc; instalarea nouă poate avea o intrare separată. Nu s-a înlocuit/dezinstalat aplicația existentă a utilizatorului. Instalarea curată, migrarea/rollback și updaterul public rămân probe separate.

## Hardware și OBS: probe anterioare, delimitate

În RiftVoice 0.4.0, înaintea redenumirii, QA local a enumerat Realtek, a deschis microfonul la 48 kHz și a detectat semnal, fără stocarea sau transmiterea audio-ului. Vârful 1 cere reglarea/ascultarea nivelului; nu dovedește lipsa clipping-ului. Ieșirea nativă și testul hardware executat separat au raportat 0 underruns/cadre eliminate în eșantioanele măsurate.

Tot în 0.4.0, OBS 33.0.1 a înregistrat 14,93 s numai din ieșirea aplicației QA, cu 440 Hz detectat și liniște în ultimele 2 s; microfon/desktop excluse, fără stream. Codul mixerului este păstrat în 0.4.1, cu textele de proces actualizate. **Nu declarăm o nouă probă fizică sau înregistrare OBS 0.4.1.** Controalele audio curente au fost reverificate prin unitare și Web Audio/WebRTC. Vezi [raportul 0.4.0](verification-0.4.0.ro.md).

Proba TURN extern aparține etapei 0.2.0; în 0.4.1 s-a verificat din nou filtrarea media pe loopback. Nu este o probă pe hostul public sau pe două rețele reale.

## Alerte și limite rămase

Remedierea locală MIT deepmerge 4.3.1-riftvoice.1 filtrează cheile de prototip din ambele intrări și trece proba de atac/merge normal. Nu este o versiune reparată upstream și nu intră în bundle-ul aplicației. Raportul npm cu zero alerte nu este garanție de absență a vulnerabilităților.

RustSec păstrează proc-macro-error 1.0.4 (RUSTSEC-2024-0370, unmaintained) și glib 0.18.5 (RUSTSEC-2024-0429, unsound) ca avertismente informative. Ambele sunt absente din arborele Windows x86_64. Baza consultată are ultima actualizare 6 noiembrie 2026; avertismentele nu sunt ascunse și nu se declară build Linux verificat.

Cele două suite vizuale omise cer tests/cv/fixtures-games/index.json și CAMERA_EVAL cu eval.json/debug frames din meciuri reale. Utilizatorul a confirmat că nu are aceste date. Celelalte 25 de cazuri anterior omise sunt active local și au trecut cu imagini publice; nu sunt prezentate drept înregistrări reale. Datele descărcate opțional sunt excluse din surse, deci numărul testelor dintr-un CI nou poate diferi.

Mai sunt necesare: custom cu zece PC-uri/rețele și identități/echipe confirmate, cameră/fog of war/suprapuneri reale, moarte/respawn și alt-tab în patch-ul curent, microfoane/dispozitive USB/Bluetooth și niveluri ascultate, Caster cu mix real și delay OBS/spectator, capacitatea hostului/TURN, instalare curată și migrare, notificarea prin release publicat și accesul efectiv al rolurilor Discord.

Doi clienți modificați pot păstra media P2P deja negociată între aliați/lobby/casteri. Revocarea închide aplicațiile normale și semnalizarea, fără revocare criptografică a transporturilor externe. Discord și stream sniping nu sunt blocate. Casterul nu obține automat date/poziții spectator; delay-ul este manual și nu autorizează voce către jucători.

Rezultatele sunt o verificare internă a comportamentelor enumerate, nu audit independent, aprobare Riot sau promisiune că toate funcțiile merg în orice situație. Pentru detalii: [inventar](function-checklist.ro.md), [securitate](security-review.ro.md), [comparație](comparison.ro.md), [OBS](caster-mode.ro.md).