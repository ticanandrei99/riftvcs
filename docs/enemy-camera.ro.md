# Proximity standard — Voxdria 0.4.2

Proximity este modul standard implicit pentru jucători: coechipieri din apropiere și adversari apropiați identificați vizibil în camera proprie. Nu este necesară activarea unei funcții experimentale. Ascultarea adversarilor pornește implicit; fiecare persoană o poate opri sau folosi mute/deafen, iar ambele persoane trebuie să o păstreze activă. Caster Mode rămâne într-un canal separat de jucători.

## Regula de ascultare

Sunt necesare simultan: invitații valide în aceeași cameră, echipe opuse, clienți compatibili, acordul ambelor persoane, ambii jucători în viață, propria poziție identificată fără extrapolare, iconul adversarului identificat direct în imaginea recentă a minimapei și în interiorul dreptunghiului camerei, distanță sub 1.350 unități de joc. Până la 900 unități volumul este întreg, apoi scade spre zero la 1.350.

Camera mutată departe nu permite ascultarea întregii hărți. Ascultarea este direcțională: faptul că tu auzi pe cineva nu îl face automat să te audă. Pentru adversari nu folosim memorarea iconurilor dispărute, identificarea prin eliminare, presupunerea că un inamic este sub un aliat sau camera păstrată după dispariția marginilor. Iconurile neclare/suprapuse, camera nerecunoscută, poziția pierdută, captura oprită și moartea închid ascultarea. Asta poate produce întreruperi; recunoașterea în meci rămâne de verificat.

## Configurare

1. Din server/: npm ci --include=dev, npm run build, npm start.
2. Configurează PLAYER_GRANTS_JSON și CASTER_GRANTS_JSON conform caster-mode.ro.md.
3. Configurează TURN valid: TURN_KEY_ID + TURN_KEY_API_TOKEN, TURN_URLS + TURN_USERNAME + TURN_PASSWORD sau TURN_SERVER + TURN_SECRET. Secretele rămân pe server.
4. Serverul 0.4.2 activează gateway-ul implicit când ENEMY_CAMERA_VOICE lipsește; render.yaml folosește 1. Dacă Render păstrează valoarea veche 0, schimb-o la 1 și repornește serviciul. Valoarea 0 rămâne o suspendare explicită pentru operator; alte valori nevalide sunt refuzate.
5. /health trebuie să indice authenticationRequired=true, teamIsolation=true, enemyCameraVoice=true. teamIsolation desemnează separarea rutelor directe; adversarii comunică exclusiv prin filtrul media.
6. În ambele aplicații configurează adresa HTTPS a serverului, introdu invitațiile și păstrează activă opțiunea pentru adversari. Controalele vechi de cameră/echipă se aplică aliaților și nu pot lărgi regula adversarilor.

Serverul public existent nu a fost actualizat. Installerul nou singur nu activează funcția pe un server vechi. Clienții fără această capabilitate rămân separați pe echipe. Lipsa TURN nu deschide o conexiune directă de rezervă.

## Filtrarea efectivă și confidențialitate

Conexiunile adversarilor se termină în componenta WebRTC a serverului, werift 0.26.0. Oferta, răspunsul și candidații ICE ai unui jucător nu sunt trimiși celuilalt jucător. Serverul verifică permisiunea înaintea fiecărui pachet audio și elimină pachetele nepermise. Unmute sau volum maxim într-un client modificat nu recuperează pachetele eliminate.

Un raport este valabil maximum 450 ms. Repetarea aceleiași imagini nu îi prelungește viața. Provocările temporare emise de server împiedică acceptarea rapoartelor întârziate cu o provocare expirată. Pierderea raportării închide ruta. Audio-ul deja livrat poate rămâne puțin în buffer; aplicația nu poate șterge ce a primit deja un participant.

Există limite pentru legături, coada de negociere, timpul de conectare, dimensiunea și rata pachetelor. Producția acceptă doar audio Opus și candidați TURN publici IPv4 pentru această rută. Video, data channels și candidații care vizează rețeaua privată sunt refuzați. Releele exclusiv IPv6 nu sunt suportate aici.

Audio-ul adversarilor este criptat până la server și recriptat către destinatar. Operatorul media trebuie considerat de încredere și poate avea acces tehnic la audio; serverul nostru nu îl înregistrează. Această rută nu oferă criptare end-to-end între adversari. Aliații și casterii păstrează infrastructura existentă.

Un 5v5 poate crea 25 perechi de adversari și 50 conexiuni WebRTC pe server. Testul pe două sesiuni nu verifică încărcarea unui eveniment. Verifică resursele hostului și cotele TURN în mediul ales, inclusiv dacă folosești Render.

## Limita esențială

Folosim captura locală deja disponibilă jucătorului. Nu citim memoria jocului, nu accesăm poziții ascunse sau date de spectator și nu ocolim Vanguard.

**Un client modificat poate fabrica raportul de vizibilitate.** Provocările și filtrul media nu dovedesc că pixelii raportați sunt sinceri. Funcția nu este anti-cheat sau atestare Riot și nu garantează absența scurgerilor într-un eveniment cu participanți adversariali. O garanție mai puternică necesită o sursă de vizibilitate autorizată și verificabilă; proiectul nu presupune că aceasta există.

Voxdria nu are aprobare Riot pentru această modificare. Pachetul este destinat mai întâi testării în custom, cu arhitectura și limitele declarate exact.

## Verificare

- npm run verify: client, server și integrare.
- node scripts/test-turn-relay.cjs --camera-local: două sesiuni autentificate, WebRTC real pe loopback, tonuri și rapoarte sintetice, fără microfon.
- Setează RIFTVOICE_TURN_TEST_CREDENTIALS la un fișier privat cu iceServers; node scripts/test-turn-relay.cjs --camera-relay verifică filtrul prin TURN extern real.
- tests/cv/enemy-camera.test.ts procesează pixelii portretelor publice prin TrackingService și verifică oprirea la dispariția iconului/camerei; nu reprezintă un meci real.

CAMERA_MEDIA_LOOPBACK_TEST=1 este exclusiv pentru testele locale: bind 127.0.0.1 și refuz cu NODE_ENV=production. Nu îl seta pe host. Probele de browser cer Edge și porturile 9419–9421 libere.

În custom real trebuie verificate panning, fog of war/tufișuri, suprapuneri de iconuri, moarte/respawn, alt-tab, reconectare, mute/PTT, dispozitive/rețele diferite și un streamer pe Caster. Sunt necesare și probe cu zece jucători. Rapoartele sintetice demonstrează filtrarea, nu exactitatea vizibilității din League.
