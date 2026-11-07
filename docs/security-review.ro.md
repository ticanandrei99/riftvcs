# Voxdria / Voxdria Caster 0.4.1 — verificare de securitate

Revizie internă a surselor, configurației native/web, rutării și dependențelor, în 6–7 noiembrie 2026. Nu este certificare, audit Riot sau garanție de absență a vulnerabilităților. Copia de lucru este Voxdria-Caster, derivată din D:\Rift-voice\main-project. Rezultatele executate sunt în [raport](verification-results.ro.md), iar funcțiile și probele lor în [inventar](function-checklist.ro.md).

## Remedieri și limite verificate

| Constatare / risc | Măsură aplicată |
|---|---|
| Cod RV- salvat fără cerere vizibilă înainte de meci | Panou de conectare vizibil, parsare invitație completă, Riot ID, cerere/aprobare explicită și stare precisă |
| Lipsa vocii înainte de meci | Canal de lobby cu rezervare privată după aprobare, rol impus de server, echipe izolate și bearer separat |
| Sesiune veche la reconnect / mutare echipă / meci | Revocare înainte de înlocuire, close terminal la takeover/moderare, cleanup și protecție împotriva callback-urilor async vechi |
| Refolosirea cache-ului TURN după schimbarea sesiunii | Cache și cereri în curs legate de bearer; răspunsul vechi nu intră în noua sesiune; timeout și no-store |
| Coduri sau parole în mesaje de diagnostic | Redactare pentru câmpuri sensibile, Bearer și coduri recognoscibile; bootstrap nu imprimă fragmente din JSON invalid |
| Rol / roster Caster nevalidat înainte de media | Validare identitate, rol, bearer și listă unică/bounded; un singur ready; microfon numai după admitere validă |
| Vulnerabilitate prototype poisoning în deepmerge din uneltele Jest | Copie locală MIT 4.3.1-riftvoice.1, filtrare recursivă a cheilor de prototip din ambele intrări și teste împotriva atacului publicat |
| Un credential privat aleatoriu începe cu RV- | Parserul serverului distinge formatul complet al codului comun de prefixul accidental al unui token personal |
| Mix de stream fără control colectiv | Gate pe vocile primite, independent de TX; respectă mute individual/deafen și reconectarea |
| Acces pe baza numelor sau rolurilor pretinse | Invitație + aprobare organizator, identitate/echipă/rol din grant; numele declarat rămâne neautentificat Riot |
| Caster/spectator către jucători sau poziții ascunse | Canale/managere separate, fără punte de semnalizare/audio; fără date sau comenzi native de spectator/captură în Caster |
| Primirea RTP de adversar cu volum local zero | Rutele directe rămân separate pe echipe; gateway standard care elimină RTP fără permisiune vizuală proaspătă, distanță și sesiuni valide |
| Acces HTTP la alt jucător / credențiale TURN | Bearer legat de socket și expirare; volume doar pentru rol player și identitatea/camera proprie |
| Video, data channel, payload arbitrar | SDP/ICE audio-only, limite de mărime, tipuri permise și țintă în același canal |
| Flood / încercări de parolă / blocare proces | Limite IP/concurență, timeouts, scrypt bounded, cozi limitate, heartbeat și tratarea erorilor WS |
| Client lent care acumulează răspunsuri WebSocket | Limită comună de 512 KiB pentru coada de ieșire și mesaj, închidere la depășire/eroare; toate rutele serverului folosesc aceeași funcție de trimitere |
| Moderator pretins admin / mute administrator | Autoritate numai din credențialele serverului, refuz server și audit nominal al încercării |
| Invitații private în roster / stocare neprotejată | Rezervări private ascunse din roster, sessionStorage, fișier explicit .private.json cu scriere atomică și permisiuni restrictive unde OS le aplică |
| Navigare externă / IPC folosit din altă fereastră | CSP, origine locală, navigare blocată, listă de comenzi nativă pentru fiecare fereastră |
| URL de update arbitrar / installer greșit | Endpoint fix, HTTPS fără redirect, limită timp/mărime, semver și asset exact pentru player/Caster; fără execuție automată |
| Redenumire care rupe invitațiile sau notificarea clienților vechi | Parser pentru etichetele vechi/noi, invitație generică compatibilă, identificatori/preferințe stabile și aliasuri de installer identice prin SHA-256; instalarea/migrarea Windows rămân probe distincte |
| Buton Discord folosit pentru o destinație arbitrară | Comandă nativă cu două valori enum și URL-uri fixe; destinația privată refuzată în player, fără token, login, roluri sau transport audio Discord |

## Dependențe și avertismente

Auditul npm curent și verificarea RustSec sunt consemnate cu rezultatele exacte în raport. Zero alerte cunoscute nu înseamnă zero vulnerabilități.

[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) nu oferea o versiune upstream reparată la această revizie. Remedierea din vendor/deepmerge este o modificare locală explicită, testată, nu o versiune oficială și nu o simplă ignorare a alertei. Codul, tipurile și licența sunt incluse în surse; npm ci îl instalează reproductibil. Instrumentele de testare nu intră în bundle-urile aplicației.

Cargo.lock include și dependențele Linux ale Tauri: glib 0.18.5 (RUSTSEC-2024-0429, unsound) și proc-macro-error 1.0.4 (RUSTSEC-2024-0370, unmaintained). Ambele sunt absente din arborele țintei Windows x86_64 verificat. Avertismentele rămân documentate, nu sunt ascunse și nu se declară un build Linux verificat. Actualizarea lor cere o combinație compatibilă din ecosistemul Tauri/GTK; eliminarea arbitrară din lockfile ar strica reproductibilitatea.

Build-ul frontend păstrează bugete explicite pentru resurse desktop instalate local: 768 KiB per intrare și 32 MiB per asset offline. Acestea includ motorul ONNX/WASM; nu sunt pagini descărcate în timpul unui apel. Compilarea de producție eșuează la avertismente webpack, în loc să le ignore. Compilatorul/linterul nativ și testele sunt raportate separat.

## Riscuri care nu pot fi eliminate prin această revizie

- Riot ID, echipa și vizibilitatea sunt raportate de client, apoi aprobate/verificate în limitele aplicației. Un client modificat le poate falsifica. Nu există atestare Riot sau acces autorizat presupus la poziții ascunse.
- Doi clienți modificați pot continua media P2P deja negociată între aliați/lobby/casteri. Revocarea închide aplicațiile normale, bearer-ul și semnalizarea, fără a constitui revocare criptografică a unui transport extern deja stabilit.
- Parolele/granturile împărțite, administratorul hostului, TURN și comunicațiile externe sunt relații de încredere. Nu se blochează Discord, urmărirea streamului sau alte programe.
- Izolarea casterilor nu depinde de delay. Delay-ul și sincronizarea OBS se configurează manual; un spectator întârziat nu primește dreptul de a transmite către jucători.
- Installerele Windows sunt nesemnate. Updaterul notifică și deschide pagina fixă de release; instalarea automată cere un canal semnat și o probă reală de update/rollback.
- Proximitatea depinde de minimapă și poate greși. Nu există garanție de absență a sancțiunilor și nici de acceptare Riot. Custom games nu sunt tratate ca excepție automată.

## Referințe și pregătire pentru Riot

[Politicile generale Riot](https://developer.riotgames.com/policies/general) cer înregistrarea și evaluarea produsului și a modificărilor prin Developer Portal, precum și evitarea avantajului nepermis. [Documentația League](https://developer.riotgames.com/docs/lol) descrie serviciile/API-urile relevante. Trebuie prezentate exact API-urile locale folosite, captura vizuală locală, topologia audio, ce date părăsesc calculatorul, limitele raportării clientului și rezultatele din custom real. Nu a fost trimisă o cerere de evaluare către Riot în această sesiune. Codul nu încearcă să ocolească Vanguard.

Pentru configurație și limite practice: [organizare](organizer.ro.md), [OBS/caster](caster-mode.ro.md), [model de amenințări](threat-model.md). Capturile și arhivele de debug pot conține nume sau cadre de minimapă; inspectează-le înainte de partajare.
