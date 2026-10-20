mod knowledge;
mod maps;
pub mod tilemap;
pub mod xnb;
use base64::{Engine, engine::general_purpose::STANDARD};
use serde::Serialize;
use serde_json::Value;
use std::{
    collections::BTreeMap,
    fs,
    path::{Component, Path, PathBuf},
};
use xnb::Xnb;

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Artwork {
    pub root: Option<String>,
    pub sheets: BTreeMap<String, Sheet>,
    pub sprites: BTreeMap<String, Sprite>,
    pub items: Vec<GalleryEntry>,
    pub characters: Vec<GalleryEntry>,
    pub monsters: Vec<GalleryEntry>,
    pub world: Vec<GalleryEntry>,
    pub recipes: BTreeMap<String, Recipe>,
    pub gifts: BTreeMap<String, GiftTaste>,
    pub game_data: BTreeMap<String, Value>,
    pub schedules: BTreeMap<String, Value>,
    pub events: BTreeMap<String, Vec<EventReference>>,
    pub translations: BTreeMap<String, String>,
    pub maps: BTreeMap<String, maps::WorldMap>,
    pub warnings: Vec<String>,
    pub unavailable: BTreeMap<String, String>,
    #[serde(skip)]
    text: BTreeMap<String, Value>,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventReference {
    pub id: String,
    pub location: String,
    pub friendship_points: u32,
    pub conditions: Vec<String>,
}
#[derive(Clone, Serialize)]
pub struct Sheet {
    pub url: String,
    pub width: u32,
    pub height: u32,
}
#[derive(Clone, Serialize)]
pub struct Sprite {
    pub sheet: String,
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}
#[derive(Clone, Serialize)]
pub struct GalleryEntry {
    pub id: String,
    pub name: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}
#[derive(Clone, Serialize)]
pub struct Recipe {
    pub name: String,
    pub kind: String,
    pub unlock: String,
    pub output: String,
    pub quantity: u32,
    pub ingredients: Vec<Material>,
}
#[derive(Clone, Serialize)]
pub struct Material {
    pub id: String,
    pub quantity: u32,
}
#[derive(Clone, Serialize)]
pub struct GiftTaste {
    pub loved: Vec<String>,
    pub liked: Vec<String>,
}

pub fn validate_root(root: &Path) -> Result<PathBuf, String> {
    let root = root.canonicalize().map_err(|e| e.to_string())?;
    if !root.join("Content/Maps/springobjects.xnb").is_file()
        || !root.join("Content/Data/Objects.xnb").is_file()
    {
        return Err("Choose the Stardew Valley game folder (1.6+), containing Content and Stardew Valley.exe.".into());
    }
    Ok(root)
}
pub fn discover() -> Option<PathBuf> {
    let mut steam = vec![];
    for var in ["ProgramFiles(x86)", "ProgramFiles"] {
        if let Some(dir) = std::env::var_os(var) {
            steam.push(PathBuf::from(dir).join("Steam"));
        }
    }
    if let Some(dir) = dirs::home_dir() {
        steam.extend([
            dir.join(".steam/steam"),
            dir.join(".local/share/Steam"),
            dir.join("Library/Application Support/Steam"),
        ]);
    }
    let mut libraries = steam.clone();
    for dir in steam {
        if let Ok(text) = fs::read_to_string(dir.join("steamapps/libraryfolders.vdf")) {
            for line in text.lines() {
                let parts: Vec<_> = line.split('"').collect();
                if parts.get(1) == Some(&"path")
                    && let Some(path) = parts.get(3)
                {
                    libraries.push(PathBuf::from(path.replace("\\\\", "\\")));
                }
            }
        }
    }
    libraries
        .into_iter()
        .find_map(|p| validate_root(&p.join("steamapps/common/Stardew Valley")).ok())
}
fn content_path(root: &Path, name: &str) -> Result<PathBuf, String> {
    let relative = PathBuf::from(name.replace('\\', "/"));
    if relative
        .components()
        .any(|c| !matches!(c, Component::Normal(_)))
    {
        return Err("Invalid content asset path".into());
    }
    let content = root
        .join("Content")
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let mut asset = content.join(relative).into_os_string();
    asset.push(".xnb");
    let path = PathBuf::from(asset)
        .canonicalize()
        .map_err(|e| e.to_string())?;
    if !path.starts_with(content) {
        return Err("Asset is outside the game Content directory".into());
    }
    Ok(path)
}
impl Artwork {
    fn sheet(&mut self, root: &Path, name: &str) -> Result<(), String> {
        if self.sheets.contains_key(name) {
            return Ok(());
        }
        if self.sheets.len() >= 512 {
            return Err("Artwork sheet limit reached".into());
        }
        let texture = Xnb::open(&content_path(root, name)?)?.texture()?;
        let png = texture.png()?;
        if self.sheets.values().map(|s| s.url.len()).sum::<usize>() + png.len() * 4 / 3
            > 96 * 1024 * 1024
        {
            return Err("Combined artwork memory limit reached".into());
        }
        self.sheets.insert(
            name.into(),
            Sheet {
                url: format!("data:image/png;base64,{}", STANDARD.encode(png)),
                width: texture.width,
                height: texture.height,
            },
        );
        Ok(())
    }
    fn tile(
        &mut self,
        root: &Path,
        id: &str,
        sheet: &str,
        index: u32,
        width: u32,
        height: u32,
    ) -> Result<(), String> {
        self.sheet(root, sheet)?;
        let atlas = &self.sheets[sheet];
        let columns = atlas.width / width;
        if columns == 0 {
            return Err("Invalid sprite atlas dimensions".into());
        }
        let x = index % columns * width;
        let y = (index / columns)
            .checked_mul(height)
            .ok_or("Invalid sprite index")?;
        if x + width > atlas.width || y.checked_add(height).is_none_or(|n| n > atlas.height) {
            return Err(format!("Sprite {id} is outside {sheet}"));
        }
        self.sprites.insert(
            id.into(),
            Sprite {
                sheet: sheet.into(),
                x,
                y,
                width,
                height,
            },
        );
        Ok(())
    }
    fn alias(&mut self, id: &str, target: &str) {
        if let Some(sprite) = self.sprites.get(target).cloned() {
            self.sprites.insert(id.into(), sprite);
        }
    }
    fn data(root: &Path, name: &str) -> Result<Value, String> {
        Xnb::open(&content_path(root, name)?)?.data()
    }
    fn display_name(&mut self, root: &Path, display: Option<&str>, fallback: &str) -> String {
        let Some(display) = display.filter(|s| !s.is_empty()) else {
            return fallback.into();
        };
        let Some(token) = display
            .strip_prefix("[LocalizedText ")
            .and_then(|s| s.strip_suffix(']'))
        else {
            return if display.starts_with('[') {
                fallback.into()
            } else {
                display.into()
            };
        };
        let Some((file, key)) = token.split_once(':') else {
            return fallback.into();
        };
        if key.contains(' ') {
            return fallback.into();
        }
        if !self.text.contains_key(file) {
            self.text
                .insert(file.into(), Self::data(root, file).unwrap_or(Value::Null));
        }
        self.text[file][key].as_str().unwrap_or(fallback).into()
    }
    fn objects(
        &mut self,
        root: &Path,
        file: &str,
        kind: &str,
        default_sheet: &str,
        height: u32,
    ) -> Result<(), String> {
        let data = Self::data(root, file)?;
        let mut textures = BTreeMap::new();
        for (key, value) in data.as_object().ok_or("Expected game item dictionary")? {
            let id = format!("{kind}:{key}");
            let name = value["Name"].as_str().unwrap_or(key);
            let label = self.display_name(root, value["DisplayName"].as_str(), name);
            let description = self.display_name(root, value["Description"].as_str(), "");
            let sheet = value["Texture"]
                .as_str()
                .filter(|s| !s.is_empty())
                .unwrap_or(default_sheet);
            let index = if kind == "tool" {
                value["MenuSpriteIndex"]
                    .as_i64()
                    .filter(|n| *n >= 0)
                    .or(value["SpriteIndex"].as_i64())
            } else if kind == "trinket" {
                value["SheetIndex"].as_i64()
            } else {
                value["SpriteIndex"].as_i64()
            }
            .ok_or("Item has no sprite index")?;
            match self.tile(root, &id, sheet, index as u32, 16, height) {
                Ok(()) => {
                    if !textures.contains_key(sheet) {
                        textures.insert(
                            sheet.to_owned(),
                            Xnb::open(&content_path(root, sheet)?)?.texture()?,
                        );
                    }
                    let sprite = &self.sprites[&id];
                    if !visible_pixels(
                        &textures[sheet],
                        [sprite.x, sprite.y, sprite.width, sprite.height],
                    ) {
                        self.sprites.remove(&id);
                        self.unavailable.insert(
                            id.clone(),
                            "The installed game defines this item, but its artwork is empty."
                                .into(),
                        );
                    }
                    self.items.push(GalleryEntry {
                        id: id.clone(),
                        name: label,
                        kind: kind.into(),
                        description: (!description.is_empty()).then_some(description),
                    });
                }
                Err(e) => self.warnings.push(format!("{name}: {e}")),
            }
            if kind == "object" {
                for category in ["cooking", "shipping", "fishing"] {
                    self.alias(&format!("{category}:{key}"), &id);
                }
                self.alias(&format!("(O){key}"), &id);
                if name == "Stardrop" {
                    self.alias("category:stardrops", &id);
                }
                if name == "Golden Walnut" {
                    self.alias("category:walnuts", &id);
                }
            } else {
                let prefix = match kind {
                    "craftable" => "BC",
                    "weapon" => "W",
                    "tool" => "T",
                    "trinket" => "TR",
                    _ => "O",
                };
                self.alias(&format!("({prefix}){key}"), &id);
            }
        }
        Ok(())
    }
    fn recipes(&mut self, root: &Path, file: &str, kind: &str) -> Result<(), String> {
        let data = Self::data(root, file)?;
        for (name, value) in data.as_object().ok_or("Expected recipe dictionary")? {
            let parts: Vec<_> = value
                .as_str()
                .ok_or("Expected recipe text")?
                .split('/')
                .collect();
            if parts.len() < 4 {
                continue;
            }
            let output: Vec<_> = parts[2].split_whitespace().collect();
            let Some(key) = output.first() else {
                continue;
            };
            let output_id = if key.starts_with('(') {
                key.to_string()
            } else {
                format!(
                    "{}:{key}",
                    if kind == "crafting" && parts[3] == "true" {
                        "craftable"
                    } else {
                        "object"
                    }
                )
            };
            let id = format!("{kind}:{name}");
            self.alias(&id, &output_id);
            let raw: Vec<_> = parts[0].split_whitespace().collect();
            let ingredients = raw
                .as_chunks::<2>()
                .0
                .iter()
                .filter_map(|p| {
                    Some(Material {
                        id: p[0].into(),
                        quantity: p[1].parse().ok()?,
                    })
                })
                .collect();
            let recipe = Recipe {
                name: name.clone(),
                kind: kind.into(),
                unlock: parts
                    .get(if kind == "cooking" { 3 } else { 4 })
                    .unwrap_or(&"")
                    .to_string(),
                output: output_id,
                quantity: output.get(1).and_then(|n| n.parse().ok()).unwrap_or(1),
                ingredients,
            };
            if kind == "cooking" {
                self.recipes
                    .insert(format!("cooking:{key}"), recipe.clone());
            }
            self.recipes.insert(id, recipe);
        }
        Ok(())
    }
    fn rectangle(
        &mut self,
        root: &Path,
        id: &str,
        sheet: &str,
        rect: [u32; 4],
    ) -> Result<(), String> {
        let [x, y, width, height] = rect;
        self.sheet(root, sheet)?;
        let atlas = &self.sheets[sheet];
        if x.checked_add(width).is_none_or(|n| n > atlas.width)
            || y.checked_add(height).is_none_or(|n| n > atlas.height)
            || width == 0
            || height == 0
        {
            return Err(format!("Sprite {id} is outside {sheet}"));
        }
        self.sprites.insert(
            id.into(),
            Sprite {
                sheet: sheet.into(),
                x,
                y,
                width,
                height,
            },
        );
        Ok(())
    }
    fn clothing(&mut self, root: &Path, kind: &str) -> Result<(), String> {
        let file = if kind == "shirt" {
            "Data/Shirts"
        } else {
            "Data/Pants"
        };
        let data = Self::data(root, file)?;
        let entries = data.as_object().ok_or("Expected clothing dictionary")?;
        if entries.len() > 16384 {
            return Err("Clothing catalog exceeds preview limit".into());
        }
        let mut shirt_atlas = xnb::Texture {
            width: 128,
            height: ((entries.len().max(1).div_ceil(16)) * 8) as u32,
            pixels: vec![0; 128 * entries.len().max(1).div_ceil(16) * 8 * 4],
        };
        let mut textures = BTreeMap::new();
        for (slot, (key, v)) in entries.iter().enumerate() {
            let id = format!("{kind}:{key}");
            let name = v["Name"].as_str().filter(|n| !n.is_empty()).unwrap_or(key);
            let label = self.display_name(root, v["DisplayName"].as_str(), name);
            let description = self.display_name(root, v["Description"].as_str(), "");
            let default = if kind == "shirt" {
                "Characters/Farmer/shirts"
            } else {
                "Characters/Farmer/pants"
            };
            let sheet = v["Texture"]
                .as_str()
                .filter(|s| !s.is_empty())
                .unwrap_or(default);
            let index = v["SpriteIndex"].as_u64().ok_or("Invalid clothing index")? as u32;
            let (x, y, w, h) = if kind == "shirt" {
                (index % 16 * 8, index / 16 * 32, 8, 8)
            } else {
                (index % 10 * 192, index / 10 * 688, 16, 32)
            };
            let result = if kind == "shirt" {
                (|| -> Result<(), String> {
                    if !textures.contains_key(sheet) {
                        textures.insert(
                            sheet.to_owned(),
                            Xnb::open(&content_path(root, sheet)?)?.texture()?,
                        );
                    }
                    let source = &textures[sheet];
                    let mut preview = xnb::Texture {
                        width: 8,
                        height: 8,
                        pixels: vec![0; 8 * 8 * 4],
                    };
                    blit_preview(&mut preview, source, [x, y, w, h], [0, 0])?;
                    if x + 128 + 8 <= source.width {
                        let mut dye = xnb::Texture {
                            width: 8,
                            height: 8,
                            pixels: vec![0; 8 * 8 * 4],
                        };
                        blit_preview(&mut dye, source, [x + 128, y, w, h], [0, 0])?;
                        let rgb: Vec<u8> = v["DefaultColor"]
                            .as_str()
                            .unwrap_or("")
                            .split(|c: char| c.is_whitespace() || c == ',')
                            .filter_map(|n| n.parse().ok())
                            .collect();
                        if rgb.len() >= 3 {
                            for pixel in dye.pixels.as_chunks_mut::<4>().0 {
                                for c in 0..3 {
                                    pixel[c] = (pixel[c] as u32 * rgb[c] as u32 / 255) as u8;
                                }
                            }
                        }
                        blit_preview(&mut preview, &dye, [0, 0, 8, 8], [0, 0])?;
                    }
                    let (sx, sy) = ((slot % 16 * 8) as u32, (slot / 16 * 8) as u32);
                    blit_preview(
                        &mut shirt_atlas,
                        &preview,
                        [0, 0, 8, 8],
                        [sx as i32, sy as i32],
                    )?;
                    self.sprites.insert(
                        id.clone(),
                        Sprite {
                            sheet: "Preview/shirts".into(),
                            x: sx,
                            y: sy,
                            width: 8,
                            height: 8,
                        },
                    );
                    Ok(())
                })()
            } else {
                self.rectangle(root, &id, sheet, [x, y, w, h])
            };
            match result {
                Ok(()) => self.items.push(GalleryEntry {
                    id: id.clone(),
                    name: label,
                    kind: kind.into(),
                    description: (!description.is_empty()).then_some(description),
                }),
                Err(e) => self.warnings.push(e),
            }
            self.alias(
                &format!("({}){key}", if kind == "shirt" { "S" } else { "P" }),
                &id,
            );
        }
        if kind == "shirt" {
            self.sheets.insert(
                "Preview/shirts".into(),
                Sheet {
                    width: shirt_atlas.width,
                    height: shirt_atlas.height,
                    url: format!(
                        "data:image/png;base64,{}",
                        STANDARD.encode(shirt_atlas.png()?)
                    ),
                },
            );
        }
        Ok(())
    }
    fn furnishings(&mut self, root: &Path, kind: &str) -> Result<(), String> {
        let file = match kind {
            "furniture" => "Data/Furniture",
            "hat" => "Data/hats",
            _ => "Data/Boots",
        };
        let data = Self::data(root, file)?;
        for (key, v) in data.as_object().ok_or("Expected item dictionary")? {
            let parts: Vec<_> = v.as_str().ok_or("Invalid item text")?.split('/').collect();
            let id = format!("{kind}:{key}");
            let name = parts[0];
            let display = parts
                .get(match kind {
                    "furniture" => 7,
                    "hat" => 5,
                    _ => 6,
                })
                .copied();
            let label = self.display_name(root, display, name);
            let number = key.parse::<u32>().unwrap_or(0);
            let result = if kind == "furniture" {
                let sheet = parts
                    .get(9)
                    .filter(|s| !s.is_empty())
                    .copied()
                    .unwrap_or("TileSheets/furniture");
                let index = parts.get(8).and_then(|s| s.parse().ok()).unwrap_or(number);
                let default = match parts.get(1).copied().unwrap_or("") {
                    "bench" | "armchair" | "dresser" | "painting" => (2, 2),
                    "couch" | "rug" => (3, 2),
                    "long table" | "longTable" => (5, 3),
                    "lamp" => (1, 3),
                    "bookcase" | "table" => (2, 3),
                    "fireplace" => (2, 5),
                    _ => (1, 2),
                };
                let dimensions: Vec<_> = parts
                    .get(2)
                    .unwrap_or(&"-1")
                    .split_whitespace()
                    .filter_map(|s| s.parse::<u32>().ok())
                    .collect();
                let (w, h) = if dimensions.len() == 2 {
                    (dimensions[0], dimensions[1])
                } else {
                    default
                };
                self.sheet(root, sheet).and_then(|()| {
                    let columns = self.sheets[sheet].width / 16;
                    if columns == 0 {
                        return Err("Invalid furniture sheet".into());
                    }
                    self.rectangle(
                        root,
                        &id,
                        sheet,
                        [index % columns * 16, index / columns * 16, w * 16, h * 16],
                    )
                })
            } else if kind == "hat" {
                let index = parts.get(6).and_then(|s| s.parse().ok()).unwrap_or(number);
                let sheet = parts
                    .get(7)
                    .filter(|s| !s.is_empty())
                    .copied()
                    .unwrap_or("Characters/Farmer/hats");
                self.sheet(root, sheet).and_then(|()| {
                    let columns = self.sheets[sheet].width / 20;
                    if columns == 0 {
                        return Err("Invalid hat sheet".into());
                    }
                    self.rectangle(
                        root,
                        &id,
                        sheet,
                        [index % columns * 20, index / columns * 80, 20, 20],
                    )
                })
            } else {
                let index = parts.get(8).and_then(|s| s.parse().ok()).unwrap_or(number);
                let sheet = parts
                    .get(9)
                    .filter(|s| !s.is_empty())
                    .copied()
                    .unwrap_or("Maps/springobjects");
                self.tile(root, &id, sheet, index, 16, 16)
            };
            match result {
                Ok(()) => self.items.push(GalleryEntry {
                    id: id.clone(),
                    name: label,
                    kind: kind.into(),
                    description: None,
                }),
                Err(e) => self.warnings.push(format!("{id} ({name}): {e}")),
            }
            let prefix = match kind {
                "furniture" => "F",
                "hat" => "H",
                _ => "B",
            };
            self.alias(&format!("({prefix}){key}"), &id);
        }
        Ok(())
    }
    fn people(&mut self, root: &Path) -> Result<(), String> {
        for (folder, kind) in [
            ("Portraits", "character"),
            ("Characters/Monsters", "monster"),
        ] {
            let mut files: Vec<_> = fs::read_dir(root.join("Content").join(folder))
                .map_err(|e| e.to_string())?
                .filter_map(Result::ok)
                .map(|e| e.path())
                .collect();
            files.sort();
            for path in files.into_iter().take(256) {
                if path.extension().is_none_or(|e| e != "xnb") {
                    continue;
                }
                let Some(name) = path.file_stem().and_then(|s| s.to_str()) else {
                    continue;
                };
                let id = format!("{kind}:{name}");
                let sheet = format!("{folder}/{name}");
                let result = self.sheet(root, &sheet).and_then(|()| {
                    let size = &self.sheets[&sheet];
                    let rect = if kind == "character" {
                        [0, 0, 64, 64]
                    } else {
                        let frame = monster_frame(name, size.width, size.height);
                        let texture = Xnb::open(&content_path(root, &sheet)?)?.texture()?;
                        visible_frame(&texture, frame)
                            .ok_or("Monster preview contains no visible pixels")?
                    };
                    self.rectangle(root, &id, &sheet, rect)
                });
                match result {
                    Ok(()) => {
                        let entry = GalleryEntry {
                            id: id.clone(),
                            name: name.into(),
                            kind: kind.into(),
                            description: None,
                        };
                        if kind == "character" {
                            self.characters.push(entry);
                            self.alias(&format!("friendship:{name}"), &id);
                            let walking = format!("Characters/{name}");
                            if self.sheet(root, &walking).is_ok() {
                                let _ = self.tile(
                                    root,
                                    &format!("walking:{name}"),
                                    &walking,
                                    0,
                                    16,
                                    32,
                                );
                            }
                        } else {
                            self.monsters.push(entry);
                        }
                    }
                    Err(e) => self.warnings.push(format!("{name}: {e}")),
                }
            }
        }
        Ok(())
    }
    fn world(&mut self, root: &Path) -> Result<(), String> {
        let animals = Self::data(root, "Data/FarmAnimals")?;
        for (folder, kind) in [("Animals", "animal")] {
            let mut files: Vec<_> = fs::read_dir(root.join("Content").join(folder))
                .map_err(|e| e.to_string())?
                .filter_map(Result::ok)
                .map(|f| f.path())
                .collect();
            files.sort();
            for file in files.into_iter().take(160) {
                if file.extension().is_none_or(|e| e != "xnb") {
                    continue;
                }
                let Some(name) = file.file_stem().and_then(|s| s.to_str()) else {
                    continue;
                };
                if name == "Error" {
                    continue;
                }
                let sheet = format!("{folder}/{name}");
                let id = format!("{kind}:{name}");
                let result = self.sheet(root, &sheet).and_then(|()| {
                    let atlas = &self.sheets[&sheet];
                    let (w, h) = animal_frame(name, &animals, atlas.width);
                    let texture = Xnb::open(&content_path(root, &sheet)?)?.texture()?;
                    let rect = visible_frame(&texture, [0, 0, w, h])
                        .ok_or("Animal preview contains no visible pixels")?;
                    self.rectangle(root, &id, &sheet, rect)
                });
                match result {
                    Ok(()) => self.world.push(GalleryEntry {
                        id,
                        name: name.into(),
                        kind: kind.into(),
                        description: None,
                    }),
                    Err(e) => self.warnings.push(format!("{sheet}: {e}")),
                }
            }
        }
        let buildings = Self::data(root, "Data/Buildings")?;
        for (name, data) in buildings
            .as_object()
            .ok_or("Expected building dictionary")?
        {
            let Some(texture) = data["Texture"].as_str() else {
                continue;
            };
            let sheet = texture.replace('\\', "/");
            let id = format!("building:{name}");
            let result = self.building_preview(root, &id, &sheet, data);
            match result {
                Ok(()) => self.world.push(GalleryEntry {
                    id,
                    name: data["Name"].as_str().unwrap_or(name).into(),
                    kind: "building".into(),
                    description: None,
                }),
                Err(e) => self.warnings.push(format!("Building {name}: {e}")),
            }
            if let Some(skins) = data["Skins"].as_array() {
                for skin in skins {
                    let (Some(name), Some(texture)) =
                        (skin["Id"].as_str(), skin["Texture"].as_str())
                    else {
                        continue;
                    };
                    let sheet = texture.replace('\\', "/");
                    let id = format!("building:{name}");
                    let result = self.building_preview(root, &id, &sheet, data);
                    match result {
                        Ok(()) => self.world.push(GalleryEntry {
                            id,
                            name: name.into(),
                            kind: "building".into(),
                            description: None,
                        }),
                        Err(e) => self.warnings.push(format!("Building skin {name}: {e}")),
                    }
                }
            }
        }
        Ok(())
    }
    fn building_preview(
        &mut self,
        root: &Path,
        id: &str,
        sheet: &str,
        data: &Value,
    ) -> Result<(), String> {
        let source = Xnb::open(&content_path(root, sheet)?)?.texture()?;
        // Fish Pond uses a custom game renderer: its first 80x80 block is the
        // pond border; the rest of the sheet is signs, nets and animation parts.
        let rect = if id == "building:Fish Pond" {
            [0, 0, 80, 80]
        } else if id == "building:Junimo Hut" {
            [0, 0, 48, 64]
        } else {
            building_rectangle(data, source.width, source.height)
        };
        if rect[2] == 0
            || rect[3] == 0
            || rect[2] > 2048
            || rect[3] > 2048
            || rect[0]
                .checked_add(rect[2])
                .is_none_or(|n| n > source.width)
            || rect[1]
                .checked_add(rect[3])
                .is_none_or(|n| n > source.height)
        {
            return Err("Invalid building preview dimensions".into());
        }
        let mut preview = xnb::Texture {
            width: rect[2],
            height: rect[3],
            pixels: vec![0; (rect[2] * rect[3] * 4) as usize],
        };
        if id == "building:Fish Pond" {
            for y in 8..72 {
                for x in 8..72 {
                    let at = ((y * preview.width + x) * 4) as usize;
                    preview.pixels[at..at + 4].copy_from_slice(&[85, 148, 177, 255]);
                }
            }
        }
        blit_preview(&mut preview, &source, rect, [0, 0])?;
        if let Some(layers) = data["DrawLayers"].as_array() {
            for layer in layers {
                // Static preview: closed doors and the first unconditional
                // animation frame; chest contents and open-door overlays vary.
                if layer["OnlyDrawIfChestHasContents"].is_string()
                    || layer["Id"].as_str().is_some_and(|id| id.contains("_Open_"))
                {
                    continue;
                }
                let r = &layer["SourceRect"];
                let n = |k| r[k].as_u64().unwrap_or(0) as u32;
                let rect = [n("X"), n("Y"), n("Width"), n("Height")];
                let position = [
                    layer["DrawPosition"]["X"].as_f64().unwrap_or(0.0) as i32,
                    layer["DrawPosition"]["Y"].as_f64().unwrap_or(0.0) as i32,
                ];
                if let Some(texture) = layer["Texture"].as_str().filter(|s| !s.is_empty()) {
                    let overlay = Xnb::open(&content_path(root, texture)?)?.texture()?;
                    blit_preview(&mut preview, &overlay, rect, position)?;
                } else {
                    blit_preview(&mut preview, &source, rect, position)?;
                }
            }
        }
        let sheet = format!("Preview/{id}");
        self.sheets.insert(
            sheet.clone(),
            Sheet {
                width: preview.width,
                height: preview.height,
                url: format!("data:image/png;base64,{}", STANDARD.encode(preview.png()?)),
            },
        );
        self.sprites.insert(
            id.into(),
            Sprite {
                sheet,
                x: 0,
                y: 0,
                width: preview.width,
                height: preview.height,
            },
        );
        Ok(())
    }
}
fn visible_pixels(texture: &xnb::Texture, rect: [u32; 4]) -> bool {
    let [x, y, w, h] = rect;
    (y..y + h).any(|row| {
        (x..x + w)
            .any(|column| texture.pixels[((row * texture.width + column) * 4 + 3) as usize] > 0)
    })
}
fn blit_preview(
    target: &mut xnb::Texture,
    source: &xnb::Texture,
    rect: [u32; 4],
    at: [i32; 2],
) -> Result<(), String> {
    let [sx, sy, width, height] = rect;
    if sx.checked_add(width).is_none_or(|n| n > source.width)
        || sy.checked_add(height).is_none_or(|n| n > source.height)
    {
        return Err("Building preview source rectangle is outside its texture".into());
    }
    for y in 0..height {
        for x in 0..width {
            let (dx, dy) = (at[0] as i64 + x as i64, at[1] as i64 + y as i64);
            if dx < 0 || dy < 0 || dx >= target.width as i64 || dy >= target.height as i64 {
                continue;
            }
            let from = (((sy + y) * source.width + sx + x) * 4) as usize;
            let to = ((dy as u32 * target.width + dx as u32) * 4) as usize;
            let alpha = source.pixels[from + 3] as u32;
            let old_alpha = target.pixels[to + 3] as u32;
            let out_alpha = alpha + old_alpha * (255 - alpha) / 255;
            if out_alpha == 0 {
                continue;
            }
            for c in 0..3 {
                target.pixels[to + c] = ((source.pixels[from + c] as u32 * alpha
                    + target.pixels[to + c] as u32 * old_alpha * (255 - alpha) / 255)
                    / out_alpha) as u8;
            }
            target.pixels[to + 3] = out_alpha as u8;
        }
    }
    Ok(())
}
fn animal_frame(name: &str, animals: &Value, atlas_width: u32) -> (u32, u32) {
    if name == "horse"
        || name.starts_with("cat")
        || name.starts_with("dog")
        || name.starts_with("turtle")
    {
        return (32, 32);
    }
    if let Some(data) = animals.as_object().and_then(|entries| {
        entries.values().find(|data| {
            ["Texture", "BabyTexture", "HarvestedTexture"]
                .iter()
                .any(|key| {
                    data[*key]
                        .as_str()
                        .is_some_and(|path| path.replace('\\', "/") == format!("Animals/{name}"))
                })
        })
    }) && let (Some(w), Some(h)) = (data["SpriteWidth"].as_u64(), data["SpriteHeight"].as_u64())
    {
        return (w as u32, h as u32);
    }
    (atlas_width / 4, atlas_width / 4)
}
fn visible_frame(texture: &xnb::Texture, rect: [u32; 4]) -> Option<[u32; 4]> {
    let [x, y, w, h] = rect;
    if w == 0 || h == 0 || x.checked_add(w)? > texture.width || y.checked_add(h)? > texture.height {
        return None;
    }
    let (mut min_x, mut min_y, mut max_x, mut max_y) = (x + w, y + h, x, y);
    let mut found = false;
    for sy in y..y + h {
        for sx in x..x + w {
            let alpha = *texture
                .pixels
                .get(((sy * texture.width + sx) * 4 + 3) as usize)?;
            if alpha > 0 {
                found = true;
                min_x = min_x.min(sx);
                min_y = min_y.min(sy);
                max_x = max_x.max(sx);
                max_y = max_y.max(sy);
            }
        }
    }
    found.then_some([
        min_x,
        min_y,
        max_x.saturating_sub(min_x) + 1,
        max_y.saturating_sub(min_y) + 1,
    ])
}
fn building_rectangle(data: &Value, width: u32, height: u32) -> [u32; 4] {
    let r = &data["SourceRect"];
    let n = |key| r[key].as_u64().unwrap_or(0) as u32;
    if n("Width") == 0 || n("Height") == 0 {
        [0, 0, width, height]
    } else {
        [n("X"), n("Y"), n("Width"), n("Height")]
    }
}
fn monster_size(name: &str, width: u32, height: u32) -> (u32, u32) {
    let name = name.split('_').next().unwrap_or(name);
    let (w, h) = match name {
        "Green Slime" | "Tiger Slime" => (16, 24),
        "Big Slime" => (32, 32),
        "Crow" => (64, 64),
        "Spider" => (32, 32),
        "Serpent" | "Pepper Rex" | "Dino Monster" => (32, 32),
        "Shadow Brute" | "Mummy" | "Skeleton" | "Skeleton Mage" => (16, 32),
        "Bat" | "Frost Bat" | "Lava Bat" | "Iridium Bat" | "Fly" => (16, 32),
        "Duggy" | "Magma Duggy" | "Hot Head" => (16, 16),
        "Blue Squid" => (24, 24),
        "Shadow Sniper" | "Angry Roger" => (32, 32),
        "Shadow Shaman" | "Rock Golem" | "Wilderness Golem" | "Stone Golem" | "Iridium Golem"
        | "Grub" | "Rock Crab" | "Lava Crab" | "Iridium Crab" | "Truffle Crab"
        | "False Magma Cap" | "Stick Bug" | "Dust Spirit" => (16, 24),
        "Ghost" | "Carbon Ghost" | "Putrid Ghost" => (16, 24),
        "Squid Kid" => (16, 16),
        "Royal Serpent" => (32, 32),
        _ => (16, 16),
    };
    (w.min(width), h.min(height))
}
// Verified against the local 1.6 atlases: use an exposed/standing frame, not a burrow
// or a composite of adjacent animation frames. Royal Serpent is a head preview;
// the game assembles its variable-length body at runtime.
fn monster_frame(name: &str, width: u32, height: u32) -> [u32; 4] {
    let base = name.strip_suffix("_dangerous").unwrap_or(name);
    let (w, h) = monster_size(name, width, height);
    let (x, y) = match base {
        "Bat" | "Frost Bat" | "Lava Bat" | "Iridium Bat" => (16, 0),
        "Duggy" | "Magma Duggy" => (0, 32),
        "Rock Crab" | "Lava Crab" | "Iridium Crab" | "Truffle Crab" | "Stick Bug" => (16, 0),
        "Lava Lurk" => (16, 16),
        _ => (0, 0),
    };
    [
        if x + w <= width { x } else { 0 },
        if y + h <= height { y } else { 0 },
        w,
        h,
    ]
}
pub fn load(root: Option<PathBuf>) -> Artwork {
    let Some(root) = root else {
        return Artwork::default();
    };
    let mut art = Artwork {
        root: Some(root.to_string_lossy().into()),
        ..Default::default()
    };
    for (file, kind, sheet, height) in [
        ("Data/Objects", "object", "Maps/springobjects", 16),
        (
            "Data/BigCraftables",
            "craftable",
            "TileSheets/Craftables",
            32,
        ),
        ("Data/Weapons", "weapon", "TileSheets/weapons", 16),
        ("Data/Tools", "tool", "TileSheets/tools", 16),
        ("Data/Trinkets", "trinket", "TileSheets/Objects_2", 16),
    ] {
        if let Err(e) = art.objects(&root, file, kind, sheet, height) {
            art.warnings.push(format!("{file}: {e}"));
        }
    }
    for kind in ["shirt", "pants"] {
        if let Err(e) = art.clothing(&root, kind) {
            art.warnings.push(format!("{kind}: {e}"));
        }
    }
    for kind in ["hat", "boots", "furniture"] {
        if let Err(e) = art.furnishings(&root, kind) {
            art.warnings.push(format!("{kind}: {e}"));
        }
    }
    for (file, kind) in [
        ("Data/CraftingRecipes", "crafting"),
        ("Data/CookingRecipes", "cooking"),
    ] {
        if let Err(e) = art.recipes(&root, file, kind) {
            art.warnings.push(format!("{file}: {e}"));
        }
    }
    if let Err(e) = art.people(&root) {
        art.warnings.push(e);
    }
    if let Err(e) = art.world(&root) {
        art.warnings.push(e);
    }
    if let Err(e) = art.maps(&root) {
        art.warnings.push(format!("World maps: {e}"));
    }
    art.knowledge(&root);
    // Public NPC identity and texture identity differ (e.g. Leo uses ParrotBoy).
    let identities: Vec<(String, String)> = art
        .game_data
        .get("characters")
        .and_then(Value::as_object)
        .into_iter()
        .flatten()
        .filter_map(|(name, data)| {
            data["TextureName"]
                .as_str()
                .map(|texture| (name.clone(), texture.to_owned()))
        })
        .collect();
    for (name, texture) in identities {
        art.alias(
            &format!("character:{name}"),
            &format!("character:{texture}"),
        );
        art.alias(
            &format!("friendship:{name}"),
            &format!("character:{texture}"),
        );
        art.alias(&format!("walking:{name}"), &format!("walking:{texture}"));
        if name != texture {
            let variants: Vec<_> = art
                .characters
                .iter()
                .filter_map(|entry| {
                    let suffix = entry.name.strip_prefix(&texture)?;
                    (suffix.is_empty() || suffix.starts_with('_'))
                        .then(|| (entry.id.clone(), format!("{name}{suffix}")))
                })
                .collect();
            for (old_id, canonical) in variants {
                art.alias(&format!("character:{canonical}"), &old_id);
                art.alias(&format!("friendship:{canonical}"), &old_id);
                if let Some(entry) = art.characters.iter_mut().find(|e| e.id == old_id) {
                    entry.id = format!("character:{canonical}");
                    entry.name = canonical;
                }
            }
        }
    }
    for (id, x) in [("ui:heart-filled", 211), ("ui:heart-empty", 218)] {
        if let Err(e) = art.rectangle(&root, id, "LooseSprites/Cursors", [x, 428, 7, 6]) {
            art.warnings.push(format!("Heart artwork: {e}"));
        }
    }
    for (id, x, y) in [
        ("ui:quality-silver", 338, 400),
        ("ui:quality-gold", 346, 400),
        ("ui:quality-iridium", 346, 392),
    ] {
        if let Err(e) = art.rectangle(&root, id, "LooseSprites/Cursors", [x, y, 8, 8]) {
            art.warnings.push(format!("Quality artwork: {e}"));
        }
    }
    match Artwork::data(&root, "Data/NPCGiftTastes") {
        Ok(data) => {
            if let Some(entries) = data.as_object() {
                for (name, value) in entries {
                    if name.starts_with("Universal_") {
                        continue;
                    }
                    let parts: Vec<_> = value.as_str().unwrap_or("").split('/').collect();
                    let ids = |index: usize| {
                        parts
                            .get(index)
                            .unwrap_or(&"")
                            .split_whitespace()
                            .filter_map(|id| {
                                if id.starts_with('(') {
                                    return art.sprites.contains_key(id).then(|| id.to_owned());
                                }
                                [
                                    "object",
                                    "craftable",
                                    "furniture",
                                    "weapon",
                                    "boots",
                                    "hat",
                                    "pants",
                                    "shirt",
                                    "tool",
                                    "trinket",
                                ]
                                .into_iter()
                                .map(|kind| format!("{kind}:{id}"))
                                .find(|target| art.sprites.contains_key(target))
                            })
                            .collect()
                    };
                    art.gifts.insert(
                        name.into(),
                        GiftTaste {
                            loved: ids(1),
                            liked: ids(3),
                        },
                    );
                }
            }
        }
        Err(e) => art.warnings.push(format!("Gift preferences: {e}")),
    }
    // A 1.5 recipe retired in 1.6, whose output still has the same installed item identity.
    if let Some(item) = art
        .items
        .iter()
        .find(|e| e.kind == "object" && e.name == "Oil of Garlic")
    {
        let id = item.id.clone();
        art.alias("crafting:Oil of Garlic", &id);
    }
    for (category, target) in [
        ("shipping", "object:276"),
        ("fishing", "object:128"),
        ("cooking", "object:236"),
        ("crafting", "crafting:Chest"),
        ("friendship", "character:Robin"),
        ("monster", "monster:Green Slime"),
        ("monsters", "monster:Green Slime"),
        ("skills", "tool:IridiumHoe"),
    ] {
        art.alias(&format!("category:{category}"), target);
    }
    for (group, entity) in [
        ("Slimes", "Green Slime"),
        ("Void Spirits", "Shadow Brute"),
        ("Bats", "Bat"),
        ("Skeletons", "Skeleton"),
        ("Cave Insects", "Bug"),
        ("Duggies", "Duggy"),
        ("Dust Sprites", "Dust Spirit"),
        ("Rock Crabs", "Rock Crab"),
        ("Mummies", "Mummy"),
        ("Pepper Rex", "Pepper Rex"),
        ("Serpents", "Serpent"),
        ("Magma Sprites", "Magma Sprite"),
        ("Flame Spirits", "Magma Sprite"),
    ] {
        art.alias(&format!("monster:{group}"), &format!("monster:{entity}"));
    }
    art.items.sort_by(|a, b| a.name.cmp(&b.name));
    art.translate(&root);
    // Keep private English lookup assets for later language switches; serde never exports them.
    art
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn animal_preview_trims_padding_without_reading_adjacent_frames() {
        let mut texture = xnb::Texture {
            width: 16,
            height: 8,
            pixels: vec![0; 16 * 8 * 4],
        };
        for (x, y) in [(2, 3), (5, 6), (9, 0)] {
            texture.pixels[(y * 16 + x) * 4 + 3] = 255;
        }
        assert_eq!(visible_frame(&texture, [0, 0, 8, 8]), Some([2, 3, 4, 4]));
        assert_eq!(visible_frame(&texture, [0, 0, 2, 2]), None);
        assert_eq!(visible_frame(&texture, [15, 0, 8, 8]), None);
    }
    #[test]
    fn preview_rectangles_do_not_include_adjacent_animation_frames() {
        assert_eq!(animal_frame("horse", &serde_json::json!({}), 224), (32, 32));
        assert_eq!(monster_size("Big Slime", 128, 64), (32, 32));
        let animal = serde_json::json!({"Custom":{"Texture":"Animals\\Custom", "SpriteWidth":16,"SpriteHeight":24}});
        assert_eq!(animal_frame("Custom", &animal, 128), (16, 24));
        let building = serde_json::json!({"SourceRect":{"X":0,"Y":160,"Width":112,"Height":160}});
        assert_eq!(building_rectangle(&building, 112, 320), [0, 160, 112, 160]);
        assert_eq!(
            building_rectangle(&serde_json::json!({}), 48, 96),
            [0, 0, 48, 96]
        );
    }
    #[test]
    fn monster_previews_use_complete_visible_frames() {
        assert_eq!(monster_frame("Bat_dangerous", 64, 112), [16, 0, 16, 32]);
        assert_eq!(monster_frame("Duggy", 64, 95), [0, 32, 16, 16]);
        assert_eq!(monster_frame("Hot Head", 64, 144), [0, 0, 16, 16]);
        assert_eq!(monster_frame("Blue Squid", 120, 64), [0, 0, 24, 24]);
        assert_eq!(monster_frame("Shadow Shaman", 64, 120), [0, 0, 16, 24]);
        assert_eq!(monster_frame("Shadow Sniper", 128, 160), [0, 0, 32, 32]);
        assert_eq!(monster_frame("Tiger Slime", 64, 264), [0, 0, 16, 24]);
        assert_eq!(monster_frame("Squid Kid", 64, 96), [0, 0, 16, 16]);
        assert_eq!(monster_frame("Royal Serpent", 160, 96), [0, 0, 32, 32]);
        assert_eq!(monster_frame("Lava Lurk", 64, 32), [16, 16, 16, 16]);
    }
    #[test]
    fn preview_layers_composite_without_overwriting_transparent_pixels() {
        let mut target = xnb::Texture {
            width: 2,
            height: 1,
            pixels: vec![50, 100, 150, 255, 0, 0, 0, 0],
        };
        let source = xnb::Texture {
            width: 2,
            height: 1,
            pixels: vec![0, 0, 0, 0, 255, 0, 0, 255],
        };
        blit_preview(&mut target, &source, [0, 0, 2, 1], [0, 0]).unwrap();
        assert_eq!(target.pixels, vec![50, 100, 150, 255, 255, 0, 0, 255]);
        assert!(blit_preview(&mut target, &source, [1, 0, 2, 1], [0, 0]).is_err());
        assert!(!visible_pixels(&source, [0, 0, 1, 1]));
        assert!(visible_pixels(&source, [1, 0, 1, 1]));
    }
    #[test]
    fn rejects_arbitrary_directories_and_traversal() {
        let dir = tempfile::tempdir().unwrap();
        assert!(validate_root(dir.path()).is_err());
        assert!(content_path(dir.path(), "../private").is_err());
        assert!(content_path(dir.path(), "C:/private").is_err());
    }
    #[test]
    fn no_installation_has_no_invented_artwork() {
        let art = load(None);
        assert!(art.sheets.is_empty());
        assert!(art.items.is_empty());
        assert!(art.root.is_none());
    }
}
