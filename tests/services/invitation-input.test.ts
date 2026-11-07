import { parseInvitationInput } from '../../src/services/invitation-input';

test('accepts raw shared and personal credentials without interpreting an RV prefix as a shared grant',()=>{
  for(const token of ['RV-'+'a'.repeat(43),'RV-'+'b'.repeat(40),'c'.repeat(43)])expect(parseInvitationInput(token)).toEqual({token});
});
test('extracts only the voice code and validated server from the complete invitation',()=>{
  const token='RV-'+'x'.repeat(43);
  expect(parseInvitationInput(`Voxdria · Custom\nLobby LoL: https://gg.riotgames.com/LOL?joinCode=example\nServer vocal: https://voice.example\nCod vocal Voxdria: ${token}\nIntrodu invitația în Voxdria.`)).toEqual({token,server:'https://voice.example'});
});
test('preserves old branded invitations and generates a cross-version-compatible generic label',()=>{
  const token='RV-'+'y'.repeat(43);
  for(const label of ['Cod vocal RiftVoice','Cod vocal Voxdria','Cod vocal']){
    expect(parseInvitationInput(`Voxdria · Custom\nServer vocal: https://voice.example\n${label}: ${token}`)).toEqual({token,server:'https://voice.example'});
  }
});
test('rejects mixed old/new branded codes in the same invitation',()=>{
  expect(parseInvitationInput(`Cod vocal RiftVoice: ${'a'.repeat(43)}\nCod vocal Voxdria: ${'b'.repeat(43)}`)).toHaveProperty('error');
});
test('rejects ambiguous codes, credential-bearing server addresses, Riot-only links and oversized input',()=>{
  for(const input of [`Cod vocal: ${'a'.repeat(43)}\nCod vocal: ${'b'.repeat(43)}`,`Server: https://user:pass@voice.example\nCod vocal: ${'a'.repeat(43)}`,'https://gg.riotgames.com/LOL?joinCode=example','x'.repeat(4097)])expect(parseInvitationInput(input)).toHaveProperty('error');
});
