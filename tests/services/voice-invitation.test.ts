import {voiceInvitationError,saveVoiceInvitation} from '../../src/services/voice-access';
import {parseOrganizerState} from '../../src/caster/organizer';
describe('voice invitation and organizer view validation',()=>{
  test('explains Riot lobby links without treating them as voice access',()=>{
    expect(voiceInvitationError('https://gg.riotgames.com/LOL?joinCode=test')).toContain('lobby LoL');
    expect(saveVoiceInvitation('https://gg.riotgames.com/LOL?joinCode=test')).toBe(false);
    expect(voiceInvitationError('too-short')).toContain('invalid');
    expect(voiceInvitationError('RV-'+'a'.repeat(43))).toBeNull();expect(voiceInvitationError('a'.repeat(43))).toBeNull();
  });
  test('rejects malformed, oversized or non-player role information in organizer snapshots',()=>{
    const event={id:'event-test',title:'Custom',invite:'RV-'+'a'.repeat(43),expiresAt:2000000000000,bound:false,capacity:10,casterInvitation:'b'.repeat(43),casterName:'Caster',players:[],pending:[]};
    const value={type:'organizer_state',persistent:false,events:[event]};expect(parseOrganizerState(value)).not.toBeNull();
    expect(parseOrganizerState({...value,events:Array(13).fill(event)})).toBeNull();
    expect(parseOrganizerState({...value,events:[{...event,players:[{name:'Player',team:'admin',connected:true}]}]})).toBeNull();
    expect(parseOrganizerState({...value,events:[{...event,invite:'https://invalid.example/'}]})).toBeNull();
    expect(parseOrganizerState({...value,events:[{...event,lobbyLink:'https://gg.riotgames.com/LOL?joinCode=QA-only'}]})).not.toBeNull();
    expect(parseOrganizerState({...value,events:[{...event,lobbyLink:'https://evil.invalid/'}]})).toBeNull();
  });
});
