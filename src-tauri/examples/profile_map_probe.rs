//! Read-only local QA; private snapshots remain under the ignored artifacts directory.
use sha2::{Digest, Sha256};
use stardew_companion_lib::{
    artwork::{self, tilemap},
    save::discovery,
};
use std::collections::BTreeMap;
fn main() -> Result<(), String> {
    let root = artwork::discover().ok_or("Installed game unavailable")?;
    let scan = discovery::scan(&discovery::default_roots());
    let mut cache = BTreeMap::new();
    let (mut containers, mut mapped, mut missing, mut outside) = (0, 0, 0, 0);
    for save in &scan.saves {
        for chest in save.containers.iter().flatten() {
            containers += 1;
            let identity = save
                .location_maps
                .as_ref()
                .and_then(|m| m.get(&chest.location))
                .cloned()
                .unwrap_or_else(|| {
                    if chest.location == "Farm" {
                        match save.farm_type.as_str() {
                            "Riverland" => "Farm_Fishing",
                            "Forest" => "Farm_Foraging",
                            "Hill-top" => "Farm_Mining",
                            "Wilderness" => "Farm_Combat",
                            "Four Corners" => "Farm_FourCorners",
                            "Beach" => "Farm_Island",
                            "Meadowlands" => "Farm_Ranching",
                            _ => "Farm",
                        }
                        .into()
                    } else {
                        chest.location.clone()
                    }
                });
            let bounds = cache.entry(identity.clone()).or_insert_with(|| {
                tilemap::load(&root, &identity, &save.season)
                    .map(|m| (m.width, m.height))
                    .ok()
            });
            if let Some((w, h)) = bounds {
                mapped += 1;
                if let Some([x, y]) = chest.tile
                    && (x < 0 || y < 0 || x as usize >= *w || y as usize >= *h)
                {
                    outside += 1;
                }
            } else {
                missing += 1;
            }
        }
        let bytes = std::fs::read(&save.path).map_err(|e| e.to_string())?;
        if format!("{:x}", Sha256::digest(bytes)) != save.fingerprint {
            return Err("An original save changed during the read-only audit".into());
        }
    }
    let output = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../artifacts");
    std::fs::write(
        output.join("save-0.11.local.json"),
        serde_json::to_vec(&scan).unwrap(),
    )
    .map_err(|e| e.to_string())?;
    let report = serde_json::json!({"saves":scan.saves.len(),"containers":containers,"mapped":mapped,"unavailable":missing,"outsideBaseMap":outside,"scanIssues":scan.issues.len(),"originalSaveFingerprintsUnchanged":true});
    std::fs::write(
        output.join("storage-maps-0.11.local.json"),
        serde_json::to_vec_pretty(&report).unwrap(),
    )
    .map_err(|e| e.to_string())?;
    println!("{report}");
    Ok(())
}
