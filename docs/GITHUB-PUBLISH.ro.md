# Publicare Voxdria pe GitHub

Repository: https://github.com/ticanandrei99/riftvcs

Serverul Render și aplicațiile Windows se publică separat. Un server funcțional nu dovedește că sursele complete sau installerele variantei curente sunt în release. Pachetele locale 0.4.1 nu au fost publicate automat.

## Release-ul de acum

1. În repository, apasă Releases → Create a new release.
2. Tag: `v0.4.1`. Target: `main`, după încărcarea surselor complete. Titlu: `Voxdria 0.4.1 — Community test release`.
3. Copiază descrierea din `docs/RELEASE-NOTES.ro.md` sau `RELEASE-NOTES.ro.md` din pachetul release.
4. Atașează fișierele din pachetul release: `Voxdria_0.4.1_x64-setup.exe`, `Voxdria Caster_0.4.1_x64-setup.exe`, sursa completă ZIP, LICENSE, NOTICE.md, ghidurile și SHA256SUMS.txt. Cele două installere trebuie să fie assets individuale; updaterul nu le caută în interiorul arhivei de release.
5. Verifică fișierele înainte de Publish release. Pentru a fi văzut de verificarea automată, release-ul trebuie să fie publicat și stabil: nu Draft și nu Pre-release. Poți păstra titlul „Community test release” pentru a explica stadiul real. Dacă vrei ca această versiune să fie exclusiv Pre-release, notificarea automată pentru ea nu va apărea.

ZIP-ul automat „Source code” generat de GitHub din tag va conține doar fișierele care există în repository. Până când încarci întregul proiect, acesta NU înlocuiește `Voxdria-source.zip` pregătit pentru build-ul distribuit.

## Sursa vizibilă direct în repository

Extrage `Voxdria-v0.4.1-GitHub.zip`. Cu GitHub Desktop: clonează repository-ul existent într-un folder separat; copiază conținutul extras în rădăcina clonei; verifică modificările, apoi Commit și Push. Păstrează structura `server/` și `render.yaml` la rădăcină, astfel încât Render să continue să compileze din `server`. Include `vendor/deepmerge`, necesar pentru instalarea reproductibilă a uneltelor de test.

Pentru încărcare din browser, folosește `Voxdria-v0.4.1-GitHub-browser.zip` și instrucțiunile din interior: conținutul fiecărui lot numerotat se încarcă pe rând din rădăcina repository-ului, sub limita de 100 de fișiere. Nu încărca ZIP-ul drept cod și nu crea subfoldere cu numele loturilor. Așteaptă toate loturile înaintea unui deploy.

Nu încărca folderul părinte ca un subfolder nou. Nu încărca `node_modules`, `src-tauri/target`, `.env`, fișiere cu tokenuri sau capturi care arată parole. Folderul pregătit include și fișiere ascunse precum `.github` și `.gitignore`; GitHub Desktop le va include corect. Nu a fost făcut niciun push sau release automat de către asistent.

## Versiunile viitoare

Setup-urile actuale și serverul local au versiunea `0.4.1`. Pentru următoarea actualizare, sincronizează fișierele prin `scripts/bump-version.mjs`, recompilă, verifică și publică un tag numeric nou împreună cu cele două installere și sursa corespunzătoare. Simplul titlu „Voxdria Release”, fără un tag numeric nou, nu declanșează notificarea.

Jucătorii trebuie să instaleze o dată build-ul cu verificarea actualizărilor. Aceasta rulează doar la deschiderea aplicației; nu trimite notificări periodice în timpul jocului și nu instalează fără acord. Render publică serverul separat și nu distribuie setup-ul Windows.

Pentru notificarea clienților RiftVoice vechi, încarcă și cele două aliasuri din legacy-updater-assets ca assets individuale ale aceluiași release. Acestea sunt copii identice ale installerelor Voxdria; vezi [migrarea](rebrand.ro.md).
