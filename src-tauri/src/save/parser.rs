use super::{Farmer, FriendshipDetails, SaveProfile};
use roxmltree::{Document, Node, ParsingOptions};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs,
    io::Read,
    path::Path,
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

pub const MAX_SAVE_BYTES: u64 = 64 * 1024 * 1024;
pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
fn child<'a, 'i>(n: Node<'a, 'i>, tag: &str) -> Option<Node<'a, 'i>> {
    n.children().find(|c| c.has_tag_name(tag))
}
fn txt(n: Node<'_, '_>, tag: &str) -> Option<String> {
    child(n, tag)?.text().map(str::to_owned)
}
fn num(n: Node<'_, '_>, tag: &str) -> Option<u64> {
    txt(n, tag)?.parse().ok()
}
fn leaf<'a, 'i>(n: Node<'a, 'i>) -> Option<&'a str> {
    n.descendants()
        .find(|x| x.is_element() && !x.children().any(|c| c.is_element()))
        .and_then(|x| x.text())
}
fn normalize(s: &str) -> String {
    s.strip_prefix("(O)").unwrap_or(s).to_owned()
}
fn map_obstacles(
    locations: Option<Node<'_, '_>>,
) -> Option<BTreeMap<String, Vec<super::MapObstacle>>> {
    let mut result = BTreeMap::new();
    for location in locations?.children().filter(|n| n.is_element()).take(2000) {
        let Some(name) = txt(location, "name") else {
            continue;
        };
        let mut blocked = Vec::new();
        let mut add = |x: Option<u64>, y: Option<u64>, width: Option<u64>, height: Option<u64>| {
            if let (Some(x), Some(y), Some(width), Some(height)) = (x, y, width, height)
                && x < 256
                && y < 256
                && (1..=32).contains(&width)
                && (1..=32).contains(&height)
                && blocked.len() < 65536
            {
                blocked.push(super::MapObstacle {
                    x: x as u32,
                    y: y as u32,
                    width: width as u32,
                    height: height as u32,
                });
            }
        };
        for section in ["objects", "terrainFeatures"] {
            if let Some(entries) = child(location, section) {
                for entry in entries.children().filter(|n| n.has_tag_name("item")) {
                    let position =
                        child(entry, "key").and_then(|n| n.children().find(|c| c.is_element()));
                    let value =
                        child(entry, "value").and_then(|n| n.children().find(|c| c.is_element()));
                    let (Some(p), Some(v)) = (position, value) else {
                        continue;
                    };
                    let ty = v
                        .attributes()
                        .find(|a| a.name() == "type")
                        .map(|a| a.value())
                        .unwrap_or("");
                    let block = if section == "objects" {
                        txt(v, "isPassable").as_deref() == Some("false") || ty == "Chest"
                    } else {
                        (ty == "Tree" && num(v, "growthStage").is_some_and(|n| n >= 5))
                            || (ty == "FruitTree" && num(v, "growthStage").is_some_and(|n| n >= 4))
                    };
                    if block {
                        add(num(p, "X"), num(p, "Y"), Some(1), Some(1));
                    }
                }
            }
        }
        if let Some(buildings) = child(location, "buildings") {
            for b in buildings.children().filter(|n| n.is_element()) {
                add(
                    num(b, "tileX"),
                    num(b, "tileY"),
                    num(b, "tilesWide"),
                    num(b, "tilesHigh"),
                );
            }
        }
        if let Some(clumps) = child(location, "resourceClumps") {
            for c in clumps.children().filter(|n| n.is_element()) {
                if let Some(p) = child(c, "tile") {
                    add(num(p, "X"), num(p, "Y"), num(c, "width"), num(c, "height"));
                }
            }
        }
        result.insert(name, blocked);
    }
    Some(result)
}

fn dictionary(n: Node<'_, '_>, tag: &str, array: bool) -> Option<BTreeMap<String, u64>> {
    let section = child(n, tag)?;
    let mut out = BTreeMap::new();
    for item in section.children().filter(|x| x.has_tag_name("item")) {
        if let (Some(key), Some(value)) = (child(item, "key").and_then(leaf), child(item, "value"))
        {
            let value = if array {
                value
                    .descendants()
                    .find(|x| x.has_tag_name("int"))
                    .and_then(|x| x.text())
            } else {
                leaf(value)
            };
            let v: u64 = value
                .and_then(|s| s.parse().ok())
                .filter(|v| *v <= 9_007_199_254_740_991)?;
            if out.insert(normalize(key), v).is_some() {
                return None;
            }
        } else {
            return None;
        }
    }
    Some(out)
}
fn strings(n: Node<'_, '_>, tag: &str) -> Option<Vec<String>> {
    Some(
        child(n, tag)?
            .children()
            .filter(|x| x.is_element())
            .filter_map(leaf)
            .map(str::to_owned)
            .collect(),
    )
}
fn ordinary_chest(n: Node<'_, '_>) -> bool {
    matches!(
        txt(n, "specialChestType").as_deref(),
        None | Some("" | "0" | "None" | "3" | "AutoLoader" | "4" | "Enricher" | "6" | "BigChest")
    )
}
/// Resolve serialized instance names through the owning Building; GUID suffixes are never guessed.
fn location_maps(root: Node<'_, '_>, locations: Node<'_, '_>) -> BTreeMap<String, String> {
    let mut result = BTreeMap::new();
    for b in locations
        .descendants()
        .filter(|n| child(*n, "buildingType").is_some())
    {
        let Some(kind) = txt(b, "buildingType") else {
            continue;
        };
        let indoor = child(b, "indoors");
        let name = txt(b, "nonInstancedIndoorsName")
            .filter(|s| !s.is_empty())
            .or_else(|| {
                indoor.and_then(|n| {
                    txt(n, "uniqueName")
                        .filter(|s| !s.is_empty())
                        .or_else(|| txt(n, "name"))
                })
            });
        if let Some(name) = name {
            result.insert(name, format!("Building/{kind}"));
        }
    }
    if let Some(host) = child(root, "player") {
        let level = num(host, "houseUpgradeLevel").unwrap_or(0);
        let spouse = txt(host, "spouse").is_some_and(|s| !s.is_empty());
        let map = match (level, spouse) {
            (0, _) => "FarmHouse",
            (1, false) => "FarmHouse1",
            (1, true) => "FarmHouse1_marriage",
            (_, false) => "FarmHouse2",
            (_, true) => "FarmHouse2_marriage",
        };
        result.insert("FarmHouse".into(), map.into());
    }
    result
}
fn container_records(root: Node<'_, '_>, locations: Node<'_, '_>) -> Vec<super::ContainerRecord> {
    fn point(n: Node<'_, '_>) -> Option<[i32; 2]> {
        let v = n
            .descendants()
            .find(|v| v.has_tag_name("Vector2"))
            .unwrap_or(n);
        Some([txt(v, "X")?.parse().ok()?, txt(v, "Y")?.parse().ok()?])
    }
    fn contents(section: Option<Node<'_, '_>>) -> (Vec<super::ItemStack>, bool) {
        let Some(section) = section else {
            return (vec![], false);
        };
        let mut result = vec![];
        let mut known = true;
        for n in section.children().filter(|n| n.has_tag_name("Item")) {
            if n.attributes()
                .any(|a| a.name() == "nil" && a.value() == "true")
            {
                continue;
            }
            let Some(id) = txt(n, "itemId").or_else(|| txt(n, "parentSheetIndex")) else {
                known = false;
                continue;
            };
            let ty = n
                .attributes()
                .find(|a| a.name() == "type")
                .map_or("", |a| a.value());
            let prefix = match ty {
                "Boots" => "B",
                "Hat" => "H",
                "MeleeWeapon" | "Slingshot" => "W",
                "Ring" | "CombinedRing" => "O",
                "Pants" => "P",
                "Shirt" => "S",
                "Trinket" => "TR",
                "Furniture" | "BedFurniture" | "StorageFurniture" | "FishTankFurniture" => "F",
                "Axe" | "Hoe" | "Pickaxe" | "WateringCan" | "FishingRod" | "MilkPail"
                | "Shears" | "Pan" => "T",
                _ if txt(n, "bigCraftable").as_deref() == Some("true") => "BC",
                _ => "O",
            };
            let raw_quantity = txt(n, "stack").or_else(|| txt(n, "Stack"));
            let quantity = if let Some(raw) = raw_quantity {
                match raw.parse::<u64>() {
                    Ok(n) => n,
                    Err(_) => {
                        known = false;
                        continue;
                    }
                }
            } else if prefix == "O" || prefix == "BC" {
                known = false;
                continue;
            } else {
                1
            };
            if quantity == 0 || quantity > 9_007_199_254_740_991 {
                known = false;
                continue;
            }
            let quality = match txt(n, "quality") {
                None => 0,
                Some(raw) => match raw.parse::<u32>() {
                    Ok(v) if [0, 1, 2, 4].contains(&v) => v,
                    _ => {
                        known = false;
                        continue;
                    }
                },
            };
            result.push(super::ItemStack {
                id: if id.starts_with('(') {
                    id
                } else {
                    format!("({prefix}){id}")
                },
                quantity,
                quality,
            });
        }
        (result, known)
    }
    let shared = contents(child(root, "junimoChest"));
    locations
        .descendants()
        .filter(|n| {
            n.is_element()
                && ((n.has_tag_name("fridge")
                    && (child(*n, "items").is_some() || child(*n, "itemId").is_some()))
                    || n.attributes()
                        .any(|a| a.name() == "type" && a.value() == "Chest"))
                && !n
                    .attributes()
                    .any(|a| a.name() == "nil" && a.value() == "true")
                && !n.ancestors().skip(1).any(|a| {
                    a.has_tag_name("fridge") || a.has_tag_name("items") || a.has_tag_name("Items")
                })
        })
        .take(10000)
        .enumerate()
        .map(|(index, n)| {
            let location_node = n.ancestors().skip(1).find(|a| {
                child(*a, "name").is_some()
                    && (a.has_tag_name("GameLocation") || a.has_tag_name("indoors"))
            });
            let location = location_node
                .and_then(|l| {
                    txt(l, "uniqueName")
                        .filter(|s| !s.is_empty())
                        .or_else(|| txt(l, "name"))
                })
                .unwrap_or_else(|| "Unknown location".into());
            let special = txt(n, "specialChestType").unwrap_or_default();
            let junimo = special == "2" || special == "JunimoChest";
            let fridge = n.has_tag_name("fridge");
            let supported = fridge || ordinary_chest(n) || junimo;
            let (items, known) = if junimo {
                shared.clone()
            } else {
                contents(child(n, "items"))
            };
            let tile = if fridge {
                location_node
                    .and_then(|l| child(l, "fridgePosition"))
                    .and_then(point)
            } else {
                n.ancestors()
                    .skip(1)
                    .find_map(|a| child(a, "key").and_then(point))
                    .or_else(|| child(n, "tileLocation").and_then(point))
            };
            let identity = tile.map_or_else(
                || format!("unknown:{index}"),
                |[x, y]| format!("{x},{y}:{}", if fridge { "fridge" } else { "chest" }),
            );
            super::ContainerRecord {
                item_id: txt(n, "itemId")
                    .or_else(|| txt(n, "parentSheetIndex"))
                    .map(|id| {
                        if id.starts_with('(') {
                            id
                        } else {
                            format!("(BC){id}")
                        }
                    }),
                parent_location: location_node
                    .and_then(|l| {
                        l.ancestors()
                            .skip(1)
                            .find(|a| a.has_tag_name("GameLocation"))
                    })
                    .and_then(|l| txt(l, "name"))
                    .or_else(|| {
                        locations
                            .descendants()
                            .find(|b| {
                                txt(*b, "nonInstancedIndoorsName").as_deref() == Some(&location)
                            })
                            .and_then(|b| b.ancestors().find(|a| a.has_tag_name("GameLocation")))
                            .and_then(|l| txt(l, "name"))
                    }),
                building_tile: location_node
                    .and_then(|l| l.ancestors().find(|a| child(*a, "buildingType").is_some()))
                    .or_else(|| {
                        locations.descendants().find(|b| {
                            txt(*b, "nonInstancedIndoorsName").as_deref() == Some(&location)
                        })
                    })
                    .and_then(|b| {
                        Some([
                            txt(b, "tileX")?.parse().ok()?,
                            txt(b, "tileY")?.parse().ok()?,
                        ])
                    }),
                id: format!("{location}:{identity}"),
                name: txt(n, "displayName")
                    .or_else(|| txt(n, "name"))
                    .unwrap_or_else(|| {
                        if fridge {
                            "Fridge".into()
                        } else {
                            "Chest".into()
                        }
                    }),
                location,
                tile,
                kind: if fridge {
                    "fridge"
                } else if junimo {
                    "junimo"
                } else if supported {
                    "chest"
                } else {
                    "special"
                }
                .into(),
                shared_group: junimo.then(|| "junimo".into()),
                items,
                contents_known: supported && known,
            }
        })
        .collect()
}
fn items(
    n: Node<'_, '_>,
    out: &mut BTreeMap<String, u64>,
    stacks: &mut Vec<super::ItemStack>,
) -> bool {
    let mut valid = true;
    for item in n.children().filter(|x| x.has_tag_name("Item")) {
        // Preserve qualified machine and trinket identities as well as ordinary objects.
        if item
            .attributes()
            .any(|a| a.name() == "nil" && a.value() == "true")
        {
            continue;
        }
        let ty = item
            .attributes()
            .find(|a| a.name() == "type")
            .map(|a| a.value())
            .unwrap_or("");
        if !matches!(
            ty,
            "Object"
                | "ColoredObject"
                | "Trinket"
                | "Torch"
                | "Chest"
                | "Cask"
                | "Fence"
                | "Sign"
                | "CrabPot"
                | "IndoorPot"
                | "WoodChipper"
        ) {
            continue;
        }
        let id = txt(item, "itemId").or_else(|| txt(item, "parentSheetIndex"));
        if let (Some(id), Some(stack)) = (id, num(item, "stack").or_else(|| num(item, "Stack")))
            && stack > 0
        {
            let id =
                if txt(item, "bigCraftable").as_deref() == Some("true") || id.starts_with("(BC)") {
                    format!("craftable:{}", id.trim_start_matches("(BC)"))
                } else if ty == "Trinket" || id.starts_with("(TR)") {
                    format!("trinket:{}", id.trim_start_matches("(TR)"))
                } else {
                    normalize(&id)
                };
            let quality = num(item, "quality")
                .or_else(|| num(item, "Quality"))
                .unwrap_or(0)
                .min(u32::MAX as u64) as u32;
            if (child(item, "quality").is_some() || child(item, "Quality").is_some())
                && num(item, "quality")
                    .or_else(|| num(item, "Quality"))
                    .is_none()
            {
                valid = false;
            }
            let total = out.entry(id.clone()).or_default();
            if let Some(sum) = total
                .checked_add(stack)
                .filter(|n| *n <= 9_007_199_254_740_991)
            {
                *total = sum;
            } else {
                valid = false;
                continue;
            }
            stacks.push(super::ItemStack {
                id,
                quantity: stack,
                quality,
            });
        } else {
            valid = false;
        }
    }
    valid
}
fn farmer(n: Node<'_, '_>) -> Farmer {
    let mut skills = BTreeMap::new();
    for skill in ["farming", "fishing", "foraging", "mining", "combat", "luck"] {
        if let Some(level) = num(n, &format!("{skill}Level")) {
            skills.insert(skill.into(), level.min(100) as u32);
        }
    }
    let mut inventory = BTreeMap::new();
    let mut inventory_stacks = Vec::new();
    let inventory_known =
        child(n, "items").is_some_and(|inv| items(inv, &mut inventory, &mut inventory_stacks));
    let friendship = child(n, "friendshipData").and_then(|s| {
        s.children()
            .filter(|x| x.has_tag_name("item"))
            .map(|item| {
                Some((
                    child(item, "key").and_then(leaf)?.to_owned(),
                    item.descendants()
                        .find(|x| x.has_tag_name("Points"))?
                        .text()?
                        .parse()
                        .ok()?,
                ))
            })
            .collect::<Option<BTreeMap<_, _>>>()
    });
    let stats_node = child(n, "stats");
    let friendship_details = child(n, "friendshipData").map(|section| {
        section
            .children()
            .filter(|x| x.has_tag_name("item"))
            .filter_map(|item| {
                let name = child(item, "key").and_then(leaf)?.to_owned();
                let value = item.descendants().find(|x| x.has_tag_name("Friendship"))?;
                Some((
                    name,
                    FriendshipDetails {
                        status: txt(value, "Status"),
                        gifts_today: num(value, "GiftsToday").and_then(|n| n.try_into().ok()),
                        gifts_this_week: num(value, "GiftsThisWeek")
                            .and_then(|n| n.try_into().ok()),
                        talked_to_today: txt(value, "TalkedToToday").and_then(|s| s.parse().ok()),
                        roommate: txt(value, "RoommateMarriage").and_then(|s| s.parse().ok()),
                    },
                ))
            })
            .collect()
    });
    let stats = stats_node
        .map(|s| {
            dictionary(s, "Values", false).unwrap_or_else(|| {
                s.children()
                    .filter(|x| x.is_element())
                    .filter_map(|x| Some((x.tag_name().name().into(), x.text()?.parse().ok()?)))
                    .collect()
            })
        })
        .unwrap_or_default();
    let monsters = dictionary(n, "specificMonstersKilled", false)
        .or_else(|| stats_node.and_then(|s| dictionary(s, "specificMonstersKilled", false)));
    let mine_stardrop = child(n, "chestConsumedLevels").map(|s| {
        s.children().filter(|x| x.has_tag_name("item")).any(|item| {
            child(item, "key").and_then(leaf) == Some("100")
                && child(item, "value").and_then(leaf) == Some("true")
        })
    });
    let stats_known = stats_node
        .is_some_and(|s| child(s, "Values").is_none() || dictionary(s, "Values", false).is_some());
    let books_read = dictionary(n, "booksRead", false).or_else(|| {
        stats_known.then(|| {
            stats
                .iter()
                .filter(|(key, _)| key.starts_with("Book_"))
                .map(|(key, value)| (key.clone(), *value))
                .collect()
        })
    });
    Farmer {
        id: txt(n, "UniqueMultiplayerID").unwrap_or_default(),
        name: txt(n, "name").unwrap_or_default(),
        money: num(n, "money"),
        total_money_earned: num(n, "totalMoneyEarned"),
        house_upgrade: num(n, "houseUpgradeLevel").map(|n| n as u32),
        skills,
        cooking_known: dictionary(n, "cookingRecipes", false),
        cooked: dictionary(n, "recipesCooked", false),
        crafting: dictionary(n, "craftingRecipes", false),
        fish: dictionary(n, "fishCaught", true),
        shipped: dictionary(n, "basicShipped", false),
        friendship,
        friendship_details,
        spouse: txt(n, "spouse").filter(|s| !s.is_empty()),
        monsters,
        stats,
        stats_known,
        mail: strings(n, "mailReceived"),
        events: strings(n, "eventsSeen"),
        achievements: strings(n, "achievements"),
        inventory,
        mine_stardrop,
        inventory_known,
        inventory_stacks: inventory_known.then_some(inventory_stacks),
        deepest_mine_level: num(n, "deepestMineLevel").and_then(|v| v.try_into().ok()),
        children: None,
        books_read,
        professions: child(n, "professions").map(|section| {
            section
                .children()
                .filter_map(|v| v.text()?.parse().ok())
                .collect()
        }),
        quests: child(n, "questLog").map(|section| {
            section
                .children()
                .filter(|q| q.is_element())
                .map(|q| super::QuestRecord {
                    id: txt(q, "id").unwrap_or_default(),
                    kind: q
                        .attributes()
                        .find(|a| a.name() == "type")
                        .map_or("Quest", |a| a.value())
                        .into(),
                    title: txt(q, "_questTitle")
                        .or_else(|| txt(q, "questTitle"))
                        .filter(|s| !s.is_empty()),
                    description: txt(q, "_questDescription").filter(|s| !s.is_empty()),
                    objective: txt(q, "_currentObjective").filter(|s| !s.is_empty()),
                    completed: txt(q, "completed").and_then(|s| s.parse().ok()),
                    days_left: txt(q, "daysLeft").and_then(|s| s.parse().ok()),
                })
                .collect()
        }),
    }
}

pub fn parse_xml(xml: &str, path: &Path, saved_at: u64) -> Result<SaveProfile, String> {
    if xml.len() as u64 > MAX_SAVE_BYTES {
        return Err("Save exceeds the 64 MiB limit".into());
    }
    let options = ParsingOptions {
        allow_dtd: false,
        nodes_limit: 2_000_000,
        ..Default::default()
    };
    let doc = Document::parse_with_options(xml, options)
        .map_err(|e| format!("Invalid or incomplete save XML: {e}"))?;
    let root = doc.root_element();
    if !root.has_tag_name("SaveGame") {
        return Err("Select the full SaveGame file, not SaveGameInfo or a backup".into());
    }
    let host = child(root, "player").ok_or("Save is missing its player section")?;
    let game_id = txt(root, "uniqueIDForThisGame")
        .filter(|s| !s.is_empty())
        .ok_or("Save is missing its unique game ID")?;
    let day = num(root, "dayOfMonth")
        .filter(|n| (1..=28).contains(n))
        .ok_or("Save has an invalid or missing day")? as u32;
    let year = num(root, "year")
        .filter(|n| *n > 0)
        .ok_or("Save has an invalid or missing year")? as u32;
    let season = txt(root, "currentSeason")
        .filter(|s| ["spring", "summer", "fall", "winter"].contains(&s.as_str()))
        .ok_or("Save has an invalid or missing season")?;
    let mut players = vec![farmer(host)];
    if players[0].name.is_empty() || players[0].id.is_empty() {
        return Err("Save is missing its farmer identity".into());
    }
    for n in root.descendants().filter(|n| {
        n.has_tag_name("farmhand")
            || (n.has_tag_name("Farmer") && n.parent().is_some_and(|p| p.has_tag_name("farmhands")))
    }) {
        let f = farmer(n);
        if !f.name.is_empty() && !f.id.is_empty() && !players.iter().any(|p| p.id == f.id) {
            players.push(f);
        }
    }
    let locations = child(root, "locations");
    // Only buildings on Farm count. Cabins/interiors can have other building-like nodes.
    let farm = locations.and_then(|l| {
        l.children()
            .find(|n| txt(*n, "name").as_deref() == Some("Farm"))
    });
    let buildings = farm.and_then(|f| child(f, "buildings")).map(|b| {
        b.children()
            .filter(|n| n.is_element())
            .filter_map(|n| txt(n, "buildingType"))
            .collect()
    });
    let containers = locations.map(|locations| container_records(root, locations));
    let farm_objects = farm.and_then(|f| child(f, "objects")).map(|objects| {
        objects
            .children()
            .filter(|n| n.has_tag_name("item"))
            .filter_map(|entry| {
                let point = child(entry, "key")?
                    .descendants()
                    .find(|n| n.has_tag_name("Vector2"))?;
                let tile = [
                    txt(point, "X")?.parse().ok()?,
                    txt(point, "Y")?.parse().ok()?,
                ];
                let object = child(entry, "value")?.children().find(|n| n.is_element())?;
                let id = txt(object, "itemId").or_else(|| txt(object, "parentSheetIndex"))?;
                let big = txt(object, "bigCraftable").as_deref() == Some("true");
                Some(super::FarmObject {
                    id: if id.starts_with('(') {
                        id
                    } else {
                        format!("({}){id}", if big { "BC" } else { "O" })
                    },
                    tile,
                })
            })
            .collect()
    });
    let mut storage = BTreeMap::new();
    let mut storage_stacks = Vec::new();
    let mut storage_known = locations.is_some();
    // All Junimo Chests share this one saved list. Count it once, never per placed chest.
    if let Some(shared) = child(root, "junimoChest") {
        storage_known &= items(shared, &mut storage, &mut storage_stacks);
    }
    if let Some(locations) = locations {
        for n in locations.descendants().filter(|n| {
            n.is_element()
                && n.attributes()
                    .any(|a| a.name() == "type" && a.value() == "Chest")
        }) {
            // Special/shared chests and unknown nested containers are deliberately excluded.
            if n.ancestors().any(|a| {
                a.has_tag_name("fridge") || a.has_tag_name("items") || a.has_tag_name("Items")
            }) || !ordinary_chest(n)
            {
                continue;
            }
            if let Some(inv) = child(n, "items") {
                storage_known &= items(inv, &mut storage, &mut storage_stacks);
            }
        }
        for inv in locations.descendants().filter(|n| n.has_tag_name("fridge")) {
            if let Some(inv) = child(inv, "items") {
                storage_known &= items(inv, &mut storage, &mut storage_stacks);
            }
        }
    }
    let farm_type = match txt(root, "whichFarm").as_deref() {
        Some("0") => "Standard",
        Some("1") => "Riverland",
        Some("2") => "Forest",
        Some("3") => "Hill-top",
        Some("4") => "Wilderness",
        Some("5") => "Four Corners",
        Some("6") => "Beach",
        Some("MeadowlandsFarm") => "Meadowlands",
        _ => "Custom / unknown",
    }
    .into();
    let version = txt(root, "gameVersion");
    let mut warnings = Vec::new();
    if !version
        .as_deref()
        .is_some_and(|s| s == "1.6" || s.starts_with("1.6.") || s == "1.5" || s.starts_with("1.5."))
    {
        warnings.push(
            "Progress rules are unavailable for this game version; basic save data only.".into(),
        );
    }
    if players.iter().any(|p| {
        p.cooked.is_none() || p.fish.is_none() || p.crafting.is_none() || p.shipped.is_none()
    }) {
        warnings.push("Some collection sections are absent; those categories are unknown.".into());
    }
    if !storage_known || players.iter().any(|p| !p.inventory_known) {
        warnings.push("Some inventory or storage records are unavailable or invalid; quantities are lower bounds, not confirmed totals.".into());
    }
    let museum = locations
        .and_then(|l| l.descendants().find(|n| n.has_tag_name("museumPieces")))
        .map(|s| {
            s.children()
                .filter(|i| i.has_tag_name("item"))
                .filter_map(|i| child(i, "value").and_then(leaf).map(normalize))
                .collect()
        });
    let bundles = locations
        .and_then(|l| l.descendants().find(|n| n.has_tag_name("bundles")))
        .map(|s| {
            s.children()
                .filter(|i| i.has_tag_name("item"))
                .filter_map(|i| {
                    let id = child(i, "key").and_then(leaf)?.to_owned();
                    let values: Vec<bool> = child(i, "value")?
                        .descendants()
                        .filter(|v| v.has_tag_name("boolean"))
                        .filter_map(|v| v.text()?.parse().ok())
                        .collect();
                    Some((id, values))
                })
                .collect()
        });
    let bundle_definitions = child(root, "bundleData").map(|s| {
        s.children()
            .filter(|i| i.has_tag_name("item"))
            .filter_map(|i| {
                Some((
                    child(i, "key").and_then(leaf)?.to_owned(),
                    child(i, "value").and_then(leaf)?.to_owned(),
                ))
            })
            .collect()
    });
    let completion = super::CompletionEvidence {
        museum,
        bundles,
        bundle_definitions,
        collected_nuts: strings(root, "collectedNutTracker"),
        limited_nuts: dictionary(root, "limitedNutDrops", false),
        golden_coconut_cracked: txt(root, "goldenCoconutCracked").and_then(|s| s.parse().ok()),
        golden_parrot_used: txt(root, "activatedGoldenParrot").and_then(|s| s.parse().ok()),
        world_flags: strings(root, "worldStateIDs"),
    };
    if let Some(locations) = locations {
        let children: Vec<_> = locations
            .descendants()
            .filter(|n| {
                n.is_element()
                    && n.attributes()
                        .any(|a| a.name() == "type" && a.value() == "Child")
            })
            .collect();
        for player in &mut players {
            // Older saves without parent IDs cannot establish which multiplayer farmer is a parent.
            player.children = children
                .iter()
                .all(|n| txt(*n, "idOfParent").is_some())
                .then(|| {
                    children
                        .iter()
                        .filter(|n| txt(**n, "idOfParent").as_deref() == Some(player.id.as_str()))
                        .count() as u32
                });
        }
    }
    let world_stats = Some(
        [
            "timesFedRaccoons",
            "daysPlayedWhenLastRaccoonBundleWasFinished",
        ]
        .iter()
        .filter_map(|key| num(root, key).map(|n| ((*key).into(), n)))
        .collect(),
    );
    Ok(SaveProfile {
        profit_margin: txt(host,"difficultyModifier").and_then(|s|s.parse::<f32>().ok()).filter(|n|n.is_finite() && *n>0.0 && *n<=1.0),
        map_obstacles: map_obstacles(locations),
        location_maps: locations.map(|l|location_maps(root,l)),
        containers, farm_objects, world_stats, storage_known, storage_stacks: storage_known.then_some(storage_stacks), completion: Some(completion),
        id: format!("{}:{}",game_id,players[0].id), path: path.to_string_lossy().into(),
        farm_name: txt(host,"farmName").unwrap_or_else(|| "Unnamed".into()), farm_type, game_version: version,
        season, day, year, saved_at, synced_at: now(), fingerprint: format!("{:x}", Sha256::digest(xml.as_bytes())),
        players, buildings, walnuts_found: num(root,"goldenWalnutsFound").and_then(|n| n.try_into().ok()),
        waivers: num(root,"perfectionWaivers").and_then(|n| n.try_into().ok()), storage,
        storage_scope: "Selected farmer inventory plus ordinary world chests, fridges and the shared Junimo Chest inventory (counted once). Lost-and-found, other special and modded containers are excluded; physical access is not guaranteed.".into(), warnings,
    })
}

fn read_once(path: &Path, quiet: Duration) -> Result<SaveProfile, String> {
    let before = fs::metadata(path).map_err(|e| format!("Cannot access save: {e}"))?;
    if !before.is_file() || before.len() == 0 || before.len() > MAX_SAVE_BYTES {
        return Err("Save must be a nonempty file smaller than 64 MiB".into());
    }
    thread::sleep(quiet);
    let after_wait = fs::metadata(path).map_err(|e| e.to_string())?;
    if before.len() != after_wait.len() || before.modified().ok() != after_wait.modified().ok() {
        return Err("Save is changing; waiting for the game to finish saving".into());
    }
    let mut bytes = Vec::new();
    fs::File::open(path)
        .map_err(|e| e.to_string())?
        .take(MAX_SAVE_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    let after = fs::metadata(path).map_err(|e| e.to_string())?;
    if bytes.len() as u64 > MAX_SAVE_BYTES
        || before.len() != bytes.len() as u64
        || before.modified().ok() != after.modified().ok()
    {
        return Err("Save changed during reading; retrying".into());
    }
    // roxmltree accepts the UTF-8 BOM. Keep it so the snapshot fingerprint
    // represents the exact file bytes used by journal transfer and undo.
    let xml = std::str::from_utf8(&bytes).map_err(|_| "Save is not valid UTF-8 XML")?;
    let stamp = after
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    parse_xml(xml, path, stamp)
}
pub fn read_stable(path: &Path) -> Result<SaveProfile, String> {
    let mut last = String::new();
    for attempt in 0..3 {
        match read_once(path, Duration::from_millis(350)) {
            Ok(s) => return Ok(s),
            Err(e) => last = e,
        };
        if attempt < 2 {
            thread::sleep(Duration::from_millis(300 * (attempt + 1)));
        }
    }
    Err(last)
}
