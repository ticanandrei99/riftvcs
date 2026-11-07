# Voxdria 0.4.1 — nume nou și proximity standard

RiftVoice devine **Voxdria**, iar aplicația comentatorilor se numește **Voxdria Caster**. Titlurile, interfața română/engleză, notificările, procesul Windows, sursele, pachetele și installerele folosesc numele nou. Păstrăm culorile negru/roșu, iconul de microfon și creditul/licența LoLProxChat.

**Proximity este modul standard implicit pentru jucători**, inclusiv pentru adversarii apropiați identificați vizibil în camera proprie. Serverul activează gateway-ul implicit, iar blueprint-ul folosește ENEMY_CAMERA_VOICE=1. O valoare 0 deja salvată în Render trebuie schimbată la 1. TURN rămâne necesar. Ascultarea se oprește la lipsa identității/camerei/poziției, raport expirat, distanță nepermisă sau moarte; mute/deafen și controalele personale sunt păstrate. Nu se obțin poziții ascunse sau date automate de spectator.

Invitațiile RiftVoice deja emise rămân acceptate. Generatorul Voxdria folosește o etichetă citibilă și de clientul precedent. Identificatorii aplicațiilor și preferințele sunt păstrate; adresele reale GitHub/Render rămân cele existente. Ghidul MIGRARE-NUME.ro.md explică instalarea, limita migrării NSIS și aliasurile necesare pentru notificarea clienților vechi.

Sunt păstrate: înscriere/aprobare în lobby, maximum zece jucători/cinci pe echipă, mutare/schimb, voce de lobby pe echipe, moderatori nominali, administrator protejat, istoric de moderare, mute individual, PTT/deafen, Natural/Robotic opțional și preview. Casterii/spectatorii audio rămân separați de jucători, cu mix OBS și controlul vocilor primite. Butoanele Discord sunt linkuri externe; rolurile și vocea Discord rămân gestionate separat.

COMPARATIE.ro.md prezintă ce am preluat din LoLProxChat, ce am adăugat și ce nu am demonstrat prin probe comparative. Nu atribuim Voxdria invenția camera mode, mute-ului individual sau infrastructurii originale de teste.

Rezultatele exacte sunt în VERIFICARI.ro.md și FUNCTII-VERIFICATE.ro.md. Probele hardware/OBS 0.4.0 sunt marcate drept anterioare, pe componentele audio păstrate. Mai sunt necesare customul real cu zece PC-uri/rețele, înregistrările pentru două suite vizuale, TURN/capacitatea hostului în eveniment, reglarea microfoanelor și delay-ul spectator/stream, instalarea curată și migrarea între release-uri publicate.

Build-uri de comunitate nesemnate, fără aprobare Riot. Vizibilitatea raportată de client poate fi falsificată; filtrarea media nu este atestare anti-cheat. Notificarea de update deschide pagina fixă; instalarea automată semnată nu este configurată.

Pentru release folosește tag-ul exact **v0.4.1** și atașează individual **Voxdria_0.4.1_x64-setup.exe** și **Voxdria Caster_0.4.1_x64-setup.exe**, sursele, licența și ghidurile. Pentru notificarea vechilor instalări, atașează și aliasurile identice din legacy-updater-assets. Installerele singure nu actualizează Render, iar pachetele locale nu sunt publicare sau deploy automat.