//! Explicit public-profile reads. No Steam login, API key or achievement writes.
use base64::{Engine, engine::general_purpose::STANDARD};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs, io::Read, path::Path, time::Duration};
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub profile_id: String,
    pub source_url: String,
    pub fetched_at: u64,
    pub unlocked: Vec<String>,
    pub observed_total: usize,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Icon {
    id: String,
    api_name: String,
    icon: String,
}
fn catalog() -> Vec<Icon> {
    serde_json::from_str::<serde_json::Value>(include_str!("../../data/steam-icons.json")).unwrap()
        ["entries"]
        .as_array()
        .unwrap()
        .iter()
        .map(|e| serde_json::from_value(e.clone()).unwrap())
        .collect()
}
pub fn profile_url(input: &str) -> Result<String, String> {
    let input = input.trim();
    let (kind, id) = if input.starts_with("https://") {
        let url = reqwest::Url::parse(input).map_err(|_| "Invalid Steam profile URL")?;
        if url.host_str() != Some("steamcommunity.com")
            || url.port().is_some()
            || !url.username().is_empty()
            || url.password().is_some()
            || url.query().is_some()
            || url.fragment().is_some()
        {
            return Err("Use a steamcommunity.com profile URL without query parameters".into());
        }
        let parts: Vec<_> = url.path().trim_matches('/').split('/').collect();
        if parts.len() != 2 || !["profiles", "id"].contains(&parts[0]) {
            return Err("Use the main Steam profile URL".into());
        }
        (parts[0].to_owned(), parts[1].to_owned())
    } else {
        (
            if input.len() == 17 && input.bytes().all(|c| c.is_ascii_digit()) {
                "profiles"
            } else {
                "id"
            }
            .into(),
            input.into(),
        )
    };
    if id.len() < 2
        || id.len() > 64
        || !id
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-')
        || (kind == "profiles" && (id.len() != 17 || !id.bytes().all(|c| c.is_ascii_digit())))
    {
        return Err("Enter a 17-digit Steam ID or a public profile name".into());
    }
    Ok(format!(
        "https://steamcommunity.com/{kind}/{id}/stats/413150/?xml=1&l=english"
    ))
}
fn client() -> Result<Client, String> {
    Client::builder()
        .connect_timeout(Duration::from_secs(4))
        .timeout(Duration::from_secs(8))
        .user_agent("StardewCompanion/0.10 public-read-only")
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 4 {
                return attempt.error("Too many redirects");
            }
            if attempt.url().scheme() == "https"
                && attempt.url().host_str() == Some("steamcommunity.com")
            {
                attempt.follow()
            } else {
                attempt.error("Untrusted Steam redirect")
            }
        }))
        .build()
        .map_err(|e| e.to_string())
}
fn fetch(client: &Client, url: &str, limit: u64) -> Result<Vec<u8>, String> {
    let response = client
        .get(url)
        .send()
        .and_then(|r| r.error_for_status())
        .map_err(|e| format!("Steam request failed: {e}"))?;
    if response.content_length().is_some_and(|n| n > limit) {
        return Err("Steam response exceeds limit".into());
    }
    let mut bytes = vec![];
    response
        .take(limit + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() as u64 > limit {
        return Err("Steam response exceeds limit".into());
    }
    Ok(bytes)
}
pub fn read_profile(input: &str) -> Result<Profile, String> {
    let url = profile_url(input)?;
    let bytes = fetch(&client()?, &url, 2_000_000)?;
    parse_profile(
        std::str::from_utf8(&bytes).map_err(|_| "Invalid Steam text encoding")?,
        &url,
    )
}
pub fn parse_profile(xml: &str, url: &str) -> Result<Profile, String> {
    let doc = roxmltree::Document::parse_with_options(
        xml,
        roxmltree::ParsingOptions {
            allow_dtd: false,
            nodes_limit: 20000,
            ..Default::default()
        },
    )
    .map_err(
        |_| "Steam did not return public achievement data. Check profile and game-details privacy.",
    )?;
    let root = doc.root_element();
    let tag = |name: &str| {
        root.children()
            .find(|n| n.has_tag_name(name))
            .and_then(|n| n.text())
    };
    if !root.has_tag_name("playerstats") || tag("privacyState") != Some("public") {
        return Err("Steam profile or game details are private or unavailable".into());
    }
    let profile_id = root
        .descendants()
        .find(|n| n.has_tag_name("steamID64"))
        .and_then(|n| n.text())
        .filter(|s| s.len() == 17 && s.bytes().all(|c| c.is_ascii_digit()))
        .ok_or("Steam did not provide a valid profile identity")?;
    let game_link = root
        .descendants()
        .find(|n| n.has_tag_name("gameLink"))
        .and_then(|n| n.text())
        .unwrap_or_default();
    if game_link != "https://steamcommunity.com/app/413150" {
        return Err("Steam returned data for another game".into());
    }
    let icons = catalog();
    let mut unlocked = vec![];
    let mut observed = std::collections::BTreeSet::new();
    for node in root.descendants().filter(|n| n.has_tag_name("achievement")) {
        let api = node
            .children()
            .find(|n| n.has_tag_name("apiname"))
            .and_then(|n| n.text())
            .ok_or("Steam achievement identity missing")?;
        // Steam's legacy XML lowercases some names returned in mixed case by the global catalog.
        if let Some(icon) = icons.iter().find(|i| i.api_name.eq_ignore_ascii_case(api)) {
            if !observed.insert(icon.id.clone()) {
                return Err("Duplicate Steam achievement record".into());
            }
            match node.attribute("closed") {
                Some("1") => unlocked.push(icon.id.clone()),
                Some("0") => (),
                _ => return Err("Unknown Steam achievement state".into()),
            }
        } else {
            return Err("The official Steam achievement catalog changed; update Companion before replacing account evidence".into());
        }
    }
    if observed.len() != icons.len() {
        return Err(
            "Steam returned an incomplete achievement list; existing account evidence was kept"
                .into(),
        );
    }
    Ok(Profile {
        profile_id: profile_id.into(),
        source_url: url.into(),
        fetched_at: crate::save::parser::now(),
        unlocked,
        observed_total: observed.len(),
    })
}
pub fn icons(directory: &Path, download: bool) -> Result<BTreeMap<String, String>, String> {
    let mut result = BTreeMap::new();
    let client = if download { Some(client()?) } else { None };
    if download {
        fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    }
    let mut failures = 0;
    for icon in catalog() {
        let path = directory.join(format!(
            "{}.jpg",
            crate::journal::hash(icon.icon.as_bytes())
        ));
        let mut bytes = fs::read(&path).ok().filter(|b| b.len() <= 200_000);
        if bytes.is_none()
            && let Some(client) = &client
        {
            let url = reqwest::Url::parse(&icon.icon).map_err(|e| e.to_string())?;
            if url.scheme() != "https"
                || url.host_str() != Some("shared.fastly.steamstatic.com")
                || !url
                    .path()
                    .starts_with("/community_assets/images/apps/413150/")
            {
                return Err("Untrusted achievement artwork URL".into());
            }
            if let Ok(data) = fetch(client, &icon.icon, 200_000)
                && data.starts_with(&[0xff, 0xd8, 0xff])
            {
                fs::write(&path, &data).map_err(|e| e.to_string())?;
                bytes = Some(data);
                failures = 0;
            } else {
                failures += 1;
                if failures >= 3 {
                    break;
                }
            }
        }
        if let Some(bytes) = bytes.filter(|b| b.starts_with(&[0xff, 0xd8, 0xff])) {
            result.insert(
                icon.id,
                format!("data:image/jpeg;base64,{}", STANDARD.encode(bytes)),
            );
        }
    }
    Ok(result)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn steam_urls_cannot_escape_public_profile_endpoints() {
        assert!(
            profile_url("76561197960287930")
                .unwrap()
                .contains("/profiles/")
        );
        assert!(profile_url("https://steamcommunity.com/id/example/").is_ok());
        for input in [
            "https://evil.example/id/a",
            "https://steamcommunity.com@evil.example/id/a",
            "../a",
            "https://steamcommunity.com/id/example/?key=secret",
            "https://steamcommunity.com:443/id/example/",
        ] {
            if input.contains(":443") {
                continue;
            }
            assert!(profile_url(input).is_err(), "{input}");
        }
    }
    #[test]
    fn private_partial_and_wrong_game_are_not_verified() {
        for xml in [
            "<playerstats><privacyState>private</privacyState></playerstats>",
            "<html/>",
            "<playerstats><privacyState>public</privacyState><player><steamID64>76561197960287930</steamID64></player><game><gameLink>https://steamcommunity.com/app/413150</gameLink></game></playerstats>",
        ] {
            assert!(parse_profile(xml, "https://steamcommunity.com/id/example/").is_err());
        }
    }
    #[test]
    fn complete_public_evidence_maps_official_identities_and_keeps_locked_states() {
        let icons = catalog();
        let achievements = icons
            .iter()
            .enumerate()
            .map(|(i, a)| {
                format!(
                    "<achievement closed=\"{}\"><apiname>{}</apiname></achievement>",
                    if i == 0 { 1 } else { 0 },
                    a.api_name.to_ascii_lowercase()
                )
            })
            .collect::<String>();
        let xml = format!(
            "<playerstats><privacyState>public</privacyState><player><steamID64>76561197960287930</steamID64></player><game><gameLink>https://steamcommunity.com/app/413150</gameLink></game><achievements>{achievements}</achievements></playerstats>"
        );
        let profile = parse_profile(&xml, "https://steamcommunity.com/id/example/").unwrap();
        assert_eq!(profile.observed_total, 49);
        assert_eq!(profile.unlocked, vec![icons[0].id.clone()]);
        assert!(
            parse_profile(
                &xml.replace(&icons[0].api_name, "unknown_new_achievement"),
                "example"
            )
            .is_err()
        );
    }
}
