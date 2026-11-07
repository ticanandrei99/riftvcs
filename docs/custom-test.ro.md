# Primul test în custom — Voxdria 0.4.2

## Pregătire

1. Încarcă toate sursele pe GitHub și actualizează serviciul Render. Verifică `/health`: versiunea 0.4.2, `organizerAvailable`, `casterRequestsAvailable`, `lobbyVoiceAvailable` și `enemyCameraVoice` active, protocoalele de invitație/lobby/caster la 1. Păstrează TURN configurat. Nu folosi variabilele pentru teste nesecurizate sau loopback pe host.
2. Jucătorii instalează **Voxdria**; persoanele care comentează fără să joace instalează **Voxdria Caster**. Folosiți aceeași versiune și același server. Închideți instanțele vechi și folosiți căști.
3. Organizatorul creează camera. Trimite codul `RV-` jucătorilor și linkul `VC-` comentatorilor. Verifică manual cine solicită accesul; numele nu sunt autentificate Riot. Parola de administrare rămâne numai la administrator/moderator.

## Probă cu două persoane

Două persoane sunt suficiente pentru vocea jucătorilor. Pentru verificarea simultană a izolării unui Caster este necesară și o a treia persoană, care nu joacă activ.

- Înainte de meci, aprobați doi jucători în aceeași echipă: verificați vocea, mute individual și oprirea vocilor primite din mix. După mutarea pe echipe diferite, vocea de lobby nu trebuie să treacă între echipe.
- Porniți un custom cu cei doi în echipe opuse. Cu proximity activ și ambii în viață, apropiați campionii și țineți adversarul vizibil în propria cameră. Verificați auzul în fiecare direcție. Apropierea singură nu este suficientă dacă adversarul nu este vizibil pe partea camerei ascultătorului.
- Îndepărtați-vă, mutați camera, ascundeți adversarul în fog of war sau opriți temporar capturarea autorizată din aplicație. Vocea adversarului trebuie să se oprească. Repetați după moarte/respawn și după revenirea capturii. Nu folosiți un client modificat, skin changer sau date ascunse pentru probă.
- Verificați mute individual, mute/deafen, PTT, reconectarea după moderare și Champion Voice Changer activ/inactiv. Pentru fiecare rută notați cine a auzit pe cine și în ce stare a jocului.

## Caster, OBS și zece jucători

- Casterul invitat lipește linkul, alege numele/rolul și trimite cererea. Până la aprobare nu trebuie deschis microfonul. După aprobare, comentatorul pornește cu microfonul oprit; spectatorul audio nu trebuie să transmită nici după schimbarea controalelor locale.
- Verificați refuzul, anularea, reconectarea, mute-ul de moderare și eliminarea accesului. Organizatorul se conectează prin rolul propriu. Vocile comentatorilor nu trebuie să ajungă la niciun jucător, în lobby sau în meci; Caster nu primește automat vocea jucătorilor.
- În OBS, urmați [configurarea mixului](caster-mode.ro.md). Faceți întâi o înregistrare locală: vocile co-casterilor, comentariul local, controlul vocilor primite, evitarea dublării microfonului și oprirea ieșirii după deconectare. Reglați nivelurile fără clipping și sincronizați manual cu imaginea/delay-ul spectatorului. Voxdria nu controlează o sursă independentă de microfon în OBS sau vocea Discord.
- Extindeți proba la zece jucători pe PC-uri/rețele distincte și la casterii reali. Notați conectările nereușite, întreruperile, întârzierea, calitatea vocii și stabilitatea hostului pe durata evenimentului. Un test local nu dovedește capacitatea acestui plan Render/TURN.

La două zile de eveniment pe săptămână, opt ore/zi înseamnă aproximativ 69 de ore/lună; zece ore/zi înseamnă aproximativ 87. Pentru o limită de 1.000 GB/lună, bugetul mediu este aproximativ 14,4, respectiv 11,5 GB/oră. Acestea sunt praguri de buget, nu un consum măsurat al aplicației. Video către platforma de streaming nu trece prin TURN. Releul transportă mai multe copii audio și ruta adversarilor; verificați modul de contorizare și consumul efectiv înainte de estimarea lunii. Durata streamului poate diferi de durata conexiunilor vocale active.

Păstrați raportul de diagnostic și o înregistrare locală numai cu acordul participanților. Verificați numele, cadrele de joc și eventualele secrete înainte de a le partaja. Rezultatele automatizate și probele care încă lipsesc sunt în [raport](verification-results.ro.md).
