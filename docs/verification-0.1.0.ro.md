# Verificări executate — 6 noiembrie 2026

Copie locală: RiftVoice-Caster. Rezultatele se referă la această copie, nu la serverul public sau la instalația din D:\Rift-voice. Compararea statică cu baza folosește arhiva locală LoLProxChat-main.zip, versiune nativă 0.5.24.

| Verificare | Rezultat observat |
|---|---|
| npm run verify | Trecut integral: typecheck, client, server, end-to-end |
| Teste client | 766 trecute; 2 omise în 2 suite dependente de înregistrări reale; 46 suite active trecute |
| Server | 260 teste trecute în 14 fișiere, inclusiv teste HTTP/WebSocket reale pe politica de producție și confirmarea primei intrări securizate |
| End-to-end | 19 teste trecute în 2 suite; compatibilitatea veche rulează numai pe server local de test |
| Teste native Rust Windows, release/locked | 45 trecute în rularea normală; testul hardware ignored a fost executat separat și a trecut: 46 de teste executate în total |
| Web Audio/WebRTC în Edge headless | Comanda de probă a trecut; Natural/Robotic și bypass observate în randare și loopback; context audio reluat |
| 25 teste vizuale anterior omise | Trecute, în real-art și camera-sim; fixture-uri pregătite din imagini publice CommunityDragon. Sunt simulări cu artă reală, nu capturi din meciuri reale |
| Microfon real / WebView2 nativ | Microphone Array Realtek, mono 48 kHz; flux live și semnal detectat. Analiză locală, fără fișier vocal sau transmisie |
| Mixer AppAudioOutput nativ | Pornire, gain/mute și oprire trecute pe Headphone Realtek la 48 kHz; 0 underruns și 0 dropped în proba integrată. Testul Rust de ton separat a raportat 5 underruns inițiale, 0 dropped |
| Permisiuni native caster | Într-o fereastră nativă cu label caster, capture_minimap și get_live_client_data au fost refuzate de lista de comenzi permisă |
| OBS 33.0.1, Application Audio Capture | Înregistrare locală de 13,8 s: ton sintetic nativ de 440 Hz detectat, liniște după oprire. Desktop Audio și Mic/Aux oprite; fără streaming. Sursă WASAPI process capture dedicată procesului de test |
| TURN extern real | Două sesiuni Edge autentificate prin serverul local securizat; relay-only, candidați relay la ambele capete, UDP, tonuri 440/660 Hz recepționate în ambele sensuri. Endpointul TURN fără sesiune a răspuns 401. Nu este probă pe două rețele diferite |
| Generator de invitații | Testat cu 10 jucători + caster: tokenuri distincte, ID cameră egal cu cel calculat de client, refuz de suprascriere; secretele de test șterse |
| Compilare frontend production | Trecut; 3 avertismente webpack privind dimensiunea pachetelor, fără eroare de compilare |
| Windows normal / NSIS x64 | Build și installer construite cu succes din sursele finale |
| Windows Caster / NSIS x64 | Build și installer dedicate construite cu succes din sursele finale |
| Instalare / pornire / dezinstalare Caster | Installerul Caster verificat a fost instalat într-un folder separat, interfața a fost inspectată, controlul Deafen a fost comutat, apoi aplicația a fost dezinstalată cu succes; registrul de dezinstalare eliminat |
| Instalare / pornire / dezinstalare normală | Trecute cu același cod/configurație normală, dar nume și identificator QA distincte. Setările și monitorizarea Robotică 65% cu semnal real au funcționat; oprirea testului a readus indicatorul la zero. Nu a fost înlocuită instalarea normală existentă |
| Verificare manuală update în Caster instalat | Interfața a afișat mesajul de eroare prevăzut: „Actualizările nu pot fi verificate acum.” Acest rezultat nu validează publicarea sau instalarea unui release |
| npm audit --omit=dev, client și server | 0 vulnerabilități raportate în dependențele de producție |
| npm audit, inclusiv dezvoltare | 6 constatări low rămase în lanțul instrumentelor de dezvoltare; 0 moderate/high/critical. Nu s-a făcut downgrade forțat la Jest 25 |
| RustSec / Cargo.lock | 0 vulnerabilități raportate după actualizare; rămân avertismente informational/unmaintained pentru proc-macro-error și unsound pentru glib (glib nu este în arborele țintei Windows verificat) |
| Scanare de secrete în surse | Scanarea inițială: 234 fișiere. Arhiva finală: 254 fișiere text verificate cu tipare selectate de chei/API tokens; 0 fișiere potrivite. Nu este o garanție că nu există alte forme de secrete |
| Scanare de primitive de acces la memoria jocului / input sintetic | Nu au fost găsite apeluri ReadProcessMemory, WriteProcessMemory, CreateRemoteThread sau SendInput în src, server/src și src-tauri/src |

## Testele vizuale și datele lipsă

Au fost pregătite local fixtures-real și fixtures-icons, folosind portrete și iconuri publice, fără reantrenarea modelului livrat. Cele 25 de cazuri real-art/camera-sim au trecut separat și în rularea completă. Sursele publice și hash-urile portretelor sunt consemnate în verification/public-visual-fixtures-provenance.json. Datele generate și arta descărcată nu sunt incluse în arhiva de surse.

Rămân omise două cazuri-placeholder, din real-games și camera-eval. Primul cere tests/cv/fixtures-games/index.json, decupaje etichetate și iconuri din meciuri reale; al doilea cere CAMERA_EVAL cu eval.json, debug frames și iconurile aferente. Numărul efectiv de exemple evaluate va depinde de înregistrările furnizate. Utilizatorul a confirmat că nu are momentan astfel de înregistrări, iar folderele locale de capturi verificate erau goale. Nu au fost generate date sintetice pentru a pretinde că aceste probe au trecut.

## Remediere găsită în proba extinsă

Prima confirmare room_state a unui jucător autentificat includea sessionToken, dar omitea role și teamIsolation, cerute de clientul livrat. Clientul închidea corect conexiunea în loc să accepte protocolul incomplet. Răspunsul serverului a fost corectat; prima intrare și repetarea intrării au acum aceeași atestare de securitate. Un test de regresie și proba TURN cu SignalingService/PeerConnection din producție au trecut după corecție. Nu s-a relaxat validarea clientului. Corecția este în sursa serverului; nu a fost făcut deploy pe serverul public.

## Reproducerea probelor suplimentare

Rularea completă: npm run verify. Testul audio Rust: cargo test --release --locked --manifest-path src-tauri/Cargo.toml audio_out::tests::plays_a_quiet_tone_from_this_process -- --ignored --nocapture.

Pagina nativă de test este în tests/native/hardware.ts și hardware.html. Build: npx tauri build --config src-tauri/tauri.hardware-test.conf.json --no-bundle. Este o configurație QA separată, fără installer de livrare; pornește o probă locală de microfon și ton redus la trei secunde după deschidere. Fără collector local, rezultatul rămâne afișat în fereastră. Configurația relaxează autoplay numai pentru această probă, nu pentru aplicațiile normale. Nu distribui executabilul QA drept RiftVoice/Caster.

Pentru releu: npm --prefix server run build, apoi setează RIFTVOICE_TURN_TEST_CREDENTIALS la calea unui fișier privat, furnizat de operator, de forma {"iceServers":[{"urls":["turn:host:port"],"username":"…","credential":"…"}]}, și rulează node scripts/test-turn-relay.cjs. Sunt necesare Edge și porturile locale 9419–9421 libere. Se folosesc doar tonuri sintetice și se opresc serverul/browserul de test. Raportul elimină adresele și credențialele. Nu folosește modul de compatibilitate nesecurizat și nu acceptă o conexiune directă drept succes.

Proba OBS a folosit o copie portabilă oficială, cu checksum verificat, profil/scenă separate și sursa de captură a procesului QA. Nu s-a schimbat o configurație OBS existentă. Mixerul și comenzile native sunt aceleași componente folosite de aplicație; proba nu validează automat întregul canal caster în meci. Înregistrarea conține numai tonul sintetic, nu microfonul.

## Limite de validare

Build-urile sunt verificate prin compilare, teste și generare NSIS, cu probele de instalare descrise mai sus. Instalarea originală D:\Rift-voice\installer\RiftVoice a rămas intactă. Dezinstalarea copiilor de test a păstrat profilurile; nu s-a cerut ștergerea datelor aplicației. Nu s-au testat un upgrade real peste instalarea utilizatorului, instalarea pe un Windows curat sau instalarea WebView2 lipsă. Executabilul brut target/release a fost suprascris de build-urile QA; livrarea folosește exclusiv installerele player/caster selectate explicit, nu acel executabil.

Rămân necesare un custom LoL real pe mai multe calculatoare/rețele, capturi etichetate pentru cele două suite, verificarea audio caster/spectator/player în meci, PTT la alt-tab în condiții de joc, delay spectator/stream, latență/ecou percepute, Bluetooth/USB și conectarea/deconectarea fizică a dispozitivelor. Proba OBS locală nu este un stream real și nu certifică toate configurațiile hardware. Build-urile nu sunt semnate cu un certificat Windows și nu reprezintă un release public aprobat.

Nu s-a făcut deploy, nu s-au încărcat artifacte în GitHub și nu s-a contactat Riot. Verificarea de actualizare a fost testată cu metadate controlate; nu s-a făcut un update real între două release-uri publicate. Instalarea automată semnată nu este configurată.

Producția acestei copii blochează negocierea audio între echipe. Revenirea la proximity între adversari cere o soluție de media routing și clarificare cu Riot; nu este declarată finalizată. Invitațiile sunt verificate de organizator și nu atestă identități Riot sau instalări fără alte programe.

Rapoartele brute sunt locale, în fișierele *.log, npm-audit.json, production-audit.json, rustsec-audit.json și verification/. Ele nu sunt incluse implicit în arhiva surselor, deoarece verificările pot produce date locale. Rezultatele de mai sus și limitările sunt incluse în surse pentru review.
