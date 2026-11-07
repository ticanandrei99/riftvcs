# Voxdria Player 0.4.3 — variantă original-engine pentru test

Motorul jucătorului revine la sursa originală LoLProxChat 0.5.24, fără editarea codului de proximity, cameră, audio sau captură. Interfața Voxdria și invitațiile aprobate rămân, prin adaptoare separate.

- Voce în joc; pregame există numai înscrierea și aprobarea.
- Mute individual pentru coechipieri/adversari, mute microfon/ascultare și push-to-talk din motorul original.
- Cameră originală activă implicit. Efectele vocale Voxdria și previzualizarea procesată sunt inactive în această variantă.
- Casterul existent rămâne la 0.4.2; nu există un nou instalator Caster în acest pachet.
- Toți jucătorii au nevoie de 0.4.3, iar serverul trebuie actualizat la 0.4.3 înainte de test.
- Verificate local: sursă originală identică, audio sintetic între două echipe în ambele sensuri, permisiuni, moderare și închiderea sesiunii. Rezultatele complete și limitele sunt în VERIFICARI.ro.md / docs/verification-0.4.3.ro.md.

Versiune experimentală pentru custom, fără aprobare Riot. Filtrarea originală a camerei este locală și poate fi ignorată de un client modificat; pe acest traseu nu se aplică filtrul media strict al vechii versiuni. Lagul și resetarea driverului GPU nu sunt confirmate rezolvate. Rămân necesare testele cu microfoane reale, TURN extern, OBS și un custom real.

Bazat pe LoLProxChat de danthi123 și contributori, AGPL-3.0-or-later. Sursele complete, licența și notificările sunt incluse. Instalatorul Windows este nesemnat.
