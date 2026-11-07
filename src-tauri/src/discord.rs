use serde::Deserialize;

const COMMUNITY: &str = "https://discord.gg/s2HJ82yyEp";
const STREAMER_CHANNEL: &str = "https://discord.com/channels/1543590286708707458/1553797324990324868";

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiscordDestination { Community, Streamer }

fn destination_url(destination: DiscordDestination, caster: bool) -> Result<&'static str, &'static str> {
    match destination {
        DiscordDestination::Community => Ok(COMMUNITY),
        DiscordDestination::Streamer if caster => Ok(STREAMER_CHANNEL),
        DiscordDestination::Streamer => Err("The streamer channel is available from Voxdria Caster"),
    }
}

/// Fixed destinations only. Discord performs membership, authentication and channel permission checks.
/// No OAuth token, account automation, role assignment or audio bridge is involved.
#[tauri::command]
pub fn open_discord_link(app: tauri::AppHandle, destination: DiscordDestination) -> Result<(), String> {
    let url = destination_url(destination, app.config().identifier == "com.riftvoice.caster")?;
    std::process::Command::new("explorer.exe").arg(url).spawn().map_err(|_| "Discord link could not be opened")?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn only_the_fixed_destinations_are_deserializable() {
        for value in ["community", "streamer"] { assert!(serde_json::from_str::<DiscordDestination>(&format!("\"{value}\"")).is_ok()); }
        for value in ["https://evil.test", "file:///C:/test.exe", "discord://evil", "administrator", "../streamer"] {
            assert!(serde_json::from_str::<DiscordDestination>(&format!("\"{value}\"")).is_err());
        }
    }
    #[test] fn player_build_cannot_request_the_private_streamer_destination() {
        assert_eq!(destination_url(DiscordDestination::Community,false).unwrap(),COMMUNITY);
        assert!(destination_url(DiscordDestination::Streamer,false).is_err());
        assert_eq!(destination_url(DiscordDestination::Streamer,true).unwrap(),STREAMER_CHANNEL);
    }
}
