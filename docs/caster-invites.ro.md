# Invitații pentru comentatori — Voxdria Caster 0.4.2

Actualizează serverul și Voxdria Caster la 0.4.2. Pentru testul comunității, folosește și clientul Voxdria 0.4.2. Installerul nu actualizează serviciul Render.

## Organizatorul

1. Se autentifică în Caster cu parola de administrator sau propriul cont de moderator și creează camera.
2. Din **Comentatori și spectatori · link separat, cu aprobare**, apasă **Copiază linkul comentatorilor**. Îl trimite numai persoanelor care vor comenta sau asculta canalul comentatorilor.
3. Cererea apare în **Cereri comentatori**, cu numele declarat și rolul cerut. Organizatorul verifică persoana și se asigură că nu joacă activ meciul.
4. Apasă **Aprobă comentator** pentru microfon sau **Aprobă doar ascultare** pentru spectator audio. Poate respinge cererea. Pentru o cerere doar de ascultare nu poate activa microfonul; persoana trebuie să trimită o cerere nouă pentru acel rol.

Administratorul/moderatorul care organizează folosește **Conectează acest Caster cu rolul meu** pentru propria conexiune audio. Autentificarea panoului și conectarea canalului audio au stări separate: un panou autentificat nu înseamnă că microfonul/căștile sunt conectate.

## Invitatul

1. Deschide aplicația **Voxdria Caster**, fără parola de administrator.
2. Lipește linkul complet în **Invitație comentatori**, completează numele și alege **Comentator** sau **Spectator audio**. Apasă **Conectează / trimite cererea**.
3. Ține aplicația deschisă și așteaptă aprobarea, maximum cinci minute. **Deconectează / anulează** retrage cererea. Închiderea aplicației sau pierderea conexiunii o anulează; cererile nu sunt păstrate după restartul serverului.
4. După aprobare, aplicația încearcă automat conectarea audio. Comentatorul pornește cu microfonul oprit și PTT activ. Spectatorul nu deschide microfonul. Un mesaj de eroare pentru microfon, ieșirea OBS sau conexiune cere remediere și reconectare manuală.

Linkul deschis în browser afișează instrucțiuni și pagina de descărcare. **Nu lansează automat aplicația** și nu cere microfon sau parolă. Copiază adresa completă, inclusiv partea de după `#`, în aplicație. Codul `VC-` poate fi lipit și singur dacă serverul este deja configurat corect. Un link pentru alt server este refuzat. Codul `RV-` aparține jucătorilor și este refuzat explicit aici.

Aprobarea emite o invitație personală, livrată numai conexiunii care a cerut accesul. Este păstrată în memoria și stocarea de sesiune a ferestrei, limitată la server și la expirarea camerei. Butonul **Reconectează** o refolosește fără o nouă aprobare, inclusiv după reîncărcarea aceleiași ferestre când stocarea de sesiune este disponibilă. După închiderea aplicației, pierderea stocării sau expirare poate fi necesară o cerere nouă; organizatorul poate elimina accesul vechi dacă numele este rezervat. Invitațiile personale statice deja aprobate sunt încă acceptate direct, pentru compatibilitate.

## Revocare și limite

- **Schimbă linkul comentatorilor** invalidează linkul vechi și respinge cererile în așteptare. Nu revocă persoanele deja aprobate. Codul jucătorilor este independent.
- **Mute de moderare** închide sesiunea audio a persoanei și oprește reconectarea până la reactivare. După reactivare, reconectarea este manuală.
- **Elimină comentatorul** revocă invitația personală și închide sesiunea. Persoana trebuie să trimită o cerere nouă pentru acces ulterior.
- Închiderea/expirarea camerei revocă invitațiile și cererile aferente.
- Maximum 20 de cereri în așteptare pe cameră, împreună cu cererile jucătorilor; 100 pe server. Canalul permite maximum 24 de invitații noi de comentatori/spectatori și membri ai administrării, plus invitația directă veche păstrată pentru compatibilitate. Aceste limite nu măresc cele zece locuri de jucători și nu sunt o certificare a capacității TURN/hostului.

Numele este declarat de utilizator, fără autentificare Riot sau Discord. Serverul împiedică folosirea aceluiași nume normalizat deja aprobat simultan ca jucător și invitat pe canalul comentatorilor, inclusiv la aprobări concurente. Un alias poate ocoli verificarea de nume; organizatorul trebuie să verifice identitatea reală. Linkul nu oferă administrare sau date despre joc.

Canalul comentatorilor nu se conectează la vocea de echipă/proximity a jucătorilor. Nu colectează poziții, nu obține automat date de spectator și nu controlează Vanguard. Un client modificat poate păstra o legătură P2P deja negociată; revocarea de semnalizare nu este o garanție împotriva colaborării în afara aplicației. Aplică regulile evenimentului și delay-ul corect în OBS. Vezi [mixul OBS și izolarea audio](caster-mode.ro.md).

După deploy, `/health` trebuie să arate `serverVersion: "0.4.2"`, `casterInviteProtocol: 1` și `casterRequestsAvailable: true`. Un server anterior nu implementează această aprobare; clientul afișează eroarea/expirarea, fără să pornească microfonul.
