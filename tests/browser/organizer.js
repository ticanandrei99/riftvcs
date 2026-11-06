import { mountOrganizer } from '../../src/caster/organizer';
window.organizerProofCasterInvitation = '';
window.organizerProofClipboard = '';
Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.organizerProofClipboard=text;}},configurable:true});
mountOrganizer(invitation => { window.organizerProofCasterInvitation = invitation; });
