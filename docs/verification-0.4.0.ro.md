# Verificări RiftVoice / Rift Caster 0.4.0 — 7 noiembrie 2026

Rezultatele privesc sursele din copia locală RiftVoice-Caster și cele două build-uri Windows NSIS x64 0.4.0. Sunt pachete pentru testare în comunitate, nesemnate și fără aprobare Riot. Serverul public și proiectul/instalarea din D:\Rift-voice nu au fost înlocuite prin aceste verificări. Un installer nou nu actualizează Render.

## Rezultate executate

| Verificare | Rezultat și întinderea probei |
|---|---|
| Type-check client și arbore de teste | Trecut după integrarea Discord |
| Client, rulare completă stabilă | 793 trecute, 2 omise; 52 suite active trecute, înaintea celor două teste noi pentru butoanele Discord |
| Client, regresie finală după Discord | 633 trecute în 47 suite fără CV; include cele două teste noi. Recunoașterea vizuală nu s-a modificat după rularea completă. Rezultă 795 cazuri distincte trecute în aceste rulări, nu 795 într-o singură rulare completă |
| Server final | 310 trecute, 23 fișiere; inclusiv autorizare, lobby, moderare, semnalizare și limitarea cozilor de ieșire |
| Integrare end-to-end | 19 trecute, 2 suite |
| Rust release/locked | 47 trecute; un test hardware omis intenționat în rularea implicită și executat separat cu succes |
| Clippy release/all-targets | Trecut cu avertismentele tratate ca erori |
| Frontend de producție | Trecut cu --fail-on-warnings și bugetele explicite pentru resurse desktop |
| Două installere Windows | RiftVoice și RiftVoice Caster 0.4.0 construite cu succes; hash-uri verificate înaintea împachetării |
| Compatibilitate player–Caster | 8 verificări grupate, interfețele reale și server local autentificat; două pagini cu WebRTC real și audio sintetic |
| Organizare și aspect Caster | 11 verificări grupate; server local, admin/moderator fictivi, două înscrieri, capturi la 800/520 px fără overflow orizontal |
| Natural/Robotic opțional | Probe Web Audio și WebRTC cu tonuri sintetice, bypass, intensitate zero, schimbare live și reluare context trecute |
| Voce adversari, filtrare media | 15 scenarii cu WebRTC/RTP real pe loopback, autentificare de producție și rapoarte vizuale sintetice; fără client League sau microfon |
| Dispozitive și microfon Windows | Proba nativă QA a enumerat ieșirile Realtek, a deschis microfonul implicit la 48 kHz și a detectat semnal local |
| Ieșire audio nativă Windows | Test separat de 3 s și QA cu pornire/mute/stop; 48 kHz, 0 underruns și 0 cadre eliminate în eșantioanele măsurate |
| Captură OBS 33.0.1 în 0.4.0 | Înregistrare locală de 14,93 s, sursă audio numai din procesul QA cu AppAudioOutput curent: ton 440 Hz detectat și liniște în ultimele 2 s; microfon/desktop excluse, fără stream |
| Restricții native Caster | QA a confirmat refuzul comenzilor capture_minimap și get_live_client_data în fereastra Caster |
| npm audit, inclusiv dezvoltare | Client: 0 alerte cunoscute după remedierea locală deepmerge; server: 0 |
| RustSec, baza actualizată | 0 vulnerabilități în lista principală; două avertismente informative pentru dependențe Linux absente din arborele Windows verificat |

Fișierele locale de dovadă sunt în verification/: compat-verified-final.log, compat-discord-client-regression.log, compat-discord-typecheck.log, compat-discord-test-typecheck.log, compat-server-verified.log, compat-e2e-final.log, compat-final-native-tests.log, compat-final-native-clippy.log și compat-final-frontend.log. Build-urile sunt consemnate în compat-final-player-installer.log și compat-final-caster-installer.log. Datele locale de verificare nu sunt incluse în sursele publice ori release.

## Compatibilitate, permisiuni și audio

Proba finală de compatibilitate folosește panoul real al jucătorului, interfața Caster, LobbyVoiceController, AudioService și SignalingService. Confirmă invitația completă copiată, cererea în așteptare, aprobarea și rezervarea privată, audio între coechipieri înainte de meci, închiderea la moderare, reconectarea explicită după reactivare, mutarea pe altă echipă și închiderea tuturor canalelor de lobby la prima admitere în meci. Lipsa TURN produce o stare de indisponibilitate, fără a declara apelul funcțional. Factory-ul de test permite explicit ICE local; producția păstrează TURN-only. Aceasta nu este o probă între două rețele publice.

Aceeași probă verifică gate-ul vocilor primite fără oprirea transmisiei proprii și controalele Caster: niciun microfon înainte de admitere sau pentru spectator, mute/deafen, volume de transmisie/comentariu, PTT apăsat/eliberat, pierdere focus și protecția câmpurilor de text, gate independent, cleanup la ieșire și afișarea notificării de update. Comenzile native pentru Discord și actualizare sunt simulate în proba de interfață; validarea destinațiilor/asseturilor este testată separat în Rust. Nu se declară o probă de update între două release-uri publicate sau acces efectiv pe fiecare rol Discord.

Organizatorul este verificat cu credențiale fictive: generare ascunsă înainte de autentificare, parolă greșită refuzată și ștearsă, moderator nominal, maximum zece participanți/cinci pe echipă, link Riot introdus manual separat de codul RV-, cereri și aprobare, mutare/schimb, invitație personală de caster, protecția administratorului și istoric nominal vizibil numai administratorului. Logout-ul elimină invitațiile și istoricul din interfață. Testele de server verifică și expirarea, revocarea bearer-ului, izolarea rolurilor, refuzul video/data channels, limitele inputului/flood-ului și clienții lenți. Mutarea din panou schimbă repartizarea vocală; nu operează lobby-ul Riot.

Proba de media a adversarilor verifică ambele acorduri, distanța, camera, iconul lipsă, încercarea de unmute forțat, expirarea/replay-ul unui cadru, oprirea capturii, moarte/respawn și dezactivarea opțiunii. RTP este eliminat pe server când condițiile lipsesc. Vizibilitatea este însă raportată de client și poate fi falsificată; proba nu demonstrează o sursă de încredere pentru fog of war. Modul rămâne opțional și dezactivat implicit.

Rapoarte: compatibility-ui-proof.json, organizer-ui-proof.json, camera-media-loopback-result.json și compat-voice-changer.json. Capturile de aspect sunt în verification/organizer-browser/. Lista funcțiilor, dovezile și limitele fiecăreia sunt în [inventarul funcțiilor](function-checklist.ro.md).

## Windows și hardware

Aplicația QA a fost construită din sursele curente cu protocolul local de producție, profil WebView separat și fereastră Caster. A verificat dispozitivele, analiza locală a microfonului, ieșirea audio nativă și refuzul comenzilor de captură/date de joc. Raportul este compat-native-hardware-result.json, cu runId verificat; logul este compat-native-qa-final.log. Nu s-a stocat și nu s-a transmis în rețea sunetul microfonului. Sunt salvate doar metadatele măsurătorii.

Microfonul Realtek a returnat semnal la 48 kHz, cu vârf 1. Aceasta indică atingerea limitei numerice, deci nivelul/AGC și calitatea vocii trebuie reglate și ascultate într-o probă cu căști. Reușita capturii nu dovedește absența clipping-ului, ecoului sau zgomotului. Proba ieșirii native a raportat 0 underruns și 0 cadre eliminate în intervalele măsurate; nu confirmă automat sursa OBS sau volumul auzit de utilizator. Testul hardware omis implicit a fost executat separat: compat-native-hardware-paced.log.

Executabilul nativ Caster 0.4.0 a fost pornit cu profil separat și inspectat: interfața întunecată lizibilă, panou de organizare, generator ascuns înainte de autentificare, microfon oprit și PTT disponibil. Butoanele Discord au fost adăugate ulterior și sunt acoperite de regresiile de interfață și Rust; nu au fost folosite pentru autentificare sau schimbări în Discord. Procesele proprii de probă au fost închise. Nu s-a instalat/dezinstalat peste aplicația existentă și nu s-a făcut upgrade pe Windows curat.

Captura OBS 33.0.1 a fost repetată în copia portabilă QA, pe codul AppAudioOutput 0.4.0. Analiza înregistrării de 14,93 s a găsit tonul de 440 Hz și RMS zero în ultimele două secunde după oprire. Sursa scenei a fost numai aplicația QA plus un cadru negru, cu microfonul și desktopul oprite, fără streaming. Raport: compat-obs-native-capture-result.json; log: compat-obs-recording.log. Procesul propriu a fost închis, conexiunea temporară dezactivată și fișierele private ale probei șterse. Aceasta nu confirmă un mix de comentatori sau delay-ul într-un custom real.

Proba media prin TURN extern aparține versiunii 0.2.0. În 0.4.0 s-au repetat Web Audio/WebRTC și filtrarea media pe loopback; nu s-a repetat TURN extern. Vezi [0.2.0](verification-0.2.0.ro.md) și [0.3.0](verification-0.3.0.ro.md) pentru delimitarea probelor anterioare.

## Alerte și remediere de dependențe

Biblioteca deepmerge din lanțul Jest avea o vulnerabilitate publicată fără versiune upstream reparată la revizie. Copia MIT locală vendor/deepmerge, versiunea 4.3.1-riftvoice.1, filtrează recursiv __proto__, constructor și prototype din ambele intrări. Testele includ sursă/țintă malițioase, prototip nul, obiecte imbricate și comportamentul legitim de merge. Instalarea curată npm ci și testul dedicat au trecut. Nu este o versiune oficială upstream și nu este cod livrat în bundle-ul aplicației.

RustSec semnalează informativ proc-macro-error 1.0.4 (RUSTSEC-2024-0370, unmaintained) și glib 0.18.5 (RUSTSEC-2024-0429, unsound). Ambele sunt absente din arborele Windows x86_64 verificat. Nu sunt ascunse din audit și nu se declară un build Linux verificat. Rezultatele auditului sunt compat-client-audit.json, compat-server-audit.json, compat-rust-audit.json și compat-windows-dependencies.txt. Detalii despre remedieri și riscuri: [revizia de securitate](security-review.ro.md).

## Ce necesită încă probe reale

Cele două suite vizuale omise cer înregistrări reale: tests/cv/fixtures-games/index.json cu imagini etichetate și CAMERA_EVAL cu eval.json/debug frames. Utilizatorul a confirmat că nu are încă aceste date. Celelalte 25 de cazuri anterior omise au trecut cu imagini publice și rămân active local. Aceste imagini nu sunt prezentate drept meciuri reale. Arhiva surselor nu include fixture-urile descărcate opțional, astfel încât numărul testelor dintr-un CI nou poate diferi.

Rămân necesare:

- un custom cu zece persoane pe calculatoare/rețele diferite, numele exact returnat de clientul LoL curent, echipe confirmate, lobby, trecere în meci, reconnect și moderare;
- cameră/fog of war, suprapuneri reale, moarte/respawn și alt-tab în patch-ul LoL curent, fără a oferi acces la poziții ascunse;
- ascultarea microfoanelor reale, reglarea nivelurilor, dispozitive USB/Bluetooth, schimbarea/scoaterea lor și combinații de DPI/taste;
- Caster separat, captură OBS actuală, controlul mixului și sincronizarea delay-ului spectator/stream;
- TURN extern și capacitatea hostului actual în apeluri simultane;
- instalare pe Windows curat, upgrade între release-uri publicate, verificarea notificării în acel flux și o probă cu fiecare rol al canalului Discord.

Izolarea casterilor este structurală și nu depinde de delay. Casterul nu primește automat vocea jucătorilor ori date de spectator. Mute/PTT din aplicație nu controlează Discord sau sursele independente OBS. Doi clienți modificați pot păstra media P2P deja negociată între aliați/lobby/casteri; revocarea limitează aplicațiile normale și semnalizarea, fără a garanta oprirea unui transport extern. Nici aceste teste, nici un custom nu certifică securitate completă sau aprobare Riot.

## Date private și distribuție

Camerele și istoricul sunt temporare fără ORGANIZER_STORE_PATH privat pe volum persistent. Auditul numește moderatorul și ținta, păstrează 1.000 de acțiuni și afișează ultimele 200 administratorului; nu este un registru extern imuabil. Parolele și conturile nominale se configurează exclusiv pe server. Vezi [organizare](organizer.ro.md).

Pachetele folosesc numai installerele selectate explicit, sursele corespunzătoare, licența, ghidurile și hash-uri SHA-256 verificate. Executabilul brut target/release/riftvoice.exe poate aparține altei variante sau QA și nu intră în distribuție. Sunt excluse credențialele, profilurile, capturile, rapoartele locale, dependențele instalate și cache-urile. Listele și verificările de arhivă reduc riscul de includere accidentală; nu identifică orice secret arbitrar posibil. Pentru GitHub browser sunt pregătite loturi sub limita de 100 de fișiere, cu structura serverului păstrată.

Pentru datele lipsă din custom: activează Diagnostic înainte de meci și lasă arhiva să se finalizeze. ZIP-ul este în %LOCALAPPDATA%\com.riftvoice.desktop\games. Poate conține numele participanților și cadre de minimapă; inspectează-l înainte de partajare. Un replay .rofl singur nu înlocuiește cadrele necesare.
