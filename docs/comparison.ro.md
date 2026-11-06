# Comparație: LoLProxChat și RiftVoice 0.2.0

În 0.2.0, vocea adversarilor apropiați în cameră a fost reintrodusă ca funcție opțională de eveniment: invitații, acordul ambelor persoane, icon vizibil identificat, cameră lizibilă și distanță sub 1.350 unități. Un filtru media pe server elimină pachetele nepermise; nu există legătură directă între adversari. Casterii rămân izolați. Ambele installere și pachetele GitHub/release au versiunea 0.2.0.

Această rută este mai restrictivă decât simpla proximitate după distanță din arhiva originală. Introduce însă un operator media de încredere și păstrează o limită importantă: un client modificat poate falsifica raportul vizual. Nu există atestare Riot sau dovadă de superioritate în tracking/latență. [Configurare și limite](enemy-camera.ro.md), [verificări curente](verification-results.ro.md).

## Comparația anterioară pentru RiftVoice 0.1.0

Textul de mai jos consemnează etapa anterioară, când vocea adversarilor era complet dezactivată pe serverul securizat. Pentru comportamentul 0.2.0 folosește explicația de mai sus și documentația legată.

Comparație la 6 noiembrie 2026, bazată pe arhiva locală D:\Rift-voice\original\LoLProxChat-main.zip (pachetul nativ indică 0.5.24) și pe copia RiftVoice-Caster dezvoltată în acest chat. Nu este un benchmark în meciuri reale și nu presupune că arhiva locală este cea mai recentă versiune publică a autorului.

## Verdict sincer

LoLProxChat este baza tehnică substanțială: tracking pe minimapă, audio WebRTC, overlay, moduri de ascultare, controale de microfon și o infrastructură de teste. RiftVCS nu a fost construit de la zero; creditul autorului danthi123 și al contribuitorilor trebuie păstrat.

RiftVCS are acum o direcție distinctă pentru comunitate și custom games: organizatori, invitații, roluri caster/spectator și control explicit asupra canalelor audio. Este mai restrictiv în arhitectura de acces din această copie. Nu este încă o platformă pregătită pentru lansare largă și nu este demonstrat că are tracking sau calitate vocală mai bună în joc.

| Aspect | LoLProxChat din arhiva locală | RiftVCS din copia curentă |
|---|---|---|
| Scop | Proximity voice general, aliați și adversari | Evenimente custom cu acces controlat, jucători și comentatori |
| Bază tehnică | Tauri/WebView2, CV pe minimapă, WebRTC, server de signaling | Refolosește acea bază; nu pretinde o rescriere integrală |
| Voce adversari | Parte centrală a experienței, după distanță | Nu se negociază pe serverul de producție securizat; funcția nu poate fi declarată păstrată în aceeași formă |
| Admitere și echipă | Room/name și team furnizate de client, fără invitație de organizator în handshake-ul analizat | Invitație limitată în timp și legată de nume/cameră/rol/echipă; sesiune HTTP legată de socket |
| Fog of war | Distanța/volumul pot reprezenta un canal de informații; documentația upstream discută aceste limite | Evită livrarea fluxurilor adversare/caster către jucători; recunoaște că CV și auto-raportarea nu sunt stare Riot autoritativă |
| Caster Mode | Nu am identificat modul dedicat în sursa arhivată | Canal separat, spectator audio receive-only, PTT/mute/deafen, niveluri de comentariu și co-casteri, ieșire nativă pentru OBS |
| Mute individual | Exista deja; nu este o invenție RiftVCS | Păstrat și corectat pentru prioritatea Mute All; păstrat la reconectare; adăugat în interfața caster cu volum per persoană |
| IP și releu | Force-TURN activ implicit, dar poate fi dezactivat prin preferință | Conexiuni relay-only impuse în client; accesul la credențiale TURN cere sesiune |
| Updater | Exista deja auto-update și o restricție a URL-ului de download către upstream | Notificare automată în română/engleză pentru varianta potrivită, link fix către release RiftVoice; instalarea automată este dezactivată până la un canal semnat |
| Interfață și efecte | Overlay și controale de voce din proiectul de bază | Interfață română/engleză și identitate RiftVoice; efectele locale Natural/Robotic existente în fork sunt păstrate, fără a pretinde voice cloning oficial |
| Identități mascate | Reconstruire a camerei din câmpuri Riot ID în unele cazuri | Nu reconstruiește numele mascate; refuză admiterea automată în acel caz |
| Permisiuni native | Suprafață comună de comenzi și configurație din snapshot | CSP, origine de microfon verificată, navigare externă blocată și limitarea comenzilor native pentru caster |
| Verificări | Are deja teste automate și componente complexe de simulare; merită credit pentru acestea | Extinde testele de autentificare/izolare/mute/notificare și actualizează dependențele; probele de joc/OBS pe mai multe calculatoare rămân necesare |
| Statut Riot | README-ul arhivat declară înregistrare/aprobare în Developer Portal, App ID 809090; afirmația nu a fost verificată independent în acest audit | Nicio aprobare declarată sau primită pentru RiftVCS; aprobarea/înregistrarea autorului nu se transferă automat fork-ului |
| Maturitate | Proiect de bază cu implementare și istoric propriu; nu avem aici rezultate comparative din comunitatea lui | Prototip de eveniment cu hardening local; build/test nu înseamnă lansare validată |

## Ce s-a îmbunătățit concret

Controlul accesului și separarea media sunt schimbările cele mai importante pentru obiectivul tău. Nu sunt doar culori și traducere. Caster Mode are un scop diferit de proximity chat, iar controalele pentru organizator oferă o bază pentru customuri comunitare.

Au fost corectate probleme verificabile: admitere fără autentificare, acces nelegat la volume, team auto-declarat, comenzi native accesibile casterului, unmute care putea trece peste Mute All și ambiguități ale actualizărilor. Rezultatele efective și limitările sunt în verification-results.ro.md și security-review.ro.md. Numărul de remedieri nu este dovadă că toate vulnerabilitățile au fost eliminate.

## Ce nu pot spune că este mai bun

Nu avem dovada că RiftVCS recunoaște mai bine campionii în meciuri reale, că are latență mai mică sau că rezistă mai bine la rețele diferite. Din cele 27 de cazuri vizuale anterior omise, 25 au trecut după pregătirea imaginilor publice; două încă cer înregistrări reale. Probele extinse au verificat microfonul și mixerul Windows, captura nativă în OBS, transportul TURN extern și instalare/dezinstalare izolată. Acestea susțin funcționarea locală, fără să reprezinte un benchmark comparativ în joc sau certificarea accesibilității complete.

Ar fi incorect să spun că am păstrat toate funcțiile și am eliminat toate riscurile: vocea dintre adversari este restricționată tocmai pentru a închide o cale de informații nepermise. Dacă aceasta este experiența principală dorită, trebuie o arhitectură media potrivită și o clarificare cu Riot înainte de a o reactiva. Un proiect mai prudent poate avea temporar mai puține funcții active.

## Ce contează înainte de lansare

Teste în custom pe mai multe calculatoare/rețele, verificarea canalelor audio și a delay-ului în stream, ergonomia invitațiilor, upgrade pe versiuni publicate, revocare și administrare reală. Urmează clarificarea cu Riot pe o descriere tehnică exactă, fără promisiunea de risc zero. Cheile de semnare și certificatul Windows trebuie gestionate separat de surse înainte de un updater cu instalare automată.

Concluzia mea: RiftVCS se diferențiază acum prin obiectiv și controlul accesului. Are potențial să devină un produs comunitar propriu, dar în starea verificată aici este un fork în dezvoltare, nu un produs matur și nici unul aprobat de Riot.
