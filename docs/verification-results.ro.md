# Verificări RiftVoice 0.2.0 — 6 noiembrie 2026

Rezultatele se referă la copia locală RiftVoice-Caster și la installerele 0.2.0 pregătite aici. Nu s-a făcut deploy pe serverul public și nu s-a înlocuit proiectul/instalarea din D:\Rift-voice. Pachetele sunt candidați pentru testare în custom, fără aprobare Riot sau certificat Windows.

| Verificare finală | Rezultat |
|---|---|
| Typecheck client și arborele testelor | Trecut |
| Client | 768 trecute, 2 omise; 47 suite active trecute |
| Server | 279 trecute, 16 fișiere trecute |
| Integrare end-to-end | 19 trecute, 2 suite trecute |
| Native Rust release/locked 0.2.0 | 45 trecute, 1 test hardware ignored în rularea implicită |
| Natural/Robotic și transmisie WebRTC | Trecut în Edge; bypass și schimbare live a efectului, fără schimbarea pistei, context audio reluat |
| Filtru adversari: WebRTC real pe loopback | 15 scenarii trecute, două sesiuni autentificate, tonuri sintetice |
| Filtru adversari: TURN extern real | 15 scenarii trecute; politica relay și candidați relay la ambele capete confirmați din statistici, fără microfon |
| Recunoaștere vizuală strictă nouă | Trecut prin TrackingService pe imagini generate cu portrete publice; icon dispărut și cameră ilizibilă retrag snapshot-ul |
| Build Windows player 0.2.0 | Compilare și NSIS x64 trecute |
| Build Windows Caster 0.2.0 | Compilare și NSIS x64 trecute |
| Instalare Caster 0.2.0 | Instalare izolată cu versiune 0.2.0 în registru; interfața nativă inspectată prin arborele de accesibilitate; dezinstalare și eliminare a executabilului/înregistrării trecute |
| npm audit producție după adăugarea werift | 0 vulnerabilități raportate pentru dependențele serverului |

Rularea clientului complet este în verification/camera-final-verify.log. După corectarea compatibilității formei camerelor vechi, serverul și end-to-end au fost rerulate integral în verification/camera-final-backend.log. Verificarea suplimentară a signaling-ului final a trecut (18 teste, camera-signaling-final.log). Au fost actualizate și simulatoarele de test la capabilitatea nouă; clienții reali nu au primit un fallback nesecurizat.

Probele media verifică: lipsa acordului, acord unilateral, adversar apropiat în cameră, sensul invers, ieșire din cameră, icon dispărut cu unmute forțat în client, distanță prea mare chiar în cameră, revenirea vizibilității, repetarea unui frame expirat, oprirea capturii/raportării, moartea ascultătorului/vorbitorului, respawn și oprirea opțiunii. În cazurile blocate nu au fost recepționați octeți RTP audio noi în fereastra măsurată, iar semnalul a fost zero. Raportarea vizuală din aceste probe este sintetică, nu un custom LoL real.

## Hardware și probe anterioare reutilizate

În aceeași sesiune, componentele audio Windows au fost verificate pe dispozitive Realtek reale: microfon mono 48 kHz, semnal detectat, mixerul nativ pornit/mutat/oprit, 0 underruns/dropped în proba integrată. Testul Rust hardware ignored a fost pornit separat în etapa 0.1.0 și a trecut (5 underruns inițiale, 0 dropped). Codul audio nativ nu a fost schimbat pentru 0.2.0; nu declarăm o nouă probă hardware ignored în rularea implicită 0.2.0.

OBS 33.0.1 portabil a înregistrat local tonul nativ de 440 Hz și liniștea după oprire. Microfonul și Desktop Audio nu au fost înregistrate și nu s-a pornit streaming. Varianta normală a fost instalată/dezinstalată anterior cu nume/identificator QA separat, fără a înlocui instalarea utilizatorului. În 0.2.0 s-au construit ambele installere și s-a repetat instalarea/dezinstalarea Caster; nu s-a făcut un upgrade peste instalarea normală din D: sau o instalare pe Windows curat. Detaliile etapei anterioare sunt în verification-0.1.0.ro.md.

Din cele 27 de cazuri vizuale anterior omise, 25 au fost activate folosind imagini publice și au trecut. Noul caz strict pentru camera adversarilor este suplimentar. Cele două cazuri rămase cer înregistrări reale: fixtures-games/index.json cu decupaje etichetate, respectiv CAMERA_EVAL cu eval.json și debug frames. Utilizatorul a confirmat că nu are încă aceste date. Nu au fost fabricate rezultate din meciuri reale. Fixture-urile descărcate/generate rămân locale și sunt excluse din arhiva GitHub.

## Limite înainte de folosire în eveniment

Vizibilitatea este furnizată de client și poate fi falsificată de un participant modificat. Filtrul media oprește pachetele fără permisiune, dar nu poate atesta sinceritatea pixelilor. Operatorul media are acces tehnic la audio-ul adversarilor. Funcția nu este o garanție anti-cheat sau aprobare Riot. Configurare și model de încredere: enemy-camera.ro.md.

Sunt necesare customuri reale pe calculatoare și rețele diferite, test cu zece jucători, fog of war/tufișuri și suprapuneri reale, verificarea poziției proprii, panning și alt-tab, mute/PTT, moarte/respawn, reconnect, Bluetooth/USB și deconectare fizică de dispozitive. Mai trebuie validate delay-ul spectator/stream, Caster cu OBS într-un eveniment și actualizarea între două release-uri publicate. Installerele nu sunt semnate, iar instalarea automată semnată nu este configurată.

## Arhive și confidențialitate

Pachetul GitHub conține sursele complete, configurațiile, testele și licențele. Pachetul release conține ambele installere, sursele și ghidurile. Se verifică SHA-256 și absența profilurilor, cheilor, .private.json, .env, capturilor, dependențelor instalate și cache-urilor de build. Verificările de secrete sunt bazate pe tipare selectate și nu constituie o garanție că nu există alte forme de informații sensibile. Rapoartele brute și credențialele temporare nu sunt incluse.

Pentru debug după custom: activează Diagnostic înainte de meci și lasă aplicația să finalizeze arhiva. ZIP-ul este în %LOCALAPPDATA%\com.riftvoice.desktop\games. Conține jurnale și imagini ale minimapei, posibil numele participanților; verifică-l înainte de a-l distribui. Replay-ul .rofl singur nu înlocuiește aceste imagini pentru testele vizuale.