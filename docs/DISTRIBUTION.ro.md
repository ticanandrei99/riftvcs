# Pachetele RiftVoice 0.3.0

## Pentru jucători

Instalează RiftVoice_0.3.0_x64-setup.exe. Introdu invitația organizatorului și configurează aceeași adresă de server ca restul participanților. Opțiunea „Inamici apropiați în cameră” cere serverul 0.3.0, TURN valid și ENEMY_CAMERA_VOICE=1. Fără această configurare, adversarii rămân opriți; un installer singur nu actualizează serverul.

## Pentru streamer/comentator

RiftVoice Caster_0.3.0_x64-setup.exe este pentru comentatorul care nu joacă activ meciul. Are invitație separată de caster sau spectator audio, canal izolat și controale de mix pentru OBS. Nu primește automat vocea jucătorilor și nu transmite către ei. Imaginea spectatorului și delay-ul se configurează separat. Un streamer care joacă meciul folosește aplicația normală de jucător.

## Pentru GitHub

Extrage RiftVoice-v0.3.0-GitHub.zip și pune fișierele extrase în rădăcina repository-ului. Arhiva include sursele clientului/serverului, configurațiile, modelele necesare, testele, workflow-urile, licența și documentația. Nu conține node_modules, build cache, profiluri locale, credențiale, capturi sau datele vizuale descărcate pentru testele opționale.

Păstrează LICENSE și NOTICE.md, inclusiv creditul LoLProxChat/danthi123. Nu încărca .env sau fișiere .private.json. Instalarea dependențelor folosește npm ci și npm --prefix server ci. Vezi README.md și docs/enemy-camera.ro.md pentru configurare. Testele vizuale opționale cer fixture-urile descrise în raport; totalul lor dintr-un CI fără aceste date diferă de rularea locală documentată.

## Pentru release

RiftVoice-v0.3.0-Release.zip conține cele două installere, sursele corespunzătoare, licența, instrucțiunile și SHA256SUMS.txt. Pentru un release GitHub, cele două installere trebuie încărcate și ca assets individuale, cu numele exact de mai sus; verificarea de actualizare le caută separat. Arhiva de release singură nu satisface această verificare.

Acestea sunt pachete locale pentru test în custom, fără certificat Windows și fără aprobare Riot. Nu au fost publicate automat. Validarea într-un meci real, încărcarea cu zece jucători, delay-ul streamului și un update real între release-uri rămân necesare. Vizibilitatea raportată poate fi falsificată de un client modificat; vezi INAMICI-CAMERA.ro.md sau docs/enemy-camera.ro.md.

Nu s-a înlocuit proiectul sau instalarea din D:\Rift-voice și nu s-a făcut deploy pe serverul public. Rezultatele exacte sunt în VERIFICARI.ro.md / docs/verification-results.ro.md.

## Panoul de organizare 0.3.0

Configurează ORGANIZER_PASSWORD și, pentru fiecare moderator nominal, MODERATOR_ACCOUNTS_JSON pe server. Codul RV- comun se generează din Caster numai după autentificare. Jucătorii se pot înscrie înainte de meci cu Riot ID-ul declarat, apoi organizatorul verifică manual lobby-ul și repartizează cele 10 locuri. Nu se preia automat un lobby Riot. Urmează docs/organizer.ro.md / ORGANIZARE-MODERARE.ro.md pentru parole, echipe, mute, istoric și stocare persistentă opțională.
