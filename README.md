# RiftVoice pe Render — configurare

## 1. Repository GitHub
Creează un repository pentru proiect și încarcă sursele din RiftVoice-source.zip
în rădăcina lui. Nu încărca .env, credențiale, node_modules, dist, target sau
înregistrări locale. Arhiva de surse livrată exclude aceste date. Nu încărca doar
arhiva ca fișier: extrage și publică fișierele sursă, inclusiv render.yaml și server/.

## 2. Serviciul Render
În https://dashboard.render.com alege New -> Blueprint, conectează repository-ul
și aplică render.yaml. Definește un Web Service Node gratuit, cu root server,
build npm ci --include=dev && npm run build, start npm start, health /health.
Render furnizează PORT și certificatul HTTPS; nu trebuie setat PORT manual.
Adresa reală este atribuită de Render după creare. Numele solicitat nu garantează
un anumit subdomeniu. Deschide adresa urmată de /health și verifică status=ok.

## 3. Audio TURN
Serverul web și releul audio TURN sunt componente diferite. Planul gratuit Render
nu reprezintă și un releu TURN. În Cloudflare Realtime TURN creează credențialele,
apoi în Render -> serviciu -> Environment adaugă TURN_KEY_ID și TURN_KEY_API_TOKEN.
Nu le pune în repository, aplicația client, capturi de ecran sau conversații.
Repornește/redeploy serviciul după modificare. Alternativ, serverul suportă coturn
cu TURN_SERVER și TURN_SECRET. Cu Force TURN activ în clienți, lipsa unui releu
configurat poate împiedica vocea chiar dacă /health răspunde corect.

## 4. Clienții
Fiecare utilizator pune aceeași origine HTTPS reală în SET -> Voice server și
apasă Save server & restart connection. Nu adăuga /health sau /ws în câmp.
Toți trebuie să ruleze RiftVoice în același meci; gruparea după meci este automată.
Selecția Automatic urmărește campionul/skinul suportat; modul Manual păstrează
alegerea utilizatorului. Campionii fără preset rămân Natural.

## 5. Validare
- /health răspunde status=ok.
- Două calculatoare în același meci apar în aceeași cameră.
- Voce în ambele sensuri, inclusiv cu Force TURN activ.
- Reconnect după restart și verificarea regulilor de proximitate.
Apariția ambilor clienți în cameră nu dovedește singură transportul audio.

## Limite
Render Free poate adormi după 15 minute fără trafic și se poate reactiva în
aproximativ un minut. Există cote de utilizare. Acest ghid/configurația nu
înseamnă că serviciul a fost deja creat sau testat pe Render.

Documentație verificată la 5 noiembrie 2026:
https://render.com/docs/free
https://render.com/docs/blueprint-spec
https://render.com/docs/node-version
https://developers.cloudflare.com/realtime/turn/faq/
