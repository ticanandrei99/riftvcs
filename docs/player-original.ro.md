# Voxdria 0.4.3 — motor original, jucător

Variantă de test pentru custom, cu motorul original LoLProxChat 0.5.24 și interfața Voxdria. **Casterul 0.4.2 existent nu se reinstalează și nu se modifică.** Jucătorul 0.4.2 și sursele sale rămân disponibile separat.

## Modificări

Tracking-ul, camera, calculul volumelor, microfonul, redarea, WebRTC și captura GDI provin din sursa originală, fără editarea fișierelor originale. Adaptoarele adaugă invitația aprobată, adresele serverului, autorizarea și câteva stări de diagnostic. Verificare: `npm run verify:source`.

Rămân tema roșie, setările, codurile RV, aprobarea, mute individual/colectiv, push-to-talk, Discord și notificarea de actualizare. Pregame există numai înscrierea: jucătorul nu mai are voce de lobby. Efectele vocale Voxdria și previzualizarea microfonului procesat sunt inactive în varianta cu audio original.

## Actualizarea serverului, înainte de test

1. Încarcă toate sursele 0.4.3 în repository, păstrând structura directoarelor. Sursele pentru GitHub și instalatorul pentru Releases sunt separate.
2. În Render păstrează serviciul existent: Root Directory `server`, Build Command `npm ci --include=dev && npm run build`, Start Command `npm start`, Health Check `/health`.
3. Păstrează parolele, conturile moderatorilor, configurația TURN, restricțiile de origine și stocarea organizatorului din Environment. Nu publica parole. `ENEMY_CAMERA_VOICE` controlează numai motorul vechi; noul motor nu depinde de acel comutator.
4. Publică noul cod și verifică `/health`: `serverVersion: "0.4.3"`, `originalPlayerVoice: true`, `originalPlayerProtocol: 1`, `originalPlayerFiltering: "upstream-client-camera"`.
5. Instalează **Voxdria_0.4.3_x64-setup.exe pe ambii jucători**. Închide vechiul Voxdria și LoLProxChat înainte de test. Păstrează Casterul existent.

Pregătirea arhivei nu actualizează serverul în producție. Serverul 0.4.2 nu are ruta `/player/ws`; noul jucător cere actualizarea, fără revenire la un server neautentificat.

## Probă cu două persoane

1. Administratorul creează camera în Caster și distribuie codul vocal RV. Linkul `gg.riotgames.com` este separat, pentru lobby-ul LoL.
2. Jucătorii introduc codul și Riot ID-ul. Administratorul îi aprobă pe echipele reale. Înscrierea pregame nu deschide microfonul.
3. Porniți un custom în echipe opuse. Vocea începe după detectarea meciului și autorizare.
4. În modul de cameră activ implicit, fiecare trebuie să vadă iconul adversarului în dreptunghiul propriei camere de pe minimapă. Direcțiile sunt independente: faptul că eu te văd nu înseamnă că tu mă vezi. Verifică microfonul, ieșirea, mute/deafen și PTT.
5. Testează ambele sensuri, ieșirea din cameră, fog of war, moarte/respawn, mute individual, moderare și finalul meciului. Notează separat când apare lagul sau eroarea GPU.

Originalul păstrează și modul de distanță. Camera mode urmărește iconurile din cameră; nu promite un prag strict de 1.350 unități. Dacă lipsesc imaginile de identificare, originalul revine la proximity. Nu modifica Vanguard, TDR sau securitatea Windows pentru test.

## Limite

Originalul filtrează ascultarea local. Serverul calculează distanțe fără a fi o autoritate pentru fog of war; TURN transportă vocea între jucători. Un client modificat poate ignora filtrul local. Estimările vizuale pot greși sau întârzia. Revenirea la original nu garantează conformitatea Riot, absența scurgerilor de informații sau eliminarea lagului. Nu există aprobare Riot pentru această variantă.

Casterii/spectatorii nu intră în camerele jucătorilor și nu pot interoga volumele lor. Nu obținem automat date de spectator sau poziții ascunse. Organizatorul configurează delay-ul streamului/spectatorului. Codul vocal nu poate preveni folosirea altui dispozitiv/altui cont pentru a retransmite informații.

## OBS

Streamerul păstrează **Voxdria Caster 0.4.2**, invitația separată și aprobarea personală. Folosește captura audio a aplicației Caster sau ieșirea dedicată deja configurată. Evită capturarea aceleiași voci simultan prin Desktop Audio și aplicație. Oprirea vocilor din mix, mute, deafen și PTT rămân cele existente. Nu redirecționa ieșirea Caster în microfonul jucătorului. Vezi [ghidul Caster/OBS 0.4.2](caster-mode.ro.md).

## Replay și diagnostic

Replay-urile au fost găsite în `C:\Users\tican\Documents\League of Legends\Replays`. Fișierele `.rofl` nu includ conversația Voxdria, starea TURN sau jurnalul microfonului; singure nu explică lipsa sunetului.

Adaptorul nou scrie local maximum 200 de stări simple per pornire, fără nume, coordonate, IP-uri, parole sau audio, în `%LOCALAPPDATA%\com.riftvoice.desktop\lolproxchat.log`. Pentru probleme, activează Debug înaintea meciului și păstrează pachetul local generat. Acesta poate conține imagini de minimapă vizibilă; verifică-l înainte de distribuire.

Logul LoL `2026-11-07T22-04-21` conține `DXGI_ERROR_INVALID_CALL`; placa selectată este NVIDIA RTX 3050 Laptop. Aceasta confirmă o problemă DirectX în acea sesiune, fără să dovedească o cauză în Voxdria. Apropierea de adversar și resetarea driverului nu au o relație cauzală demonstrată. Replay-ul nu a fost urmărit vizual: accesul aplicației pentru acea verificare nu a fost acordat la timp.
