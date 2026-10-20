use stardew_companion_lib::save::parser::{MAX_SAVE_BYTES, parse_xml, read_stable};
use std::path::Path;
const XML: &str = include_str!("fixtures/minimal.xml");
#[test]
fn container_positions_and_quality_stacks_are_preserved() {
    let xml=XML.replace("<item><value><Object xsi:type=\"Chest\">","<item><key><Vector2><X>12</X><Y>14</Y></Vector2></key><value><Object xsi:type=\"Chest\"><itemId>130</itemId><bigCraftable>true</bigCraftable>").replace("<itemId>276</itemId><stack>1</stack>","<itemId>276</itemId><stack>3</stack><quality>2</quality>");
    let save = parse(&xml).unwrap();
    let containers = save.containers.unwrap();
    assert_eq!(containers.len(), 1);
    assert_eq!(containers[0].location, "Farm");
    assert_eq!(containers[0].tile, Some([12, 14]));
    assert_eq!(containers[0].items[0].quantity, 3);
    assert_eq!(containers[0].items[0].quality, 2);
    assert!(containers[0].contents_known);
    assert_eq!(save.farm_objects.unwrap()[0].id, "(BC)130");
}
#[test]
fn broken_container_quantities_and_nested_chests_are_not_confirmed() {
    let bad = XML.replace(
        "<itemId>276</itemId><stack>1</stack>",
        "<itemId>276</itemId><stack>broken</stack>",
    );
    let save = parse(&bad).unwrap();
    assert!(!save.containers.unwrap()[0].contents_known);
    let nested=XML.replace("<items><Item xsi:type=\"Object\"><itemId>276", "<items><Item xsi:type=\"Chest\"><itemId>130</itemId><stack>1</stack><items/><heldObject xsi:nil=\"true\"/></Item><Item xsi:type=\"Object\"><itemId>276");
    assert_eq!(parse(&nested).unwrap().containers.unwrap().len(), 1);
}
#[test]
fn chest_fridge_boolean_and_null_placeholders_are_not_containers() {
    let xml = XML
        .replace(
            "<Object xsi:type=\"Chest\"><items>",
            "<Object xsi:type=\"Chest\"><fridge>false</fridge><items>",
        )
        .replace("<buildings/>", "<buildings/><fridge xsi:nil=\"true\"/>");
    let containers = parse(&xml).unwrap().containers.unwrap();
    assert_eq!(containers.len(), 1);
    assert_eq!(containers[0].kind, "chest");
    let xml = xml.replace(
        "<fridge xsi:nil=\"true\"/>",
        "<fridge><itemId>130</itemId><items/></fridge>",
    );
    let containers = parse(&xml).unwrap().containers.unwrap();
    assert_eq!(containers.len(), 2);
    assert!(
        containers
            .iter()
            .any(|c| c.kind == "fridge" && c.contents_known)
    );
}
#[test]
fn large_chests_hoppers_and_shared_numeric_identity_keep_actual_storage() {
    for kind in ["BigChest", "6", "AutoLoader", "3", "Enricher", "4"] {
        let xml = XML.replace(
            "<Object xsi:type=\"Chest\"><items>",
            &format!(
                "<Object xsi:type=\"Chest\"><specialChestType>{kind}</specialChestType><items>"
            ),
        );
        let save = parse(&xml).unwrap();
        assert_eq!(save.storage["276"], 1, "{kind}");
        assert!(save.containers.unwrap()[0].contents_known, "{kind}");
    }
    let xml=XML.replace("<Object xsi:type=\"Chest\"><items>","<Object xsi:type=\"Chest\"><specialChestType>2</specialChestType><items>").replace("<farmhands/>","<farmhands/><junimoChest><Item xsi:type=\"Object\"><itemId>276</itemId><stack>7</stack></Item></junimoChest>");
    let save = parse(&xml).unwrap();
    let chest = &save.containers.unwrap()[0];
    assert_eq!(chest.kind, "junimo");
    assert_eq!(chest.items[0].quantity, 7);
    assert_eq!(save.storage["276"], 7);
    let xml = xml.replace(
        "<specialChestType>2</specialChestType>",
        "<specialChestType>1</specialChestType>",
    );
    assert_eq!(parse(&xml).unwrap().containers.unwrap()[0].kind, "special");
}
#[test]
fn reads_profit_margin_without_defaulting_missing_or_invalid_data() {
    assert_eq!(parse(XML).unwrap().profit_margin, None);
    let value = XML.replacen(
        "</player>",
        "<difficultyModifier>0.25</difficultyModifier></player>",
        1,
    );
    assert_eq!(parse(&value).unwrap().profit_margin, Some(0.25));
    for invalid in ["0", "NaN", "-1", "2", "broken"] {
        let value = XML.replacen(
            "</player>",
            &format!("<difficultyModifier>{invalid}</difficultyModifier></player>"),
            1,
        );
        assert_eq!(parse(&value).unwrap().profit_margin, None);
    }
}
#[test]
fn object_subtypes_keep_inventory_material_identity() {
    let xml=XML.replacen("<Item xsi:type=\"Object\"><itemId>143</itemId>","<Item xsi:type=\"ColoredObject\"><itemId>143</itemId>",1).replacen("<items>","<items><Item xsi:type=\"Chest\"><itemId>130</itemId><stack>1</stack><bigCraftable>true</bigCraftable></Item>",1);
    let save = parse(&xml).unwrap();
    assert_eq!(save.players[0].inventory["143"], 2);
    assert_eq!(save.players[0].inventory["craftable:130"], 1);
}
#[test]
fn extracts_only_known_saved_obstacles_and_keeps_unattributed_children_unknown() {
    let xml=XML.replace("<buildings/>","<buildings><Building><tileX>2</tileX><tileY>3</tileY><tilesWide>4</tilesWide><tilesHigh>2</tilesHigh></Building></buildings><characters><NPC xsi:type=\"Child\"><name>Synthetic child</name></NPC></characters><terrainFeatures><item><key><Vector2><X>7</X><Y>8</Y></Vector2></key><value><TerrainFeature xsi:type=\"Tree\"><growthStage>5</growthStage></TerrainFeature></value></item></terrainFeatures>");
    let save = parse(&xml).unwrap();
    let obstacles = &save.map_obstacles.unwrap()["Farm"];
    assert_eq!(obstacles.len(), 2);
    assert!(obstacles.iter().any(|r| r.width == 4));
    assert_eq!(save.players[0].children, None);
}
#[test]
fn malformed_item_quality_and_overflow_are_unknown_instead_of_panicking() {
    let xml = XML.replacen(
        "<bigCraftable>false</bigCraftable>",
        "<bigCraftable>false</bigCraftable><quality>broken</quality>",
        1,
    );
    assert!(!parse(&xml).unwrap().players[0].inventory_known);
    let xml = XML.replace("<stack>2</stack>", "<stack>18446744073709551615</stack>");
    assert!(!parse(&xml).unwrap().players[0].inventory_known);
}
#[test]
fn invalid_collection_counter_is_unknown_instead_of_zero() {
    let xml = XML.replace(
        "<key><string>194</string></key><value><int>1</int></value>",
        "<key><string>194</string></key><value><int>broken</int></value>",
    );
    let save = parse(&xml).unwrap();
    assert!(save.players[0].cooked.is_none());
    assert!(!save.warnings.is_empty());
}
#[test]
fn preserves_machine_materials_and_item_quality() {
    let xml=XML.replacen("<items>","<items><Item xsi:type=\"Object\"><itemId>13</itemId><stack>2</stack><bigCraftable>true</bigCraftable><quality>2</quality></Item>",1);
    let save = parse(&xml).unwrap();
    assert_eq!(save.players[0].inventory["craftable:13"], 2);
    assert!(
        save.players[0]
            .inventory_stacks
            .as_ref()
            .unwrap()
            .iter()
            .any(|s| s.id == "craftable:13" && s.quality == 2)
    );
}
fn parse(s: &str) -> Result<stardew_companion_lib::save::SaveProfile, String> {
    parse_xml(s, Path::new("synthetic"), 0)
}
#[test]
fn extracts_real_actions_separately_from_ownership() {
    let s = parse(XML).unwrap();
    let f = &s.players[0];
    assert_eq!(f.inventory["143"], 2);
    assert!(!f.fish.as_ref().unwrap().contains_key("143"));
    assert!(!f.cooked.as_ref().unwrap().contains_key("236"));
    assert_eq!(f.cooking_known.as_ref().unwrap()["Pumpkin Soup"], 0);
    assert_eq!(f.crafting.as_ref().unwrap()["Chest"], 0);
    assert_eq!(s.storage["276"], 1);
    assert_eq!(s.waivers, Some(2));
    assert_eq!(f.fish.as_ref().unwrap()["128"], 1);
}
#[test]
fn rejects_truncated_info_and_dtd() {
    for s in [
        "<SaveGame><player>",
        "<Farmer/>",
        "<!DOCTYPE a [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><SaveGame>&x;</SaveGame>",
    ] {
        assert!(parse(s).is_err());
    }
}
#[test]
fn reads_social_status_and_preserves_missing_daily_fields() {
    let saved=XML.replace("<Status>Friendly</Status>","<Status>Married</Status><GiftsToday>1</GiftsToday><GiftsThisWeek>2</GiftsThisWeek><TalkedToToday>true</TalkedToToday><RoommateMarriage>true</RoommateMarriage>").replace("<money>500</money>","<spouse>Robin</spouse><money>500</money>");
    let save = parse(&saved).unwrap();
    let f = &save.players[0];
    assert_eq!(f.spouse.as_deref(), Some("Robin"));
    let d = &f.friendship_details.as_ref().unwrap()["Robin"];
    assert_eq!(d.status.as_deref(), Some("Married"));
    assert_eq!(d.gifts_today, Some(1));
    assert_eq!(d.gifts_this_week, Some(2));
    assert_eq!(d.talked_to_today, Some(true));
    assert_eq!(d.roommate, Some(true));
    let old = parse(XML).unwrap();
    assert_eq!(
        old.players[0].friendship_details.as_ref().unwrap()["Robin"].gifts_today,
        None
    );
}
#[test]
fn missing_sections_stay_unknown() {
    let s = parse(&XML.replace("<basicShipped/>", "")).unwrap();
    assert!(s.players[0].shipped.is_none());
    assert!(!s.warnings.is_empty());
}
#[test]
fn optional_collections_and_journal_keep_evidence_separate() {
    let xml=XML.replace("<buildings/>","<buildings/><museumPieces><item><key><Vector2><X>1</X><Y>2</Y></Vector2></key><value><int>66</int></value></item></museumPieces><bundles><item><key><int>7</int></key><value><ArrayOfBoolean><boolean>true</boolean><boolean>false</boolean></ArrayOfBoolean></value></item></bundles>")
        .replace("<houseUpgradeLevel>","<professions><int>7</int></professions><questLog><Quest xsi:type=\"ItemDeliveryQuest\"><id>42</id><_questTitle>Test quest</_questTitle><completed>false</completed><daysLeft>2</daysLeft></Quest></questLog><houseUpgradeLevel>")
        .replace("<farmhands/>","<farmhands/><collectedNutTracker/><limitedNutDrops><item><key><string>Fishing</string></key><value><int>2</int></value></item></limitedNutDrops><goldenCoconutCracked>false</goldenCoconutCracked><bundleData><item><key><string>Pantry/7</string></key><value><string>Test/Reward/24 1 0/0/1</string></value></item></bundleData>");
    let save = parse(&xml).unwrap();
    let evidence = save.completion.unwrap();
    assert_eq!(evidence.museum.unwrap(), vec!["66"]);
    assert_eq!(evidence.bundles.unwrap()["7"], vec![true, false]);
    assert_eq!(
        evidence.bundle_definitions.unwrap()["Pantry/7"],
        "Test/Reward/24 1 0/0/1"
    );
    assert_eq!(evidence.collected_nuts, Some(vec![]));
    assert_eq!(evidence.limited_nuts.unwrap()["Fishing"], 2);
    assert_eq!(evidence.golden_coconut_cracked, Some(false));
    assert!(save.players[0].inventory_known);
    assert_eq!(save.players[0].professions, Some(vec![7]));
    let q = &save.players[0].quests.as_ref().unwrap()[0];
    assert_eq!(q.id, "42");
    assert_eq!(q.title.as_deref(), Some("Test quest"));
    assert_eq!(q.days_left, Some(2));
    let absent = parse(XML).unwrap().completion.unwrap();
    assert!(absent.museum.is_none());
    assert!(absent.collected_nuts.is_none());
}
#[test]
fn unknown_mod_items_are_safe() {
    let s =
        parse(&XML.replace("<itemId>143</itemId>", "<itemId>Author.Mod_Fish</itemId>")).unwrap();
    assert_eq!(s.players[0].inventory["Author.Mod_Fish"], 2);
}
#[test]
fn farm_identity_survives_rename() {
    let a = parse(XML).unwrap();
    let b = parse(&XML.replace("Test Farm", "New Name")).unwrap();
    assert_eq!(a.id, b.id);
}
#[test]
fn unsupported_versions_warn() {
    assert!(
        !parse(&XML.replace("1.6.15", "2.0.0"))
            .unwrap()
            .warnings
            .is_empty()
    );
}
#[test]
fn multiplayer_farmhands() {
    let s=parse(&XML.replace("<farmhands/>","<farmhands><Farmer><name>Guest</name><UniqueMultiplayerID>456</UniqueMultiplayerID></Farmer></farmhands>")).unwrap();
    assert_eq!(s.players.len(), 2);
    assert!(s.players[1].cooked.is_none());
}
#[test]
fn rejects_oversize_files() {
    let d = tempfile::tempdir().unwrap();
    let p = d.path().join("large");
    let f = std::fs::File::create(&p).unwrap();
    f.set_len(MAX_SAVE_BYTES + 1).unwrap();
    assert!(read_stable(&p).is_err());
}
#[test]
fn reading_does_not_change_bytes() {
    let d = tempfile::tempdir().unwrap();
    let p = d.path().join("save");
    std::fs::write(&p, XML).unwrap();
    read_stable(&p).unwrap();
    assert_eq!(std::fs::read_to_string(&p).unwrap(), XML);
}
#[test]
fn retries_partial_save_until_the_writer_finishes() {
    let d = tempfile::tempdir().unwrap();
    let p = d.path().join("save");
    std::fs::write(&p, "<SaveGame><player>").unwrap();
    let writer_path = p.clone();
    let writer = std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(180));
        std::fs::write(writer_path, XML).unwrap();
    });
    assert!(read_stable(&p).is_ok());
    writer.join().unwrap();
}
#[test]
fn fridge_is_not_double_counted_and_special_chests_are_excluded() {
    let xml=XML.replace("<buildings/>","<buildings/><fridge xsi:type=\"Chest\"><items><Item xsi:type=\"Object\"><itemId>184</itemId><stack>3</stack></Item></items></fridge>");
    let s = parse(&xml).unwrap();
    assert_eq!(s.storage["184"], 3);
    let xml = xml.replace(
        "<Object xsi:type=\"Chest\"><items>",
        "<Object xsi:type=\"Chest\"><specialChestType>JunimoChest</specialChestType><items>",
    );
    assert!(!parse(&xml).unwrap().storage.contains_key("276"));
    let xml=xml.replace("<farmhands/>","<farmhands/><junimoChest><Item xsi:type=\"Object\"><itemId>276</itemId><stack>5</stack></Item></junimoChest>");
    assert_eq!(parse(&xml).unwrap().storage["276"], 5);
}
#[test]
fn linked_and_nested_building_interiors_resolve_the_actual_building_type() {
    let linked=XML.replace("<buildings/>", "<buildings><Building><buildingType>Big Shed</buildingType><nonInstancedIndoorsName>Shed-unique</nonInstancedIndoorsName><tileX>20</tileX><tileY>12</tileY></Building></buildings>").replace("</locations>", "<GameLocation><name>Shed-unique</name><objects><item><key><Vector2><X>4</X><Y>5</Y></Vector2></key><value><Object xsi:type=\"Chest\"><itemId>232</itemId><items/></Object></value></item></objects></GameLocation></locations>");
    let save = parse(&linked).unwrap();
    assert_eq!(
        save.location_maps.as_ref().unwrap()["Shed-unique"],
        "Building/Big Shed"
    );
    let chest = save
        .containers
        .unwrap()
        .into_iter()
        .find(|c| c.location == "Shed-unique")
        .unwrap();
    assert_eq!(chest.parent_location.as_deref(), Some("Farm"));
    assert_eq!(chest.building_tile, Some([20, 12]));
    assert_eq!(chest.item_id.as_deref(), Some("(BC)232"));
    let nested=XML.replace("<buildings/>","<buildings><Building><buildingType>Deluxe Barn</buildingType><indoors><name>Barn</name><uniqueName>Barn-legacy</uniqueName></indoors></Building></buildings>");
    assert_eq!(
        parse(&nested).unwrap().location_maps.unwrap()["Barn-legacy"],
        "Building/Deluxe Barn"
    );
}
#[test]
fn home_maps_follow_upgrade_and_spouse_room_instead_of_always_showing_starter_home() {
    assert_eq!(
        parse(XML).unwrap().location_maps.unwrap()["FarmHouse"],
        "FarmHouse1"
    );
    let married = XML.replace(
        "<houseUpgradeLevel>1</houseUpgradeLevel>",
        "<houseUpgradeLevel>3</houseUpgradeLevel><spouse>Abigail</spouse>",
    );
    assert_eq!(
        parse(&married).unwrap().location_maps.unwrap()["FarmHouse"],
        "FarmHouse2_marriage"
    );
}
