# Voxdria — utilizare și verificare

Voxdria este un fork AGPL din LoLProxChat, cu interfață română/engleză și efecte Natural/Robotic locale, opționale. Nu este aprobat sau susținut de Riot și nu garantează protecție de la sancțiuni.

Pentru versiunea curentă:
- Panou cu parolă, moderatori nominali, înscriere înainte de meci, echipe și mute cu istoric: [Organizare și moderare](organizer.ro.md).
- Configurare camere, invitații, roluri și OBS: [Caster Mode](caster-mode.ro.md).
- Verificări automate la pornire și notificări: [Actualizări](UPDATES.ro.md).
- Remedieri și limite: [Audit de securitate](security-review.ro.md).
- Ce s-a executat efectiv: [Rezultate](verification-results.ro.md).

Producția cere invitații și separă rutele directe pe echipe. Din 0.2.0, vocea adversarilor apropiați, identificați vizibil în cameră, poate fi activată explicit pe server printr-un filtru media; vezi [Enemy Camera Voice](enemy-camera.ro.md). Casterii rămân izolați. Nu există fallback la serverul vechi, iar numele mascate nu sunt reconstruite.

Testul local de microfon redă vocea procesată și se oprește după 30 de secunde. Această limită nu se aplică apelului. Mute pentru microfon sau toate vocile oprește și testul, care nu repornește automat la unmute. Natural este bypass; Robotic folosește procesare locală, fără înregistrări oficiale sau voice cloning.

## Build Windows

Necesită Windows x64, Node 22.12+, toolchain Rust MSVC din rust-toolchain.toml, Visual Studio C++ Build Tools, Windows SDK și WebView2.

    npm ci
    npm --prefix server ci
    npm run verify
    npm run build:prod
    cargo test --release --locked --manifest-path src-tauri/Cargo.toml
    npm run test:voice-audio
    npm run build:windows

Pentru varianta dedicată: npm run build:windows:caster. Configurația are identificator separat, iar fereastra nu poate apela comenzile de captură/joc/hotkey-uri. Executabilul de lucru din target/release este suprascris la schimbarea variantei; installerul are nume distinct. Nu confunda un executabil de lucru cu un release public validat.

Build-ul și testele automate sunt diferite de instalare/dezinstalare, OBS și un custom real. Împachetarea pentru distribuție trebuie făcută numai după verificări, cu source corespunzător, LICENSE, NOTICE.md și checksum-uri. Certificatul Windows și canalul de instalare automată semnat nu sunt încă configurate.
