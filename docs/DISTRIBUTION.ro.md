# Pachetele Voxdria 0.4.1

## Pentru jucători

Instalează Voxdria_0.4.1_x64-setup.exe. Introdu invitația organizatorului și configurează aceeași adresă de server ca restul participanților. Proximity este modul standard implicit, inclusiv pentru adversarii apropiați identificați vizibil în camera proprie. Sunt necesare serverul 0.4.1 și TURN valid; o valoare veche ENEMY_CAMERA_VOICE=0 în Render trebuie schimbată la 1. Un installer singur nu actualizează serverul.

## Pentru streamer/comentator

Voxdria Caster_0.4.1_x64-setup.exe este pentru comentatorul care nu joacă activ meciul. Are invitație separată de caster sau spectator audio, canal izolat și controale de mix pentru OBS. Nu primește automat vocea jucătorilor și nu transmite către ei. Imaginea spectatorului și delay-ul se configurează separat. Un streamer care joacă meciul folosește aplicația normală de jucător.

## Pentru GitHub

Extrage Voxdria-v0.4.1-GitHub.zip și pune fișierele extrase în rădăcina repository-ului. Arhiva include sursele clientului/serverului, configurațiile, modelele necesare, testele, workflow-urile, licența și documentația. Nu conține node_modules, build cache, profiluri locale, credențiale, capturi sau datele vizuale descărcate pentru testele opționale.

Păstrează LICENSE și NOTICE.md, inclusiv creditul LoLProxChat/danthi123. Nu încărca .env sau fișiere .private.json. Instalarea dependențelor folosește npm ci și npm --prefix server ci. Vezi README.md și docs/enemy-camera.ro.md pentru configurare. Testele vizuale opționale cer fixture-urile descrise în raport; totalul lor dintr-un CI fără aceste date diferă de rularea locală documentată.

## Pentru release

Voxdria-v0.4.1-Release.zip conține cele două installere, sursele corespunzătoare, licența, instrucțiunile și SHA256SUMS.txt. Pentru un release GitHub, cele două installere trebuie încărcate și ca assets individuale, cu numele exact de mai sus; verificarea de actualizare le caută separat. Arhiva de release singură nu satisface această verificare.

Aliasurile pentru updaterul instalărilor RiftVoice sunt într-un director/arhivă separat legacy-updater-assets. Vezi [migrarea numelui și a instalării](rebrand.ro.md); installerele canonice de distribuit utilizatorilor sunt cele Voxdria.

Acestea sunt pachete locale pentru test în custom, fără certificat Windows și fără aprobare Riot. Nu au fost publicate automat. Validarea într-un meci real, încărcarea cu zece jucători, delay-ul streamului și un update real între release-uri rămân necesare. Vizibilitatea raportată poate fi falsificată de un client modificat; vezi INAMICI-CAMERA.ro.md sau docs/enemy-camera.ro.md.

Nu s-a înlocuit proiectul sau instalarea din D:\Rift-voice și nu s-a făcut deploy pe serverul public. Rezultatele exacte sunt în VERIFICARI.ro.md / docs/verification-results.ro.md.

## Panoul de organizare 0.4.1

Configurează ORGANIZER_PASSWORD și, pentru fiecare moderator nominal, MODERATOR_ACCOUNTS_JSON pe server. Codul RV- comun se generează din Caster numai după autentificare. Jucătorii se pot înscrie înainte de meci cu Riot ID-ul declarat, apoi organizatorul verifică manual lobby-ul și repartizează cele 10 locuri. Nu se preia automat un lobby Riot. Urmează docs/organizer.ro.md / ORGANIZARE-MODERARE.ro.md pentru parole, echipe, mute, istoric și stocare persistentă opțională.
