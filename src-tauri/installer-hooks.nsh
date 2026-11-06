; Match RiftVoice application branding in the installer and uninstaller.
; __FILEDIR__ resolves against this source file, never a machine-specific path.
!define MUI_UNICON "${__FILEDIR__}\icons\icon.ico"
UninstallIcon "${__FILEDIR__}\icons\icon.ico"
