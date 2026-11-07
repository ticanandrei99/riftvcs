jest.mock('@tauri-apps/api/core',()=>({invoke:jest.fn()}));
import {invoke} from '@tauri-apps/api/core';
import {openDiscord} from '../../src/services/discord';
const native=invoke as jest.Mock;
beforeEach(()=>native.mockReset());
test('requests only a destination name; the WebView never supplies an executable or URL',async()=>{
  native.mockResolvedValue(undefined);await openDiscord('community');await openDiscord('streamer');
  expect(native.mock.calls).toEqual([['open_discord_link',{destination:'community'}],['open_discord_link',{destination:'streamer'}]]);
});
test('a missing native bridge is a rejected promise rather than an uncaught synchronous exception',async()=>{
  native.mockImplementation(()=>{throw Error('Bridge unavailable');});await expect(openDiscord('community')).rejects.toThrow('Bridge unavailable');
});
