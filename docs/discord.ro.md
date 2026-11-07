# Discord — comunitate și canal Streamer

Voxdria deschide invitația comunității: https://discord.gg/s2HJ82yyEp

Voxdria Caster are suplimentar buton către canalul privat league-comentator: https://discord.com/channels/1543590286708707458/1553797324990324868

Aplicația trimite sistemului de operare una dintre aceste două destinații fixe. Nu cere parola sau tokenul Discord, nu autentifică automat conturi, nu acordă roluri și nu introduce vocea Discord în transportul Voxdria. Destinația privată este disponibilă prin comanda nativă numai în varianta Caster. Discord verifică separat dacă utilizatorul poate vedea/intra în canal; un link nu ocolește permisiunile.

## Rolul pe serverul Discord

Administratorul Discord poate crea rolul **Streamer** fără permisiunea Administrator. Pe canalul league-comentator:

- păstrează accesul administratorilor și moderatorilor existenți;
- acordă rolului Streamer **View Channel**, **Connect**, **Speak**;
- păstrează canalul privat pentru membrii obișnuiți, conform permisiunilor serverului;
- atribuie Streamer persoanelor care comentează evenimentul. Nu îl acorda automat tuturor celor care intră prin invitația comunității.

Rolul Member primit automat la intrarea pe server nu oferă acces la canalul privat. Streamer din Discord nu acordă administrare în Voxdria. Verifică permisiunile generale și suprascrierile canalului împreună: [documentația Discord](https://github.com/discord/discord-api-docs/blob/main/developers/topics/permissions.mdx).

## Audio și OBS

Butonul este acces rapid, fără integrare de transport audio. Conectarea vocală și mute/deafen din Discord rămân în Discord. Mute/PTT și controlul mixului Voxdria Caster nu controlează vocile Discord. Configurează și verifică sursa Discord separată în OBS; evită dublarea aceluiași comentariu prin ambele aplicații.

Canalul comentatorilor nu trebuie folosit de jucătorii activi ai aceluiași meci. Voxdria nu poate împiedica ascultarea externă a unui canal sau stream. Delay-ul de spectator/OBS rămâne manual. Linkul nu transmite informații despre meci sau poziții.

Integrarea vocală în aplicație ar cere autentificare oficială și îndeplinirea cerințelor Discord Social SDK; nu este inclusă în aceste butoane. Vezi [cerințele oficiale](https://github.com/discord/discord-api-docs/blob/main/developers/discord-social-sdk/core-concepts/communication-features.mdx).

Testele verifică destinațiile fixe, refuzul destinației private în varianta player și comenzile trimise de butoane. Nu modifică rolurile/canalul Discord și nu constituie o probă de conectare efectivă cu fiecare rol.
