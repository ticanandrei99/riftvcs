# Voxdria 0.4.2 — invitații și aprobare pentru comentatori

Organizatorul poate copia un link separat pentru comentatori și spectatori audio. Invitatul lipește linkul în Voxdria Caster, completează numele și rolul și trimite cererea. Administratorul sau moderatorul aprobă ori respinge din secțiunea Cereri comentatori. Parola de administrare nu se distribuie invitaților.

- Microfonul nu se deschide înainte de aprobare. Comentatorul aprobat pornește cu microfonul oprit și PTT activ; spectatorul audio nu transmite. O cerere doar de ascultare nu poate fi promovată la microfon.
- Reconectarea refolosește invitația personală aprobată pe durata sesiunii și până la expirare. Schimbarea linkului oprește cererile vechi; eliminarea persoanei revocă accesul ei.
- Mesajele pentru cerere refuzată, microfon indisponibil și ieșire OBS nereușită rămân vizibile. Panoul autentificat și canalul audio au stări distincte.
- Canalul comentatorilor este separat de vocea jucătorilor, inclusiv înainte de meci. Aprobarea nu acordă administrare, date de spectator sau acces la poziții ascunse. Numele este declarat, fără autentificare Riot; organizatorul verifică persoana.
- Proximity rămâne modul standard al jucătorilor, inclusiv pentru adversari apropiați identificați vizibil în camera proprie. Team voice, mute individual, PTT/deafen, Champion Voice Changer opțional și mixul OBS sunt păstrate.
- Arhiva pentru încărcarea surselor din browser împarte automat fiecare lot la maximum 99 de fișiere.

Actualizează serverul Render și ambele aplicații la 0.4.2. Verifică /health: serverVersion=0.4.2, casterInviteProtocol=1, casterRequestsAvailable=true, lobbyVoiceProtocol=1 și enemyCameraVoice=true. O valoare veche ENEMY_CAMERA_VOICE=0 suspendă vocea adversarilor și trebuie schimbată la 1. Installerul nu actualizează serverul.

Pașii sunt în INVITATII-CASTER.ro.md și CASTER-OBS.ro.md. Rezultatele locale sunt în VERIFICARI.ro.md. Mai sunt necesare customul real cu zece PC-uri/rețele, capacitatea și consumul TURN pe durata evenimentului, reglarea microfoanelor, mixul OBS și delay-ul spectator/stream. Probele hardware/OBS din 0.4.0 sunt marcate drept anterioare. Două suite vizuale cer înregistrări reale încă indisponibile.

Build-uri de comunitate nesemnate, fără aprobare Riot. Raportarea vizibilității poate fi falsificată de un client modificat; filtrarea media nu este atestare anti-cheat. Notificarea de update deschide pagina fixă de descărcare; instalarea automată semnată nu este configurată. Linkurile Discord nu conectează automat vocea sau rolurile Discord.

Pentru GitHub Release folosește tag-ul exact v0.4.2 și atașează individual Voxdria_0.4.2_x64-setup.exe și Voxdria Caster_0.4.2_x64-setup.exe, sursele, licența și ghidurile. Aliasurile identice pentru updaterul RiftVoice rămân în legacy-updater-assets. Pachetele locale nu sunt publicare sau deploy automat.

Bazat pe LoLProxChat/danthi123, cu păstrarea creditului și licenței AGPL-3.0-or-later. Rebrandul și limitele migrării NSIS sunt descrise în MIGRARE-NUME.ro.md.
