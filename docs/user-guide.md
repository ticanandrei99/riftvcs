# Voxdria — ghid de utilizare

Voxdria folosește baza LoLProxChat, cu AGPL-3.0-or-later și creditul autorilor păstrate. Pentru versiunea curentă folosește [README](../README.md), [rezultatele](verification-results.ro.md) și [migrarea numelui](rebrand.ro.md).

## Jucători

1. Instalează Voxdria pentru Windows x64 și pornește League în modul Borderless. Configurează aceeași adresă HTTPS a serverului ca organizatorul și verifică microfonul/căștile.
2. În Conectare Voxdria, lipește invitația completă sau codul vocal RV-, completează Riot ID-ul și trimite cererea. Linkul Riot de lobby singur nu este cod vocal. Organizatorul verifică și aprobă persoana/echipa în Caster.
3. După aprobare poți conecta vocea de lobby cu coechipierii aprobați. La admiterea în meci, canalul de lobby se închide și începe fluxul de joc.
4. Proximity este modul standard: coechipieri apropiați și adversari apropiați identificați vizibil în camera proprie. Sunt necesare serverul actualizat, TURN și participanți compatibili. Lipsa unei poziții/identificări valide poate opri sunetul. Detalii: [proximity](enemy-camera.ro.md).
5. Folosește mute propriu, mute individual, deafen și PTT. Poți opri ascultarea adversarilor și alege separat modurile pentru echipă/cameră. Alegerile explicite sunt păstrate.
6. Natural/Robotic este procesare vocală opțională; preview-ul local se oprește după 30 de secunde sau la mute/deafen și nu repornește singur.

Dacă faci stream în timp ce joci, controlul vocilor primite din lobby oprește redarea lor în aplicație și în mixul capturat, inclusiv în căști. Nu oprește un microfon sau o sursă Discord capturată separat în OBS.

## Comentatori și organizatori

Folosește Voxdria Caster dacă nu joci activ meciul. Rolul caster/spectator audio se acordă prin invitație și rămâne separat de jucători. Nu există date automate de spectator. Autentificarea admin/moderator, generarea codului, cererile și echipele sunt în [organizare](organizer.ro.md). Nivelurile, mute/PTT/deafen, OBS și delay-ul sunt în [ghidul Caster](caster-mode.ro.md).

Butonul Discord deschide comunitatea, iar Caster oferă și canalul privat league-comentator. Accesul depinde de rolurile Discord, fără acordare automată de roluri sau punte audio: [ghid Discord](discord.ro.md).

## Actualizări și diagnostic

Aplicația verifică la pornire canalul oficial; notificarea deschide pagina fixă de release și instalarea este manuală. Adresa serverului nu se actualizează prin installer: [Render](RENDER.ro.md), [actualizări](UPDATES.ro.md).

Pentru o problemă într-un custom, activează Diagnostic înainte de meci și lasă arhiva să se finalizeze în %LOCALAPPDATA%\com.riftvoice.desktop\games. Identificatorul vechi este păstrat pentru compatibilitate. Arhiva poate conține nume și cadre de minimapă; inspectează conținutul înainte de partajare. Un replay .rofl singur nu înlocuiește imaginile necesare testelor vizuale.

Voxdria nu este aprobat de Riot. Testele locale și filtrarea media nu garantează exactitatea recunoașterii sau protecție împotriva rapoartelor falsificate. Vezi [revizia de securitate](security-review.ro.md).