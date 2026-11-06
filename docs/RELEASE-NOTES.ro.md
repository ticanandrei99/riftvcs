# RiftVoice 0.2.0 — candidat local pentru testare în custom

Adaugă voce pentru adversarii apropiați, identificați vizibil în dreptunghiul camerei. Sunt necesare sub 1.350 unități distanță, imagine recentă, poziție proprie identificată, ambii jucători în viață și acordul ambelor persoane. Caster Mode rămâne izolat.

Vocea adversarilor trece printr-un filtru media pe server. Permisiunile expiră rapid; dispariția iconului, oprirea capturii, ieșirea din cameră sau raza de apropiere opresc livrarea pachetelor audio. Pentru activare sunt necesare sursele noi de server, TURN funcțional și ENEMY_CAMERA_VOICE=1. Serverul public existent nu a fost actualizat.

Păstrează invitațiile organizatorului, mute individual/Mute All, PTT și efectele locale Natural/Robotic. Există installere separate pentru jucători și comentatori, documentație OBS și o arhivă curată pentru GitHub.

Limite: vizibilitatea vine din client și poate fi falsificată; filtrul nu este o atestare Riot. Operatorul media este de încredere și are acces tehnic la audio. Testele cu tonuri/rapoarte sintetice nu înlocuiesc un custom real. Vezi verificările exacte și limitările în VERIFICARI.ro.md / docs/verification-results.ro.md. Nu există aprobare Riot, semnare Windows sau instalare automată semnată. Nu s-a publicat un release în această sesiune.
