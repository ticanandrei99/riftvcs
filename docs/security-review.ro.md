# RiftVoice — audit și pregătire pentru evaluare

Data: 6 noiembrie 2026. Copie de lucru: RiftVoice-Caster, pornită din D:\Rift-voice\main-project. Nu s-a făcut deploy și nu a fost contactat Riot. Proiectul original și instalarea existentă au rămas nemodificate.

## Remedieri aplicate

| Constatare | Remediere în această copie |
|---|---|
| Reconstruire automată a numelor mascate prin streamer mode | Numele afișate nu mai sunt reconstruite; admiterea automată este refuzată dacă identitățile sunt mascate |
| Intrare în camere pe baza unor nume/ID-uri publice; team auto-declarat | Invitații ale organizatorului, identitate/rol/echipă impuse de server; fără invitație, acces închis implicit |
| Prima confirmare securizată era incompletă și era refuzată de client | Serverul include role și teamIsolation și la prima intrare, ca la repetarea ei; test de regresie și probă WebRTC/TURN cu clientul real trecute. Validarea clientului rămâne strictă |
| Endpoint de volume utilizabil pentru alte identități/poziții | Sesiune HTTP legată de socket; refuz identitate/cameră diferită; coordonata HTTP este înlocuită cu starea propriei sesiuni |
| Flux audio adversar livrat chiar dacă volumul local era zero | Implicit echipe separate; în modul opțional 0.2.0, filtrul media elimină RTP nepermis. Raportul vizual rămâne o intrare neautoritativă |
| Risc caster/spectator→player și date de spectator | Camere separate, fără punte audio sau date de poziție; rol spectator audio receive-only; build caster fără overlay/scanner |
| Acces public la credențiale TURN | Endpoint protejat prin sesiune, rate limits și CORS explicit |
| Relay opac al mesajelor | Acceptare doar audio SDP/ICE, fără data channels/video; metadate presence reconstruite și limitate |
| Pagină externă cu permisiuni de microfon/native | CSP, navigare blocată, verificare origin pentru microfon, listă de comenzi native per fereastră |
| Cereri locale care puteau urma redirect/proxy | Client League strict loopback, no_proxy și fără redirect |
| Captură prea mare / overflow / altă aplicație în față | Dimensiuni validate înainte de alocare, geometrie în i64 și captură numai cu League în prim-plan |
| Generare sintetică de Caps Lock | Eliminat SendInput; hotkey-urile produc doar evenimente interne PTT/mute |
| Actualizare nesigură / confuzie cu upstream | Notificare la pornire pentru ambele variante; metadate stabile și installer exact din repo-ul RiftVoice; fără execuție de URL furnizat de frontend |
| Unmute individual putea suprascrie Mute All | Mute All are prioritate; mute individual păstrat la reconectare; controale individuale și în caster |
| Arhive cu date locale / secrete | Excludere .private.json, chei, profiluri, rapoarte locale și dependențe; documentație și canal de raportare specifice fork-ului |
| Componente native vechi | Cargo.lock actualizat, inclusiv TLS, rădăcini certificate, Tauri/Wry și zip; scanare RustSec refăcută |
| Dependențe dev cu probleme moderate | glob/minimatch actualizate prin overrides explicite, fără downgrade forțat la o versiune veche de Jest |

## Limite care rămân

Nu este o enumerare garantată a tuturor vulnerabilităților. Auditul este de sursă/configurație/dependențe, cu teste locale; nu include un pentest independent, infrastructura publică, certificatele operatorului sau conturi Riot reale.

În 0.2.0, adversarii apropiați, identificați în imaginea curentă din cameră, pot fi auziți dacă organizatorul activează ENEMY_CAMERA_VOICE. Conexiunile sunt terminate și filtrate la fiecare pachet pe server; adversarii nu primesc direct SDP/ICE unul de la altul. Vizibilitatea rămâne raportată de client și poate fi falsificată. Nu se declară o garanție anti-cheat sau aprobare Riot. Configurare, model de încredere al operatorului și limite: [enemy-camera.ro.md](enemy-camera.ro.md).

Invitațiile nu dovedesc identitatea Riot sau participarea într-un custom; organizatorul trebuie să le distribuie corect. Nu există încă un dashboard administrativ de moderare. Revocarea se face în configurația operatorului urmată de restart; clienții oficiali închid sesiunile. Clienții modificați pot păstra media deja negociată între participanți care aveau acces; vezi threat-model.md.

Scanarea npm pentru codul livrat și scanarea RustSec sunt consemnate separat de avertismentele dependențelor de dezvoltare și de cele pentru alte platforme. Un rezultat zero nu este o certificare de securitate. Nu se ascund sau ignoră advisories pentru a obține un rezultat favorabil.

Updaterul face verificare automată și notificare, nu instalare silențioasă. Instalarea automată necesită un canal semnat criptografic, cheia publică în aplicație și test de update/rollback cu artifact real; acestea nu au fost provisionate. Nu au fost generate chei de producție și nu a fost publicată o versiune în GitHub.

## Verificare Riot

Surse primare consultate la data auditului:
- https://developer.riotgames.com/docs/lol — Game Integrity și cerințele pentru produse.
- https://support.riotgames.com/en-us/riot/events/third-party-applications — informații ascunse, avantaj nepermis, skin hacks.
- https://www.riotgames.com/en/DevRel/vanguard-faq — instrumente third-party și Vanguard.
- https://v2.tauri.app/plugin/updater/ — semnarea updaterului.
- https://v2.tauri.app/security/csp/ — politica paginilor native.

Dosarul pentru Riot trebuie să descrie exact API-urile League folosite, captura vizuală locală, datele care părăsesc calculatorul, autentificarea de eveniment, topologia audio, limitările și rezultatele testelor. Custom games nu sunt considerate automat o excepție de la regulile Riot. Nu se afirmă aprobare, compatibilitate garantată sau risc zero de sancțiuni.

Rezultatele executării testelor/build-urilor sunt în docs/verification-results.ro.md, după încheierea verificărilor. Pentru OBS și probele manuale: caster-mode.ro.md.
