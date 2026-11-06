import { describe,it,expect,vi } from 'vitest';
import { normalizeLobbyLink } from '../src/lobby-link.js';
import { OrganizerEvents } from '../src/organizer-events.js';
import { SessionRegistry,type VoiceGrant } from '../src/access.js';
import { RoomManager } from '../src/rooms.js';
describe('organizer-provided Riot lobby link',()=>{
  it('normalizes the observed HTTPS lobby format and allows the optional empty field',()=>{
    expect(normalizeLobbyLink(undefined)).toBe('');expect(normalizeLobbyLink('  ')).toBe('');
    expect(normalizeLobbyLink(' https://gg.riotgames.com/LOL?joinCode=QA-test-only ')).toBe('https://gg.riotgames.com/LOL?joinCode=QA-test-only');
  });
  it('rejects arbitrary URLs, credentials, lookalike hosts, fragments and extra query fields',()=>{
    for(const value of ['http://gg.riotgames.com/LOL?joinCode=abc','https://evil.invalid/LOL?joinCode=abc','https://gg.riotgames.com.evil.invalid/LOL?joinCode=abc','https://user:pass@gg.riotgames.com/LOL?joinCode=abc','https://gg.riotgames.com/LOL?joinCode=abc#fragment','https://gg.riotgames.com/LOL?joinCode=abc&other=abc','https://gg.riotgames.com/LOL?joinCode=abc&joinCode=def','https://gg.riotgames.com/LOL?joinCode=%0aabc','https://gg.riotgames.com:444/LOL?joinCode=abc','https://gg.riotgames.com/OTHER?joinCode=abc',{},'x'.repeat(301)])expect(()=>normalizeLobbyLink(value)).toThrow();
  });
  it('stores the copied link only as metadata, without fetching Riot or changing voice authorization',()=>{
    const players:VoiceGrant[]=[],casters:VoiceGrant[]=[],events=new OrganizerEvents(players,casters,new SessionRegistry(),new RoomManager(true));
    const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No external calls allowed'));
    try{
      events.create('Custom','Caster',1,'https://gg.riotgames.com/LOL?joinCode=QA-test-only');
      const first=(events.snapshot() as any).events[0];expect(first.lobbyLink).toContain('QA-test-only');expect(first.invite).toMatch(/^RV-/);expect(players).toHaveLength(0);
      events.setLobbyLink(first.id,'https://gg.riotgames.com/LOL?joinCode=QA-updated');const next=(events.snapshot() as any).events[0];expect(next.invite).toBe(first.invite);expect(fetch).not.toHaveBeenCalled();
      expect(()=>events.setLobbyLink(first.id,'https://evil.invalid')).toThrow();expect((events.snapshot() as any).events[0].lobbyLink).toContain('QA-updated');
    }finally{events.stop();fetch.mockRestore();}
  });
});
