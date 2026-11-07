# Organizare custom, administratori și moderatori — Voxdria 0.4.2

Panoul de organizare se află în aplicația **Voxdria Caster**. Un administrator sau moderator autentificat poate genera o invitație vocală comună pentru maximum 10 jucători, aproba înscrieri, repartiza câte cinci locuri pe Albastru/Roșu, vedea conexiunile, schimba codul și închide camera. Caster audio rămâne separat de jucătorii activi.

## Configurare o singură dată pe server

Actualizează sursele serverului și ambele aplicații la 0.4.2. Un installer nou nu actualizează serviciul Render. În mediul **serverului**, configurează:

- `ORGANIZER_PASSWORD`: parola administratorului, minimum 12 caractere, maximum 512 octeți. Alege o parolă lungă și unică. Fără ea, administrarea și înscrierile sunt dezactivate.
- `MODERATOR_ACCOUNTS_JSON`: implicit `[]`; pentru conturi nominale, o listă cu `name` și `password`. Fiecare moderator are propria parolă, diferită de cea a administratorului și de celelalte parole. Numele contului are 3–32 caractere: litere ASCII, cifre, punct, cratimă, underscore; maximum 20 de conturi. Parolele respectă aceeași limită de lungime.
- `PLAYER_GRANTS_JSON` / `CASTER_GRANTS_JSON`: invitațiile statice existente continuă să funcționeze. Pentru numai camerele noi generate în aplicație, pot fi `[]`.
- TURN funcțional și HTTPS/WSS, conform [ghidului Render](RENDER.ro.md). Proximity pentru adversari vizibili este implicit activ; `ENEMY_CAMERA_VOICE=0` îl suspendă explicit. În Render schimbă o valoare veche 0 la 1 pentru comportamentul standard.

Structura pentru moderatori (înlocuiește parolele exemplu înainte de folosire):

```json
[
  {"name":"Dani","password":"INLOCUIESTE-cu-parola-unica-pentru-Dani"},
  {"name":"Maria","password":"INLOCUIESTE-cu-alta-parola-unica-pentru-Maria"}
]
```

Parolele se introduc în Render Environment, niciodată în GitHub, capturi, build-ul frontend, invitațiile jucătorilor sau câmpul pentru cod vocal. Serverul folosește verificatori scrypt cu salt, comparație constantă și limite pentru încercările de autentificare. Sesiunea de administrare expiră după o oră; reconectarea cere din nou parola. Parola introdusă în Caster este ștearsă din câmp și nu este salvată de aplicație.

`MODERATOR_PASSWORD` este compatibilitatea pentru un singur cont fix, „Moderator principal”, cu câmpul Cont gol. O parolă comună nu identifică persoane diferite: pentru istoricul „cine a dat mute”, folosește conturile nominale de mai sus și lasă `MODERATOR_PASSWORD` neconfigurat. Nu acorda aceeași parolă mai multor persoane.

După restart, `/health` trebuie să arate `organizerAvailable: true`. Nu returnează parole, invitații sau istoric. Configurarea hostului public nu este făcută automat de aceste pachete.

## Invitarea și înscrierea celor 10 jucători

1. În Caster, administratorul lasă **Cont moderator** gol și introduce parola sa. Moderatorul introduce numele contului și parola proprie. Rolul și numele sunt stabilite pe server din credențiale; clientul nu poate alege rolul Administrator.
2. Completează camera și durata (1–12 ore). Opțional, lipește linkul lobby-ului copiat din LoL. Apasă **Generează cod pentru 10 persoane**, apoi **Copiază invitația completă**: include linkul LoL, dacă a fost adăugat, și codul vocal separat `RV-`. Linkul poate fi adăugat sau schimbat și după creare, cu **Salvează linkul LoL**. Voxdria validează formatul, fără să deschidă linkul sau să afle dacă lobby-ul mai este disponibil.
3. Distribuie invitația vocală și, separat, linkul lobby-ului LoL. Un link `gg.riotgames.com/LOL?joinCode=...` nu este un cod Voxdria. Aplicația nu creează un lobby Riot și nu mută persoane în clientul LoL.

Riot documentează generarea oficială a codurilor pentru turnee prin [Tournament API](https://developer.riotgames.com/docs/lol#tournament-api), cu cheie API și configurare de provider/turneu. Această integrare nu este implementată sau configurată în Voxdria 0.4.2. Codul vocal aleatoriu nu este un cod Riot și nu poate genera singur un link Riot valid. Linkul copiat de organizator este doar metadată a invitației; nu acordă roluri și nu validează automat un participant.
4. În aplicația normală, jucătorul introduce codul și Riot ID-ul complet, apoi **Conectează cu invitația**. Numele este declarat de utilizator, nu este verificat prin autentificare Riot. Nu se cere parola LoL. Identificatorul intern este aleatoriu, însă numele afișat este cel introdus de jucător.
5. Cererea apare imediat în Caster, fără să fie nevoie de un meci pornit. Organizatorul compară numele cu persoana din lobby și aprobă Albastru sau Roșu. Înscrierea primește un cod personal privat, valabil numai în sesiunea aplicației. Numărul de persoane înscrise și conexiunile vocale sunt afișate distinct.
6. Înainte de start, **Mută în ...** schimbă repartizarea vocală dacă există loc. Pentru o listă completă 5+5, alege doi jucători și **Schimbă locurile între jucători**. Fă aceeași repartizare în lobby-ul LoL; Voxdria nu poate modifica lobby-ul jocului.
7. Când aplicația identifică meciul, rezervarea aprobată este validată din nou pentru numele și echipa raportate de client, apoi se folosește autentificarea vocală obișnuită. Prima intrare leagă camera de acel meci și blochează modificarea echipelor. Alt meci, alt nume sau altă echipă sunt refuzate. Această verificare nu este o atestare Riot a clientului.

Nu este nevoie de un cont global Voxdria sau de autentificare Riot pentru înscriere. Un participant care a închis aplicația pierde codul personal al sesiunii și trebuie reînscris de organizator. O simplă reconectare vocală în aceeași sesiune păstrează codul. Dacă nu s-a făcut înscriere înainte de start, codul comun poate trimite o cerere în timpul meciului; organizatorul aprobă numai echipa detectată. Numărul total rămâne 10, cu maximum 5 pe echipă.

**Conectează acest Caster cu rolul meu** conectează propria identitate de administrator sau moderator. Pentru invitați, folosește **Copiază linkul comentatorilor**, separat de codul `RV-`. Ei completează numele și rolul în Caster, trimit cererea și așteaptă aprobarea din **Cereri comentatori**. Rolurile sunt comentator cu microfon sau spectator doar cu ascultare; nu oferă administrare. Vezi [pașii de invitare, aprobare și revocare](caster-invites.ro.md). Invitațiile personale statice existente rămân acceptate direct.

## Voce în lobby și trecerea în meci (0.4.2)

După aprobare, Voxdria se poate conecta la vocea echipei din lobby. Nu este nevoie să pornească meciul pentru a vedea cererea sau a auzi coechipierii aprobați. Caster afișează separat înscrierea, conexiunea vocală de lobby și conexiunea din meci. Maximum cinci persoane împart un canal de lobby; Albastru și Roșu sunt izolate. Casterii/spectatorii nu intră în niciunul dintre aceste canale.

Serverul acceptă numai rezervarea personală emisă după aprobare pe ruta `/lobby-voice`. Codul comun RV-, invitația de caster sau rolul pretins de utilizator nu oferă acces aici. Nu sunt acceptate poziții, date de joc, video sau data channels. Mutarea/schimbul echipelor revocă sesiunea veche și reconstruiește conexiunea cu noii coechipieri. O sesiune nouă pentru aceeași rezervare o înlocuiește pe cea veche; cea veche nu încearcă să preia automat conexiunea înapoi.

Prima admitere la meciul identificat închide toate sesiunile de lobby ale evenimentului și blochează redeschiderea lor. Vocea normală necesită apoi numele și echipa potrivite rezervării. Nu există o punte între lobby, joc și comentatori. O înregistrare care arată aprobarea nu dovedește că există și TURN funcțional; diagnosticul audio verifică separat releul.

În aplicația jucătorului, **Oprește vocile lobby-ului în mixul capturat de OBS** taie coechipierii din redarea locală și din mixul capturat al aplicației. Microfonul transmis celorlalți nu este oprit de această opțiune. O sursă de microfon sau Desktop Audio separată în OBS rămâne sub controlul OBS. În Caster există controlul echivalent pentru co-casterii din canalul său separat. Nu există un bus de stream cu ascultare independentă în căști.

## Mute și istoric

**Mute pentru mine** oprește persoana numai în căștile și mixul local ale celui care apasă. Poate fi folosit pentru orice participant. Nu este o acțiune administrativă și nu apare în istoricul moderatorilor.

**Mute de moderare** suspendă accesul vocal al participantului: sesiunea este revocată, conexiunea vocală se închide și codurile sale nu pot redeschide vocea cât timp este suspendat. Se opresc atât transmisia, cât și ascultarea. Aplicația oficială închide conexiunile audio; nu încearcă reconectarea automată. După **Reactivează accesul vocal**, persoana reconectează manual. Pentru jucători, reintroducerea codului păstrat în sesiune este suficientă; pentru staff se folosește butonul de conectare cu rolul propriu. Nu se controlează microfonul global Windows, sursa separată de microfon din OBS sau alte programe.

Administratorul și moderatorii pot administra camerele și jucătorii. **Un moderator nu poate da mute sau unmute identității de administrator**, inclusiv trimițând o comandă fabricată. Verificarea se face pe identitatea autentificată, nu pe textul numelui. Contul de administrator trebuie conectat prin butonul cu rol propriu pentru a beneficia de protecția vocală; un jucător sau caster generic numit „admin” nu primește privilegii. Închiderea întregii camere este o comandă de organizare distinctă și deconectează toți participanții.

Numai administratorul vede **Istoric de moderare**: ora locală, numele contului care a acționat, persoana vizată, camera și mute/reactivare. Încercările de a modifica vocea administratorului sunt marcate refuzate. Autorul și ora sunt stabilite pe server, ignorând nume/roluri pretinse de client. Se rețin ultimele 1.000 de acțiuni, iar panoul arată ultimele 200, inclusiv după închiderea camerei. Moderatorii nu primesc acest istoric și nu există o comandă de ștergere a lui în panou.

## Stocare și limite

Implicit, camerele, codurile și istoricul există în memoria procesului: **se pierd când serverul repornește**. Panoul afișează această stare. Pentru păstrare, operatorul configurează `ORGANIZER_STORE_PATH` cu o cale privată care se termină în `.private.json`, pe un volum persistent al hostului. Fișierul se salvează atomic și conține nume, invitații și istoric; trebuie protejat de operator, exclus din Git și arhive publice. Un sistem de fișiere temporar al hostului nu devine persistent doar prin setarea variabilei. Parolele moderatorilor nu se scriu în acest fișier.

Operatorul hostului și deținătorii parolelor sunt de încredere. Istoricul nu este un registru extern imuabil și nu rezistă ștergerii de către operatorul serverului. Schimbarea parolelor cere actualizarea mediului și restartul serviciului. Invitațiile comune pot fi rotite din panou; cererile încă neaprobate sunt atunci anulate.

Administrația nu primește poziții, informații ascunse sau date automate de spectator. Team voice și Caster rămân izolate, inclusiv după mutări/închideri. Rutele aliaților/casterilor folosesc WebRTC între participanți prin TURN: doi clienți modificați care au deja negociat media pot continua în afara controalelor aplicației. Mute-ul nu este un mecanism anti-cheat împotriva lor. Ruta adversarilor este terminată pe server și verifică sesiunea la fiecare pachet. Se păstrează [limitele vizibilității raportate](enemy-camera.ro.md) și [configurarea OBS/delay](caster-mode.ro.md).

Înainte de folosire într-un eveniment: testează înscrierea celor 10 persoane, identitatea exactă furnizată de versiunea curentă a jocului, echipele, reconnect, mute/reactivare, un moderator nominal și administratorul, restartul cu/fără stocare, două rețele, izolarea casterului și OBS. Testele locale nu reprezintă aprobare Riot sau validare într-un custom real. Rezultatele exacte sunt în [raportul de verificare](verification-results.ro.md).
