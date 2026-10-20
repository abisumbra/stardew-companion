//! The same menu-map textures, atlas rectangles and positions used by the installed game.
use super::*;
use serde::Deserialize;

#[derive(Clone, Copy, Serialize, Deserialize, Debug, PartialEq)]
pub struct MapRect {
    #[serde(alias = "X")]
    pub x: i32,
    #[serde(alias = "Y")]
    pub y: i32,
    #[serde(alias = "Width")]
    pub width: i32,
    #[serde(alias = "Height")]
    pub height: i32,
}
#[derive(Clone, Serialize)]
pub struct MapLayer {
    pub sheet: String,
    pub source: MapRect,
    pub area: MapRect,
    pub condition: Option<String>,
}
#[derive(Clone, Serialize, Default)]
pub struct WorldMap {
    pub width: i32,
    pub height: i32,
    pub layers: Vec<MapLayer>,
    pub areas: BTreeMap<String, MapRect>,
    pub locations: BTreeMap<String, MapRect>,
}
fn rect(value: &Value) -> Option<MapRect> {
    let r: MapRect = serde_json::from_value(value.clone()).ok()?;
    (r.x >= 0
        && r.y >= 0
        && r.width > 0
        && r.height > 0
        && r.x.checked_add(r.width).is_some_and(|n| n <= 8192)
        && r.y.checked_add(r.height).is_some_and(|n| n <= 8192))
    .then_some(r)
}
impl Artwork {
    fn map_layer(
        &mut self,
        root: &Path,
        value: &Value,
        fallback: Option<MapRect>,
    ) -> Result<Option<MapLayer>, String> {
        let Some(sheet) = value["Texture"].as_str().filter(|s| *s != "MOD_FARM") else {
            return Ok(None);
        };
        let sheet = sheet.replace('\\', "/");
        self.sheet(root, &sheet)?;
        // Only these stock atlases are season-remapped by the game. Keep their original pixels.
        if matches!(
            sheet.as_str(),
            "LooseSprites/map" | "LooseSprites/Farm_ranching_map"
        ) {
            for season in ["summer", "fall", "winter"] {
                self.sheet(root, &format!("{sheet}_{season}"))?;
            }
        }
        let atlas = &self.sheets[&sheet];
        let source = rect(&value["SourceRect"]).unwrap_or(MapRect {
            x: 0,
            y: 0,
            width: atlas.width as i32,
            height: atlas.height as i32,
        });
        if source.x + source.width > atlas.width as i32
            || source.y + source.height > atlas.height as i32
        {
            return Err(format!("Map source rectangle is outside {sheet}"));
        }
        let area = rect(&value["MapPixelArea"])
            .or(fallback)
            .unwrap_or(MapRect {
                x: 0,
                y: 0,
                width: source.width,
                height: source.height,
            });
        Ok(Some(MapLayer {
            sheet,
            source,
            area,
            condition: value["Condition"].as_str().map(str::to_owned),
        }))
    }
    pub(super) fn maps(&mut self, root: &Path) -> Result<(), String> {
        let data = Self::data(root, "Data/WorldMap")?;
        for (id, region) in data.as_object().ok_or("Invalid WorldMap dictionary")? {
            let mut map = WorldMap::default();
            for base in region["BaseTexture"].as_array().into_iter().flatten() {
                if let Some(layer) = self.map_layer(root, base, None)? {
                    map.width = map.width.max(layer.area.x + layer.area.width);
                    map.height = map.height.max(layer.area.y + layer.area.height);
                    map.layers.push(layer);
                }
            }
            if map.width == 0 || map.height == 0 {
                continue;
            }
            for area in region["MapAreas"].as_array().into_iter().flatten() {
                let Some(area_rect) = rect(&area["PixelArea"]) else {
                    continue;
                };
                if let Some(name) = area["Id"].as_str() {
                    map.areas.insert(name.into(), area_rect);
                }
                for overlay in area["Textures"].as_array().into_iter().flatten() {
                    if let Some(layer) = self.map_layer(root, overlay, Some(area_rect))? {
                        // Complex game-state queries are retained, never executed by this reader.
                        let mut layer = layer;
                        if layer.condition.is_none() {
                            layer.condition = area["Condition"].as_str().map(str::to_owned);
                        }
                        map.layers.push(layer);
                    }
                }
                for position in area["WorldPositions"].as_array().into_iter().flatten() {
                    let r = rect(&position["MapPixelArea"]).unwrap_or(area_rect);
                    if let Some(name) = position["LocationName"].as_str() {
                        map.locations.entry(name.into()).or_insert(r);
                    }
                    for name in position["LocationNames"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(Value::as_str)
                    {
                        map.locations.entry(name.into()).or_insert(r);
                    }
                }
            }
            // The stock Meadowlands map is the MOD_FARM overlay for that farm type.
            if id == "Valley" && content_path(root, "LooseSprites/Farm_ranching_map").is_ok() {
                let layer = serde_json::json!({"Texture":"LooseSprites/Farm_ranching_map", "Condition":"FARM_TYPE Meadowlands", "MapPixelArea":{"X":0,"Y":43,"Width":131,"Height":61}});
                if let Some(layer) = self.map_layer(root, &layer, None)? {
                    map.layers.push(layer);
                }
            }
            self.maps.insert(id.clone(), map);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn map_rectangles_reject_missing_extents_overflow_and_negative_coordinates() {
        assert!(rect(&json!({"X":0,"Y":0,"Width":0,"Height":0})).is_none());
        assert!(rect(&json!({"X":-1,"Y":0,"Width":20,"Height":20})).is_none());
        assert!(rect(&json!({"X":i32::MAX,"Y":0,"Width":10,"Height":10})).is_none());
        assert_eq!(
            rect(&json!({"X":204,"Y":26,"Width":1,"Height":1})),
            Some(MapRect {
                x: 204,
                y: 26,
                width: 1,
                height: 1
            })
        );
    }
}
