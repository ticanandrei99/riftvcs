# RiftVoice devine Voxdria — versiunea 0.4.1

Produsele se numesc **Voxdria** pentru jucători și **Voxdria Caster** pentru comentatori. Procesul Windows, titlurile, textele, notificările, sursele și installerele folosesc numele nou. Culorile negru/roșu și iconul de microfon sunt păstrate, iar overlay-ul are simbolul V. Denumirea aleasă nu are aici o confirmare juridică de disponibilitate a mărcii.

## Compatibilitate păstrată

- Identificatorii tehnici com.riftvoice.desktop și com.riftvoice.caster rămân stabili, pentru datele și preferințele instalărilor existente. Nu sunt numele afișate ale produselor.
- Cheile localStorage/sessionStorage, evenimentele interne, prefixul RV- și variabilele RIFTVOICE_* folosite pentru teste/operator rămân compatibile. O rezervare sessionStorage poate fi pierdută la închiderea aplicației, ca înainte.
- Aplicația acceptă invitații cu Cod vocal, Cod vocal RiftVoice sau Cod vocal Voxdria. Generatorul folosește antetul Voxdria și eticheta generică Cod vocal, citibilă și de parserul clientului anterior.
- Adresa serverului https://riftvoice-server.onrender.com, numele serviciului Render și repository-ul https://github.com/ticanandrei99/riftvcs rămân cele existente. Nu schimbăm linkuri funcționale în adrese Voxdria care nu au fost configurate.
- Preferințele explicite ale utilizatorului sunt păstrate. Instalările noi pornesc cu proximity; mute/deafen și oprirea ascultării adversarilor rămân controale personale.

## Installere și update

Installerele canonice sunt Voxdria_0.4.1_x64-setup.exe și Voxdria Caster_0.4.1_x64-setup.exe. Acestea se dau jucătorilor și comentatorilor. Updaterul Voxdria caută exact varianta potrivită în același repository, fără URL arbitrar sau instalare automată.

Versiunile RiftVoice deja distribuite caută numele vechi ale asseturilor. Directorul separat legacy-updater-assets conține copii identice ale noilor installere, numite RiftVoice_0.4.1_x64-setup.exe și RiftVoice Caster_0.4.1_x64-setup.exe, cu hash-uri. Se încarcă și acestea ca assets individuale în același release stabil v0.4.1 dacă dorești notificare pentru clienții vechi. Sunt aliasuri de compatibilitate, nu build-uri vechi. Nu redenumi un installer 0.4.0 drept 0.4.1.

Un release fără aceste aliasuri nu poate anunța schimbarea tuturor clienților vechi. O arhivă ZIP care le conține nu înlocuiește asseturile individuale. Viitoarele release-uri pot păstra aceeași procedură cât timp mai există instalări vechi.

NSIS folosește numele produsului și pentru intrarea de dezinstalare Windows. Numele nou poate crea o instalare/intrare separată; păstrarea identificatorului Tauri nu dovedește automat un upgrade NSIS în loc. Închide aplicația veche înainte de pornirea Voxdria și verifică funcționarea noii versiuni înainte de a dezinstala manual varianta veche. Nu se execută o dezinstalare automată a aplicației utilizatorului. Instalarea curată și migrarea pe un calculator real rămân consemnate separat în raport.

## Server și proximity

În 0.4.1, proximity este modul standard implicit, cu adversari apropiați identificați vizibil în camera proprie. Serverul activează gateway-ul implicit; render.yaml cere ENEMY_CAMERA_VOICE=1. O valoare 0 deja salvată în Render rămâne o suspendare explicită și trebuie schimbată la 1 de operator. Valorile nevalide sunt refuzate. Este necesar TURN funcțional; nu există fallback direct.

Numele nou nu schimbă separarea casterilor, lipsa datelor automate de spectator, verificările de cameră/distanță sau limitele rapoartelor furnizate de client. Vezi [ghidul proximity](enemy-camera.ro.md) și [raportul](verification-results.ro.md).

## Licență și istoric

LoLProxChat/danthi123 și contribuitorii rămân creditați, cu AGPL-3.0-or-later și licențele componentelor. Documentele și rezultatele istorice 0.1–0.4 păstrează numele RiftVoice, pentru a nu prezenta probe vechi drept probe Voxdria 0.4.1. Instalarea ori redenumirea locală nu reprezintă publicare GitHub, deploy Render, înregistrare de marcă sau aprobare Riot.