# Publicare RiftVoice pe GitHub

Repository: https://github.com/ticanandrei99/riftvcs

Captura arată deja serverul, LICENSE, README și render.yaml. Render poate funcționa doar din acestea: nu dovedește că sursa aplicației Windows este publicată.

## Release-ul de acum

1. În repository, apasă Releases → Create a new release.
2. Tag: `v0.1.0`. Target: `main`. Titlu: `RiftVoice 0.1.0 — Community test release`.
3. Copiază descrierea din `RiftVoice-Release-notes.md`.
4. Atașează TOATE fișierele din folderul `RiftVoice-GitHub-Release`: setup, sursa completă ZIP, LICENSE, NOTICE.md și SHA256SUMS.txt.
5. Verifică fișierele înainte de Publish release. Pentru a fi văzut de verificarea automată, release-ul trebuie să fie publicat și stabil: nu Draft și nu Pre-release. Poți păstra titlul „Community test release” pentru a explica stadiul real. Dacă vrei ca această versiune să fie exclusiv Pre-release, notificarea automată pentru ea nu va apărea.

ZIP-ul automat „Source code” generat de GitHub din tag va conține doar fișierele care există în repository. Până când încarci întregul proiect, acesta NU înlocuiește `RiftVoice-source.zip` pregătit pentru build-ul distribuit.

## Sursa vizibilă direct în repository

Folderul `RiftVoice-GitHub` conține sursa completă extrasă, fără dependențe instalate, executabile sau credențiale locale. Cu GitHub Desktop: clonează repository-ul existent într-un folder separat; copiază CONȚINUTUL folderului RiftVoice-GitHub în rădăcina clonei; verifică modificările, apoi Commit și Push. Păstrează structura `server/` și `render.yaml` la rădăcină, astfel încât Render să continue să compileze din `server`.

Nu încărca folderul părinte ca un subfolder nou. Nu încărca `node_modules`, `src-tauri/target`, `.env`, fișiere cu tokenuri sau capturi care arată parole. Folderul pregătit include și fișiere ascunse precum `.github` și `.gitignore`; GitHub Desktop le va include corect. Nu a fost făcut niciun push sau release automat de către asistent.

## Versiunile viitoare

Setup-ul actual are versiunea `0.1.0`. Pentru următoarea actualizare, mărește coerent versiunea din fișierele proiectului, recompilă și publică, de exemplu, tag `v0.1.1` cu setup `RiftVoice_0.1.1_x64-setup.exe` și sursa acelei versiuni. Simplul titlu „Rift Voice Release”, fără un tag numeric nou, nu declanșează notificarea.

Jucătorii trebuie să instaleze o dată build-ul cu verificarea actualizărilor. Aceasta rulează doar la deschiderea aplicației; nu trimite notificări periodice în timpul jocului și nu instalează fără acord. Render publică serverul separat și nu distribuie setup-ul Windows.
