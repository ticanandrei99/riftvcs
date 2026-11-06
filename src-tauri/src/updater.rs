use serde::Serialize;
use std::time::{Duration, Instant};
const LATEST: &str = "https://api.github.com/repos/ticanandrei99/riftvcs/releases/latest";
const PAGE: &str = "https://github.com/ticanandrei99/riftvcs/releases";
const MAX_RELEASE_BYTES: usize = 256 * 1024;
static CACHE: tokio::sync::Mutex<Option<(Instant, UpdateInfo)>> = tokio::sync::Mutex::const_new(None);

#[derive(Serialize, Clone)]
pub struct UpdateInfo {
    pub current_version: String, pub latest_version: String,
    pub update_available: bool, pub channel_ready: bool,
    pub download_url: Option<String>, pub notes: Option<String>,
}
fn version(value: &str) -> Option<[u32; 3]> {
    let value = value.strip_prefix('v').unwrap_or(value);
    let parts: Vec<_> = value.split('.').collect();
    if parts.len() != 3 || parts.iter().any(|p| p.is_empty() || !p.bytes().all(|c| c.is_ascii_digit()) || (p.len() > 1 && p.starts_with('0'))) { return None; }
    parts.into_iter().map(str::parse::<u32>).collect::<Result<Vec<_>, _>>().ok()?.try_into().ok()
}
fn release_info(json: &serde_json::Value, current: &str, caster: bool) -> Result<UpdateInfo, String> {
    let tag = json["tag_name"].as_str().ok_or("Invalid release tag")?;
    let latest = version(tag).ok_or("Release must use vMAJOR.MINOR.PATCH")?;
    let installed = version(current).ok_or("Invalid installed version")?;
    let latest_version = tag.strip_prefix('v').unwrap_or(tag);
    let asset_name = format!("{}_{}_x64-setup.exe", if caster { "RiftVoice Caster" } else { "RiftVoice" }, latest_version);
    let ready = json["draft"] == false && json["prerelease"] == false &&
        json["assets"].as_array().map(|assets| assets.iter().any(|asset| {
            if asset["name"].as_str() != Some(asset_name.as_str()) || asset["state"] != "uploaded" || asset["size"].as_u64().unwrap_or(0) == 0 { return false; }
            let Some(raw) = asset["browser_download_url"].as_str() else { return false; };
            let Ok(url) = reqwest::Url::parse(raw) else { return false; };
            let Ok(expected) = reqwest::Url::parse(&format!("https://github.com/ticanandrei99/riftvcs/releases/download/{tag}/{asset_name}")) else { return false; };
            url == expected && url.username().is_empty() && url.password().is_none() && url.query().is_none() && url.fragment().is_none()
        })).unwrap_or(false);
    Ok(UpdateInfo { current_version: current.into(), latest_version: latest_version.into(),
        update_available: latest > installed && ready, channel_ready: ready,
        download_url: None, notes: None })
}
#[tauri::command]
pub async fn check_for_update(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    // Serialize concurrent callers and cache briefly; IPC cannot flood GitHub.
    let mut cache = CACHE.lock().await;
    if let Some((checked, info)) = cache.as_ref() {
        if checked.elapsed() < Duration::from_secs(60) { return Ok(info.clone()); }
    }
    let current = env!("CARGO_PKG_VERSION");
    let client = reqwest::Client::builder().timeout(Duration::from_secs(15))
        .redirect(reqwest::redirect::Policy::none()).build().map_err(|_| "Update check unavailable")?;
    let mut response = client.get(LATEST).header("User-Agent", "RiftVoice-updater")
        .header("Accept", "application/vnd.github+json").send().await.map_err(|_| "Update check unavailable")?;
    let info = if response.status() == reqwest::StatusCode::NOT_FOUND {
        UpdateInfo { current_version: current.into(), latest_version: current.into(), update_available: false, channel_ready: false, download_url: None, notes: None }
    } else {
        if !response.status().is_success() { return Err("Update check unavailable; try again later".into()); }
        let mut bytes = Vec::new();
        while let Some(chunk) = response.chunk().await.map_err(|_| "Invalid release response")? {
            if bytes.len() + chunk.len() > MAX_RELEASE_BYTES { return Err("Release response too large".into()); }
            bytes.extend_from_slice(&chunk);
        }
        let json = serde_json::from_slice(&bytes).map_err(|_| "Invalid release response")?;
        release_info(&json, current, app.config().identifier == "com.riftvoice.caster")?
    };
    *cache = Some((Instant::now(), info.clone()));
    Ok(info)
}
// Notification-only until a signed updater channel and its public key are provisioned.
// No command accepts a download URL or executes an installer from the WebView.
#[tauri::command]
pub fn open_release_page() -> Result<(), String> {
    std::process::Command::new("explorer.exe").arg(PAGE).spawn().map_err(|_| "Cannot open releases page")?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    fn release(tag: &str, caster: bool) -> serde_json::Value {
        let name = format!("{}_{}_x64-setup.exe", if caster { "RiftVoice Caster" } else { "RiftVoice" }, tag.trim_start_matches('v'));
        serde_json::json!({"tag_name":tag,"draft":false,"prerelease":false,"assets":[{"state":"uploaded","size":100,"name":name,"browser_download_url":format!("https://github.com/ticanandrei99/riftvcs/releases/download/{tag}/{name}")}]})
    }
    #[test] fn newer_release_requires_exact_own_installer_and_channel() {
        let r = release("v0.2.0", false);
        assert!(release_info(&r, "0.1.0", false).unwrap().update_available);
        assert!(!release_info(&r, "0.2.0", false).unwrap().update_available);
        assert!(!release_info(&r, "0.3.0", false).unwrap().update_available);
        assert!(!release_info(&r, "0.1.0", true).unwrap().channel_ready);
        assert!(release_info(&release("v0.2.0", true), "0.1.0", true).unwrap().update_available);
    }
    #[test] fn untrusted_urls_and_unpublished_assets_are_rejected() {
        for url in ["https://evil.test/setup.exe", "https://github.com.evil.test/ticanandrei99/riftvcs/releases/download/v0.2.0/RiftVoice_0.2.0_x64-setup.exe", "https://github.com/ticanandrei99/other/releases/download/v0.2.0/RiftVoice_0.2.0_x64-setup.exe", "http://github.com/ticanandrei99/riftvcs/releases/download/v0.2.0/RiftVoice_0.2.0_x64-setup.exe"] {
            let mut r = release("v0.2.0", false); r["assets"][0]["browser_download_url"] = url.into();
            assert!(!release_info(&r, "0.1.0", false).unwrap().channel_ready);
        }
        for key in ["draft", "prerelease"] {
            let mut r = release("v0.2.0", false); r[key] = true.into();
            assert!(!release_info(&r, "0.1.0", false).unwrap().update_available);
        }
        let mut r = release("v0.2.0", false); r["assets"][0]["size"] = 0.into();
        assert!(!release_info(&r, "0.1.0", false).unwrap().channel_ready);
    }
    #[test] fn malformed_versions_rejected() {
        for tag in ["main", "v1.2", "1.2.3.4", "1.2.3-beta", "1.a.3", "+1.2.3", "01.2.3"] { assert!(version(tag).is_none()); }
        assert!(release_info(&serde_json::json!({}), "0.1.0", false).is_err());
    }
}
