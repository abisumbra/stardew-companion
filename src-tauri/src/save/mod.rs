pub mod discovery;
pub mod parser;
pub mod watcher;

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Farmer {
    pub id: String,
    pub name: String,
    pub money: Option<u64>,
    pub total_money_earned: Option<u64>,
    pub house_upgrade: Option<u32>,
    pub skills: BTreeMap<String, u32>,
    pub cooking_known: Option<BTreeMap<String, u64>>,
    pub cooked: Option<BTreeMap<String, u64>>,
    pub crafting: Option<BTreeMap<String, u64>>,
    pub fish: Option<BTreeMap<String, u64>>,
    pub shipped: Option<BTreeMap<String, u64>>,
    pub friendship: Option<BTreeMap<String, u64>>,
    #[serde(default)]
    pub friendship_details: Option<BTreeMap<String, FriendshipDetails>>,
    #[serde(default)]
    pub spouse: Option<String>,
    pub monsters: Option<BTreeMap<String, u64>>,
    pub stats: BTreeMap<String, u64>,
    #[serde(default)]
    pub stats_known: bool,
    pub mail: Option<Vec<String>>,
    pub events: Option<Vec<String>>,
    pub achievements: Option<Vec<String>>,
    pub inventory: BTreeMap<String, u64>,
    pub mine_stardrop: Option<bool>,
    #[serde(default)]
    pub quests: Option<Vec<QuestRecord>>,
    #[serde(default)]
    pub professions: Option<Vec<u32>>,
    #[serde(default)]
    pub inventory_known: bool,
    #[serde(default)]
    pub inventory_stacks: Option<Vec<ItemStack>>,
    #[serde(default)]
    pub deepest_mine_level: Option<u32>,
    #[serde(default)]
    pub children: Option<u32>,
    #[serde(default)]
    pub books_read: Option<BTreeMap<String, u64>>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemStack {
    pub id: String,
    pub quantity: u64,
    pub quality: u32,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapObstacle {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestRecord {
    pub id: String,
    pub kind: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub objective: Option<String>,
    pub completed: Option<bool>,
    pub days_left: Option<i64>,
}
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CompletionEvidence {
    pub museum: Option<Vec<String>>,
    pub bundles: Option<BTreeMap<String, Vec<bool>>>,
    pub bundle_definitions: Option<BTreeMap<String, String>>,
    pub collected_nuts: Option<Vec<String>>,
    pub limited_nuts: Option<BTreeMap<String, u64>>,
    pub golden_coconut_cracked: Option<bool>,
    pub golden_parrot_used: Option<bool>,
    pub world_flags: Option<Vec<String>>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FriendshipDetails {
    pub status: Option<String>,
    pub gifts_today: Option<u32>,
    pub gifts_this_week: Option<u32>,
    pub talked_to_today: Option<bool>,
    pub roommate: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveProfile {
    #[serde(default)]
    pub location_maps: Option<BTreeMap<String, String>>,
    #[serde(default)]
    pub containers: Option<Vec<ContainerRecord>>,
    #[serde(default)]
    pub farm_objects: Option<Vec<FarmObject>>,
    #[serde(default)]
    pub profit_margin: Option<f32>,
    #[serde(default)]
    pub map_obstacles: Option<BTreeMap<String, Vec<MapObstacle>>>,
    pub id: String,
    pub path: String,
    pub farm_name: String,
    pub farm_type: String,
    pub game_version: Option<String>,
    pub season: String,
    pub day: u32,
    pub year: u32,
    pub saved_at: u64,
    pub synced_at: u64,
    pub fingerprint: String,
    pub players: Vec<Farmer>,
    pub buildings: Option<Vec<String>>,
    pub walnuts_found: Option<u32>,
    pub waivers: Option<u32>,
    pub storage: BTreeMap<String, u64>,
    #[serde(default)]
    pub storage_known: bool,
    #[serde(default)]
    pub storage_stacks: Option<Vec<ItemStack>>,
    pub storage_scope: String,
    #[serde(default)]
    pub world_stats: Option<BTreeMap<String, u64>>,
    pub warnings: Vec<String>,
    #[serde(default)]
    pub completion: Option<CompletionEvidence>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContainerRecord {
    #[serde(default)]
    pub item_id: Option<String>,
    #[serde(default)]
    pub parent_location: Option<String>,
    #[serde(default)]
    pub building_tile: Option<[i32; 2]>,
    pub id: String,
    pub name: String,
    pub location: String,
    pub tile: Option<[i32; 2]>,
    pub kind: String,
    pub shared_group: Option<String>,
    pub items: Vec<ItemStack>,
    pub contents_known: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FarmObject {
    pub id: String,
    pub tile: [i32; 2],
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanIssue {
    pub path: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub saves: Vec<SaveProfile>,
    pub issues: Vec<ScanIssue>,
    pub directories: Vec<String>,
    pub custom_directories: Vec<String>,
}
