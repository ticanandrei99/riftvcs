# LoLProxChat și Voxdria 0.4.2 — comparație sinceră

LoLProxChat, creat de danthi123 și contribuitori, este baza tehnică a proiectului nostru. Voxdria (numele nou al RiftVoice) este un fork AGPL, cu funcții suplimentare pentru customuri organizate și comentatori. Nu este o aplicație scrisă de la zero.

Comparația surselor folosește arhiva locală D:\Rift-voice\original\LoLProxChat-main.zip, cu versiune nativă 0.5.24. Am consultat și [README-ul public LoLProxChat](https://github.com/danthi123/LoLProxChat) la 7 noiembrie 2026. Acesta descrie deja camera mode, mute individual, updater și infrastructură CV/WebRTC. Nu prezentăm aceste funcții drept invenții Voxdria. Consultarea README-ului nu este o revizie a fiecărui commit upstream nou.

| Aspect | LoLProxChat, în baza analizată | Voxdria |
|---|---|---|
| Bază tehnică | Tauri/WebView2, minimap tracking, model CV, WebRTC, overlay, server și teste | Refolosește și modifică acea infrastructură; păstrează autorul, notificările și AGPL-3.0-or-later |
| Proximity | Experiență centrală, aliați și adversari; moduri de distanță/cameră | Modul standard implicit; coechipieri în apropiere și adversari apropiați identificați vizibil în camera proprie |
| Camera / fog of war | README-ul descrie filtrarea locală în camera mode, dar și mod de distanță | Pentru adversari, media trece prin server și este eliminată fără identitate/cameră/distanță/raport proaspăt; unmute local nu recuperează RTP eliminat |
| Încredere în vizibilitate | Poziții și recunoaștere vizuală furnizate de client | Aceeași limită fundamentală: un client modificat poate falsifica rapoartele. Filtrarea media nu este atestare Riot |
| Intrare în custom | Cameră deterministă și date de identificare furnizate de client în handshake-ul arhivat | Cod vocal, cerere, aprobare organizator, rezervare privată, rol/echipă impuse de server |
| Voce înainte de meci | Nu am identificat fluxul de eveniment echivalent în arhiva analizată | Lobby vocal pe echipe după aprobare; mutare/schimb și închidere la admiterea în meci |
| Administrare | Nu am identificat panoul nominal echivalent în arhivă | Administrator și moderatori cu parole, zece locuri/cinci pe echipă, mute/revocare, admin protejat și istoric nominal privat |
| Caster și spectator audio | Nu am identificat aplicația dedicată echivalentă în arhivă | Voxdria Caster separat, link/cerere/aprobare dedicată, spectator fără microfon, audio izolat de jucători, PTT/mute/deafen și controale de mix OBS |
| Mute individual | Exista deja | Păstrat în player/Caster, cu prioritate pentru deafen și oprirea vocilor din mix |
| Procesare voce | Infrastructura audio și controalele de bază sunt upstream | Natural/Robotic opțional, procesare locală, preview; fără înregistrări oficiale de campioni sau voice cloning |
| TURN și confidențialitate | README-ul oferă alegerea Force TURN; media obișnuită este P2P | TURN-only în producție; gateway-ul adversarilor termină criptarea și operatorul trebuie considerat de încredere |
| Update | Auto-update exista deja | Notificare la pornire, validare strictă a variantei/assetului și pagină fixă. Instalare manuală până la un canal semnat |
| Discord | Nu se atribuie o integrare neverificată upstream | Link comunitate și canal privat Streamer, fără login, acordare de roluri sau punte audio automată |
| Distribuție | README-ul descrie executabil portabil | Installere separate player/Caster, surse corespunzătoare, ghiduri și SHA-256; compatibilitate cu invitațiile/numele vechi de updater |
| Testare | Are deja teste și componente complexe de simulare | Adaugă verificări pentru acces, rutare, moderare, lifecycle și compatibilitate; rezultatele exacte sunt în raport |
| Riot | README-ul declară înregistrare/aprobare, App ID 809090; nu am verificat independent portalul | Nu avem aprobare Riot pentru fork; o afirmație upstream nu se transferă proiectului nostru |

## Evaluarea mea

Voxdria are acum o direcție proprie: evenimente comunitare cu participanți aprobați, administrare și comentatori izolați. Diferența depășește redenumirea și culorile interfeței. Proximity rămâne experiența principală; controlul accesului și canalul Caster sunt extensiile noastre cele mai clare.

Nu avem dovezi că recunoaștem mai bine campionii, că avem latență mai mică sau voce de calitate mai bună în meciuri reale. Mai multe teste ori verificări locale nu sunt un benchmark comparativ. Nu există bază pentru a spune că proiectul lui Dani este slab sau nesigur în toate versiunile, ori că putem deduce din cod dacă a folosit AI.

Arhitectura noastră adaugă și costuri: un server media de încredere, TURN obligatoriu, configurare de eveniment și încărcare suplimentară. Pentru un 5v5, gateway-ul adversarilor poate ajunge la 25 de perechi/50 de conexiuni WebRTC pe server. Capacitatea hostului, utilizarea cu zece PC-uri și sincronizarea comentariului în stream trebuie validate. Controalele de acces limitează clienții normali; P2P deja negociat între clienți modificați și comunicațiile externe rămân limite explicite.

Ca stadiu, avem un fork de comunitate cu funcții proprii și probe locale documentate. Nu avem încă o lansare largă validată, audit independent, certificat Windows sau aprobare Riot. Comparația corectă este una de funcții și arhitectură, până când avem rezultate din aceleași meciuri/rețele/dispozitive.

Vezi [verificările executate](verification-results.ro.md), [inventarul funcțiilor](function-checklist.ro.md), [proximity și limitele vizuale](enemy-camera.ro.md) și [migrarea numelui](rebrand.ro.md).
