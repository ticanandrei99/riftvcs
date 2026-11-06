# RiftVoice 0.3.0 — organizare custom și moderare

Adaugă în Caster autentificare de administrator și conturi nominale de moderator, invitație vocală comună pentru 10 persoane, înscriere înainte de meci cu Riot ID declarat, aprobare manuală și lista conexiunilor. Organizatorul poate muta locurile Albastru/Roșu sau schimba doi jucători înainte de start; după identificarea meciului echipele sunt blocate. Aceste operații nu mută persoanele în lobby-ul LoL și nu autentifică identitatea Riot.

Mute-ul de moderare suspendă transmisia și ascultarea, revocă sesiunea și oprește reconectarea automată. Moderatorii nu pot modifica vocea administratorului autentificat. Administratorul vede autorul nominal, ținta și ora fiecărui mute/reactivări sau încercări refuzate. Mute pentru mine rămâne separat. Camerele și istoricul se păstrează numai în memorie dacă operatorul nu configurează stocare privată persistentă.

Pe serverul actualizat configurează ORGANIZER_PASSWORD și MODERATOR_ACCOUNTS_JSON; vezi ORGANIZARE-MODERARE.ro.md. Canalul caster rămâne izolat, iar setările OBS, PTT/deafen, voice effects Natural/Robotic și vocea opțională a adversarilor din apropierea camerei sunt păstrate. ENEMY_CAMERA_VOICE=1 și TURN sunt necesare pentru ultima funcție.

Poți lipi în panou linkul lobby-ului copiat din clientul LoL. Invitația completă copiată include atât acel link, cât și codul vocal RiftVoice. Aplicația nu generează coduri Riot, nu deschide automat linkul și nu verifică disponibilitatea lobby-ului. Tournament API nu este integrat în această versiune.

Testele și build-urile exacte sunt în VERIFICARI.ro.md. Nu există aprobare Riot sau certificat Windows. Identitățile și vizibilitatea sunt raportate de client și nu reprezintă atestare Riot. Mute-ul nu poate revoca o rută P2P deja negociată între doi clienți modificați. Sunt necesare customuri reale, verificarea identităților/echipelor, zece calculatoare/rețele, OBS și delay de spectator. Update-ul afișează notificare și link; instalarea automată semnată nu este configurată.

Pentru GitHub folosește tag-ul exact v0.3.0 și atașează separat RiftVoice_0.3.0_x64-setup.exe și RiftVoice Caster_0.3.0_x64-setup.exe, împreună cu sursele, licența și ghidurile. Pregătirea pachetelor locale nu actualizează automat repository-ul, release-ul sau hostul public.
