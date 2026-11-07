# Verificări Voxdria Player 0.4.3

Verificare locală Windows, 7–8 noiembrie 2026. Variantă experimentală pentru test în custom. Casterul existent rămâne la 0.4.2; serverul compatibil cu noul jucător este 0.4.3.

## Rezultate automate

| Verificare | Rezultat |
| --- | --- |
| Sursa originală locală vs. referința inclusă | 213/213 fișiere identice SHA-256 |
| Copii originale folosite în execuție și resurse | 65 fișiere identice SHA-256 |
| Teste rapide ale motorului original, rulate pe copiile utilizate | 568 trecute |
| Teste CV originale cu imagini sintetice | 136 trecute, 27 omise |
| Adaptoare noi de invitație/autorizare/volume | 8 trecute |
| Regresii rapide din implementarea precedentă | 644 trecute |
| Server: permisiuni, administrare, Caster și motor nou | 333 trecute |
| Integrare server existent | 19 trecute |
| Interfață organizator/moderare | 12 verificări trecute |
| Audio original între adversari, server local real | 8 scenarii trecute |
| Rust Windows | 47 trecute, 1 test hardware ignorat |
| TypeScript aplicație și teste | Trecut |
| Build Windows NSIS x64, Player 0.4.3 | Trecut; instalator generat, verificare SHA-256 |
| Analiza statică Rust | Trecut, cu două excepții de stil delimitate mai jos |
| Dependențe npm folosite de aplicație și server | 0 vulnerabilități raportate de npm audit |
| Dependențe Rust | 0 vulnerabilități în cargo audit; 2 notificări informative în lockfile |

Aceste suite se suprapun parțial; numerele nu reprezintă funcții independente. Cele 27 de teste omise cer înregistrări/capturi reale sau alte date opționale care lipsesc. Nu au fost declarate trecute. Testul nativ ignorat cere un microfon fizic și condiții interactive.

Instalatorul a fost compilat și verificat ca artefact, nu instalat peste aplicațiile aflate în uz. Nu se declară efectuată o probă interactivă de instalare/dezinstalare sau o sesiune LoL reală. Acesta este un build nesemnat pentru test.

Un test de temporizare al motorului vechi a eșuat în timpul rulărilor paralele; suita completă a trecut la reluarea separată (19/19). Nu a fost slăbită verificarea pentru a obține rezultatul.

## Ce demonstrează proba audio

Două pagini de test au folosit panoul real al jucătorului, interfața reală de organizare, HTTP/WebSocket locale și implementările originale Orchestrator, GameState, AudioService și PeerConnection. Starea jocului/captura au fost simulate, iar microfoanele au generat tonuri. O fabrică explicită de test a permis ICE local; producția rămâne configurată pentru TURN.

S-au verificat: aprobarea RV pentru echipe opuse; niciun microfon înainte de meci; sunet în ambele sensuri; voce oprită la distanță și reluată în apropiere; mute individual, mute microfon/ascultare și PTT; refuzul accesului neautorizat și al interogării altei identități; izolarea Casterului; moderarea și închiderea microfoanelor la revocare/final de joc. RMS primit: aproximativ 0,085 în fiecare sens, pe fluxurile sintetice. Acesta nu este un test de microfon/căști reale sau al driverului GPU.

## Sursa originală și Caster

Referința este LoLProxChat 0.5.24 din folderul furnizat de proprietar. Hash-ul arhivei originale: `f3ac5184644b5540905adc2db241e3af35c0a740b48738a7117a202cdf8d9ab3`. `upstream/SOURCE.json` și `npm run verify:source` verifică referința și copiile de execuție.

Rust 1.99 sugerează două schimbări de stil în captura originală: `chunks_exact_to_as_chunks` și `unnecessary_cast`. Pentru păstrarea byte-for-byte a acelui fișier, doar aceste două lint-uri sunt exceptate pe declarația modulului din adaptorul nativ. Nu au fost dezactivate verificările de siguranță sau toate avertismentele. Restul analizei rulează cu avertismentele tratate drept erori.

Hash-urile fișierelor protejate din proiectul Caster existent au rămas identice. Fișierele Caster/organizare copiate în noua ramură rămân identice; nu se livrează un instalator Caster 0.4.3.

Manifestele vechi din referința upstream sunt păstrate ca proveniență, fără a fi folosite la instalarea dependențelor aplicației. Auditul de 0 vulnerabilități npm se referă la lockfile-urile întreținute din rădăcină și `server/`, nu la acele manifeste istorice.

Cargo audit păstrează notificările `RUSTSEC-2024-0370` (proc-macro-error, neîntreținut) și `RUSTSEC-2024-0429` (glib, unsound). Verificarea `cargo tree --locked --offline --target x86_64-pc-windows-msvc -i <pachet>` nu găsește niciunul dintre pachete în ținta Windows. Notificările rămân în lockfile pentru alte platforme, fără a fi ascunse sau reclasificate drept remediate. Absența vulnerabilităților raportate de un audit nu demonstrează absența tuturor vulnerabilităților.

## Ce rămâne pentru un custom real

- Două PC-uri: microfoane, căști, dispozitive selectate, Windows/WebView2 și trafic prin TURN extern.
- Cameră/minimapă reală: adversari vizibili, ieșire din cameră, fog of war, skin-uri, moarte/respawn și reconectare.
- Lag, FPS, CPU/GPU și resetarea DirectX la apropierea de adversar. Logurile indică `DXGI_ERROR_INVALID_CALL`; cauza nu este demonstrată și rezolvarea nu este confirmată.
- OBS, rute audio fizice, delay de spectator/stream, izolare și o sesiune cu zece jucători.
- Cele 27 de teste dependente de capturi, după colectarea datelor necesare.

Originalul filtrează local camera/ascultarea și poate reveni la proximity dacă nu poate încărca șabloanele. TURN nu este filtrul strict de media al versiunii precedente. Un client modificat poate ignora filtrarea locală. Această variantă nu are aprobare Riot și nu oferă garanție anti-cheat ori de absență a scurgerilor de informații.

Instrucțiuni: [configurare și test](player-original.ro.md).
