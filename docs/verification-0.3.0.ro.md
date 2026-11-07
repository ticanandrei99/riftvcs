# Verificări RiftVoice 0.3.0 — 6 noiembrie 2026

Rezultatele privesc copia locală RiftVoice-Caster. Serverul public nu a fost actualizat, iar proiectul și instalarea din D:\Rift-voice au rămas nemodificate. Această versiune este un candidat pentru testare în custom, fără aprobare Riot sau certificat Windows.

| Verificare | Rezultat |
|---|---|
| Typecheck client și arbore teste | Trecut |
| Client complet | 774 trecute, 2 omise; 49 suite active trecute |
| Server final | 302 trecute, 20 fișiere trecute |
| Integrare end-to-end | 19 trecute, 2 suite trecute |
| Native Rust release/locked | 45 trecute, 1 test hardware ignored în rularea implicită |
| Interfață organizare, server local real | 10 verificări trecute în Edge headless, cu credențiale fictive și două înscrieri înainte de meci |
| Zece participanți vocali | Admitere și conexiuni WebSocket autentificate pentru 10 clienți de test; nu este o probă cu 10 microfoane/calculatoare |
| Moderatori nominali / administrator | Test de server real cu Dani/Maria fictivi, refuz rol falsificat, refuz mute contra administratorului, revocare sesiune, istoric nominal și reactivare |
| Link Riot introdus de organizator | Format HTTPS strict validat, domenii/credențiale/câmpuri suplimentare refuzate, fără apel Riot; invitația copiată conține linkul și codul vocal separat |
| Natural/Robotic și WebRTC | Trecut în Edge, tonuri sintetice, bypass, schimbare live, context audio reluat |
| Filtru media adversari pe loopback | 15 scenarii trecute cu WebRTC real și raportare sintetică, fără microfon |
| npm audit producție client și server | 0 vulnerabilități raportate |
| npm audit complet | Server: 0; client/dezvoltare: 6 alerte low în lanțul deepmerge/Jest/ts-jest |
| RustSec, baza actualizată | 0 vulnerabilități în lista principală; avertismente informative proc-macro-error (unmaintained) și glib (unsound, componentă GTK pentru altă platformă) |

Rularea completă este în verification/organizer-final-verify.log. După completarea câmpului pentru linkul Riot, serverul a fost rerulat integral (organizer-final-backend.log), împreună cu typecheck-ul arborelui testelor și cele 25 de verificări client afectate (organizer-client-final.log), proba de interfață și integrarea end-to-end (organizer-final-e2e.log). Nu s-au modificat recunoașterea vizuală sau efectele audio după rularea lor completă.

Proba de interfață confirmă: generare blocată înainte de autentificare; parolă greșită refuzată și ștearsă din câmp; rol nominal de moderator; cod comun pentru zece; copiere combinată link LoL/cod vocal; cereri și aprobări înainte de meci; mutare/schimb de locuri; invitație personală de caster; istoric vizibil numai administratorului; buton de administrator protejat; eliminarea codurilor/istoricului din pagină la logout. Unele verificări sunt grupate în aceleași cazuri. S-au inspectat capturile paginii QA; nu s-au introdus parole reale și nu s-a cerut microfon.

Testele de server verifică suplimentar maximum cinci pe echipă și zece total, respingere, rotație cod, expirare/limite de input, stocare privată, blocarea altui meci, nume sau echipe diferite, imposibilitatea schimbării echipelor după legarea meciului, lipsa accesului media înainte de aprobare și păstrarea istoricului după închiderea camerei. Mutarea unei persoane în panou nu schimbă lobby-ul Riot. Numele și echipa rămân informații raportate de client și confirmate de organizator, fără autentificare Riot.

## Windows și hardware

Ambele build-uri finale Windows NSIS x64 0.3.0 sunt consemnate în organizer-player-build.log și organizer-caster-build.log. S-au păstrat avertismentele webpack de dimensiune pentru modelele/fișierele ONNX; compilarea reușește.

Executabilul de producție Caster 0.3.0 a fost pornit cu profil WebView separat și inspectat prin arborele de accesibilitate: panou de administrare prezent, generator ascuns înainte de autentificare, câmp pentru cont nominal/parolă, canal audio separat, microfon oprit și PTT disponibil. Procesul de probă a fost închis. Nu s-a autentificat cu date reale și nu s-a modificat aplicația normală deschisă din D:. În sistem există înregistrarea unei instalări Caster 0.2.0, care a fost păstrată; nu s-a făcut upgrade sau test de instalare/dezinstalare 0.3.0 peste ea. Înainte de distribuție sunt verificate compilarea și hash-urile, nu o instalare pe Windows curat.

Probele Realtek, testul hardware ignored executat separat și captura OBS 33.0.1 cu ton de 440 Hz aparțin etapelor 0.1/0.2. Codul audio nativ este păstrat, dar nu declarăm o nouă probă hardware/OBS în 0.3.0. Proba TURN extern cu 15 scenarii a trecut în 0.2.0; în 0.3.0 s-a repetat proba media pe loopback. Detalii și limite ale probelor anterioare: [0.2.0](verification-0.2.0.ro.md) și [0.1.0](verification-0.1.0.ro.md).

## Ce rămâne de probat într-un custom real

Cele două teste vizuale omise cer înregistrări reale: fixtures-games/index.json cu imagini etichetate, respectiv CAMERA_EVAL cu eval.json/debug frames. Utilizatorul a confirmat că nu are încă aceste date. Celelalte 25 de cazuri anterior omise au trecut cu imagini publice în etapa precedentă și rămân activate local; acestea nu au fost prezentate ca meciuri reale.

Sunt necesare zece persoane pe calculatoare/rețele diferite, numele exact furnizat de clientul curent LoL, echipele din lobby, deconectare/reintrare, administrare nominală, mute/reactivare, camera/ceața războiului și suprapuneri reale, moarte/respawn, alt-tab, microfon/dispozitive USB/Bluetooth și un Caster cu OBS/delay de spectator. Mai trebuie un upgrade real între release-uri publicate și instalare pe Windows curat.

Mute de moderare suspendă transmisia și ascultarea; nu controlează alte aplicații sau microfonul separat OBS. Doi clienți modificați pot păstra media P2P deja negociată. Filtrul adversarilor verifică sesiuni și permisiuni la fiecare pachet, dar vizibilitatea raportată poate fi falsificată. Niciun test de aici nu certifică securitate completă, conformitate sau aprobare Riot.

## Stocare, arhive și confidențialitate

Conturile nominale și parolele se configurează numai pe server. Camerele, invitațiile și istoricul sunt temporare în lipsa unui ORGANIZER_STORE_PATH privat pe volum persistent. Istoricul numește moderatorii și participanții, păstrează 1.000 de acțiuni și afișează ultimele 200 administratorului. Nu este un registru extern imuabil. Vezi [organizare și moderare](organizer.ro.md).

Arhivele de distribuție conțin sursele corespunzătoare, licența, ghidurile și hash-uri SHA-256. Sunt excluse credențialele private, capturile, profilurile, rapoartele brute, dependențele instalate și cache-urile. Filtrarea se bazează pe liste și tipare verificate; nu este o garanție că orice formă posibilă de secret este identificată. Pentru GitHub browser există loturi cu mai puțin de 100 de fișiere, fără schimbarea structurii serverului.

Pentru debug în meci: activează Diagnostic înainte de custom și lasă arhiva să se finalizeze. ZIP-ul se găsește în %LOCALAPPDATA%\com.riftvoice.desktop\games. Poate conține numele participanților și cadre de minimapă; verifică-l înainte de distribuire. Un replay .rofl singur nu înlocuiește datele vizuale necesare.
