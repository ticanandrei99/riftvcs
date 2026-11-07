# Actualizări Voxdria

La aproximativ 1,5 secunde după pornire, aplicația verifică automat canalul oficial. Dacă există o versiune stabilă mai nouă cu installer pentru varianta folosită, afișează:

    Versiune nouă disponibilă: Voxdria {versiune}.
    [Actualizează] [Mai târziu]

Verificarea automată este activă implicit în modul normal și Caster Mode. În aplicația normală poate fi dezactivată din Setări → Verificări automate. Butonul Verifică actualizările rămâne disponibil. O conexiune indisponibilă la pornire nu blochează folosirea aplicației; verificarea manuală afișează o eroare simplă.

Actualizează deschide pagina fixă https://github.com/ticanandrei99/riftvcs/releases. Nu închide jocul, nu execută un URL furnizat de server și nu instalează nimic automat. Mai târziu ascunde notificarea pentru sesiunea curentă; la următoarea pornire verificarea rulează din nou. Instalarea automată va necesita configurarea și testarea unui canal semnat criptografic; acesta nu este încă provisionat.

Release-urile trebuie să fie stabile (fără draft/prerelease), cu tag de forma vMAJOR.MINOR.PATCH. Numele installerului normal este Voxdria_VERSION_x64-setup.exe; pentru caster: Voxdria Caster_VERSION_x64-setup.exe. Fiecare variantă recunoaște numai propriul installer încărcat în același release. Nu se notifică un downgrade, un asset lipsă sau un URL de alt repository. Semantica este verificată prin teste native; o verificare a metadatelor nu este o semnătură digitală a installerului.

Versiunea aplicației native, package.json și package-lock.json trebuie să rămână sincronizate. scripts/bump-version.mjs verifică toate fișierele înainte de modificare; --dry-run calculează versiunea fără să scrie. Nu a fost publicat un release nou în această sesiune. Nu se poate demonstra un update real între două versiuni publicate până când există artifacte de release verificate și canalul este pregătit.

Pentru tranziția de la numele RiftVoice: [migrarea Voxdria](rebrand.ro.md). Aliasurile legacy se încarcă separat ca assets individuale; installerul canonic rămâne Voxdria.
