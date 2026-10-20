//! Bounded read-only tBIN10 parsing. Format reference: Casey Warrington's MIT TBIN library.
use super::*;
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TileMap {
    pub width: usize,
    pub height: usize,
    pub tile_width: usize,
    pub tile_height: usize,
    pub layers: Vec<Layer>,
    pub sheets: Vec<MapSheet>,
    pub properties: BTreeMap<String, Value>,
    pub images: BTreeMap<String, Sheet>,
    pub walkable: Vec<bool>,
}
#[derive(Clone, Serialize)]
pub struct Layer {
    pub name: String,
    pub width: usize,
    pub height: usize,
    pub tiles: Vec<Option<Tile>>,
}
#[derive(Clone, Serialize)]
pub struct Tile {
    pub sheet: usize,
    pub index: usize,
    pub properties: BTreeMap<String, Value>,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MapSheet {
    pub id: String,
    pub image: String,
    pub columns: usize,
    pub rows: usize,
    pub tile_width: usize,
    pub tile_height: usize,
    pub margin: [usize; 2],
    pub spacing: [usize; 2],
    pub properties: BTreeMap<String, Value>,
}
struct Input<'a> {
    b: &'a [u8],
    p: usize,
}
impl<'a> Input<'a> {
    fn take(&mut self, n: usize) -> Result<&'a [u8], String> {
        let end = self.p.checked_add(n).ok_or("Map offset overflow")?;
        let v = self.b.get(self.p..end).ok_or("Truncated tile map")?;
        self.p = end;
        Ok(v)
    }
    fn byte(&mut self) -> Result<u8, String> {
        Ok(self.take(1)?[0])
    }
    fn int(&mut self) -> Result<i32, String> {
        Ok(i32::from_le_bytes(self.take(4)?.try_into().unwrap()))
    }
    fn count(&mut self, max: usize) -> Result<usize, String> {
        let n = self.int()?;
        if n < 0 || n as usize > max {
            return Err("Map collection exceeds limit".into());
        }
        Ok(n as usize)
    }
    fn string(&mut self) -> Result<String, String> {
        let n = self.count(65536)?;
        String::from_utf8(self.take(n)?.to_vec()).map_err(|e| e.to_string())
    }
    fn properties(&mut self) -> Result<BTreeMap<String, Value>, String> {
        let mut map = BTreeMap::new();
        for _ in 0..self.count(100_000)? {
            let key = self.string()?;
            let value = match self.byte()? {
                0 => Value::Bool(self.byte()? != 0),
                1 => Value::from(self.int()?),
                2 => serde_json::json!(f32::from_le_bytes(self.take(4)?.try_into().unwrap())),
                3 => Value::String(self.string()?),
                _ => return Err("Unsupported map property type".into()),
            };
            map.insert(key, value);
        }
        Ok(map)
    }
    fn tile(&mut self, sheet: usize) -> Result<Tile, String> {
        let index = self.count(100_000)?;
        self.byte()?;
        Ok(Tile {
            sheet,
            index,
            properties: self.properties()?,
        })
    }
}
pub fn parse(bytes: &[u8]) -> Result<TileMap, String> {
    let mut r = Input { b: bytes, p: 0 };
    if r.take(6)? != b"tBIN10" {
        return Err("Unsupported installed map format".into());
    }
    r.string()?;
    r.string()?;
    let properties = r.properties()?;
    let mut sheets = vec![];
    for _ in 0..r.count(64)? {
        let id = r.string()?;
        r.string()?;
        let image = r.string()?;
        let columns = r.count(1024)?;
        let rows = r.count(1024)?;
        let tile_width = r.count(256)?;
        let tile_height = r.count(256)?;
        let margin = [r.count(256)?, r.count(256)?];
        let spacing = [r.count(256)?, r.count(256)?];
        if columns == 0 || rows == 0 || tile_width == 0 || tile_height == 0 {
            return Err("Invalid map sheet dimensions".into());
        }
        sheets.push(MapSheet {
            id,
            image,
            columns,
            rows,
            tile_width,
            tile_height,
            margin,
            spacing,
            properties: r.properties()?,
        });
    }
    let lookup: BTreeMap<String, usize> = sheets
        .iter()
        .enumerate()
        .map(|(i, s)| (s.id.clone(), i))
        .collect();
    let mut layers = vec![];
    let (mut width, mut height, mut tile_width, mut tile_height) = (0, 0, 0, 0);
    let mut total = 0usize;
    for _ in 0..r.count(32)? {
        let name = r.string()?;
        let visible = r.byte()? != 0;
        r.string()?;
        let w = r.count(256)?;
        let h = r.count(256)?;
        let tw = r.count(64)?;
        let th = r.count(64)?;
        if w * tw > 4096 || h * th > 4096 {
            return Err("Map pixel dimensions exceed the limit".into());
        }
        r.properties()?;
        if w == 0 || h == 0 || tw == 0 || th == 0 {
            return Err("Invalid map layer dimensions".into());
        }
        total += w * h;
        if total > 1_000_000 {
            return Err("Map tile limit exceeded".into());
        }
        if width == 0 {
            (width, height, tile_width, tile_height) = (w, h, tw, th);
        }
        let mut tiles = vec![None; w * h];
        let mut sheet = 0;
        for y in 0..h {
            let mut x = 0;
            let mut commands = 0;
            while x < w {
                commands += 1;
                if commands > w * 10 + 100 {
                    return Err("Too many map commands".into());
                }
                match r.byte()? {
                    b'T' => {
                        sheet = *lookup.get(&r.string()?).ok_or("Unknown tile sheet")?;
                    }
                    b'N' => {
                        let n = r.count(w)?;
                        if n == 0 || x + n > w {
                            return Err("Invalid empty tile run".into());
                        }
                        x += n;
                    }
                    b'S' => {
                        let tile = r.tile(sheet)?;
                        if tile.sheet >= sheets.len()
                            || tile.index >= sheets[tile.sheet].columns * sheets[tile.sheet].rows
                        {
                            return Err("Tile is outside its sheet".into());
                        }
                        tiles[y * w + x] = Some(tile);
                        x += 1;
                    }
                    b'A' => {
                        r.count(1_000_000)?;
                        let count = r.count(128)?;
                        let mut first = None;
                        let mut frame_sheet = sheet;
                        let mut read = 0;
                        let mut operations = 0;
                        while read < count {
                            operations += 1;
                            if operations > count * 4 + 64 {
                                return Err("Invalid tile animation".into());
                            }
                            match r.byte()? {
                                b'T' => {
                                    frame_sheet = *lookup
                                        .get(&r.string()?)
                                        .ok_or("Unknown animation sheet")?
                                }
                                b'S' => {
                                    let tile = r.tile(frame_sheet)?;
                                    if tile.sheet >= sheets.len()
                                        || tile.index
                                            >= sheets[tile.sheet].columns * sheets[tile.sheet].rows
                                    {
                                        return Err("Animation frame outside sheet".into());
                                    }
                                    if first.is_none() {
                                        first = Some(tile);
                                    }
                                    read += 1;
                                }
                                _ => return Err("Unsupported animated map tile".into()),
                            }
                        }
                        r.properties()?;
                        tiles[y * w + x] = first;
                        x += 1;
                    }
                    _ => return Err("Unsupported tile map command".into()),
                }
            }
        }
        if visible && !matches!(name.as_str(), "Paths" | "Paths2") {
            layers.push(Layer {
                name,
                width: w,
                height: h,
                tiles,
            });
        }
    }
    if width == 0 || height == 0 || sheets.is_empty() {
        return Err("Map has no drawable grid".into());
    }
    let mut walkable = vec![false; width * height];
    let has_property = |tile: &Tile, key: &str| {
        tile.properties.contains_key(key)
            || sheets[tile.sheet]
                .properties
                .contains_key(&format!("@TileIndex@{}@{key}", tile.index))
    };
    for layer in &layers {
        if layer.width != width || layer.height != height {
            continue;
        }
        for (i, tile) in layer.tiles.iter().enumerate() {
            match (layer.name.as_str(), tile) {
                ("Back", Some(t)) => walkable[i] = !has_property(t, "Water"),
                ("Buildings", Some(t)) if !has_property(t, "Passable") => {
                    walkable[i] = false;
                }
                _ => (),
            }
        }
    }
    Ok(TileMap {
        width,
        height,
        tile_width,
        tile_height,
        layers,
        sheets,
        properties,
        images: BTreeMap::new(),
        walkable,
    })
}
pub fn load(root: &Path, location: &str, season: &str) -> Result<TileMap, String> {
    if location.is_empty()
        || location.len() > 80
        || !location
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | ' ' | '/' | '-'))
        || location.split('/').any(|s| s.is_empty())
    {
        return Err("Invalid map identity".into());
    }
    if !["spring", "summer", "fall", "winter"].contains(&season) {
        return Err("Invalid map season".into());
    }
    let locations = Artwork::data(root, "Data/Locations")?;
    let building_asset = if let Some(kind) = location.strip_prefix("Building/") {
        let buildings = Artwork::data(root, "Data/Buildings")?;
        let indoor = buildings[kind]["IndoorMap"]
            .as_str()
            .ok_or("This building has no confirmed original interior map")?;
        Some(format!("Maps/{indoor}"))
    } else {
        None
    };
    let asset = building_asset
        .or_else(|| {
            locations[location]["CreateOnLoad"]["MapPath"]
                .as_str()
                .map(str::to_owned)
        })
        .unwrap_or_else(|| format!("Maps/{location}"));
    let bytes = Xnb::open(&content_path(root, &asset)?)?.map_bytes()?;
    let mut map = parse(&bytes)?;
    let normalized_asset = asset.replace('\\', "/");
    let map_folder = normalized_asset
        .rsplit_once('/')
        .map(|(p, _)| p)
        .unwrap_or("Maps");
    for sheet in &mut map.sheets {
        let name = sheet
            .image
            .rsplit(['\\', '/'])
            .next()
            .unwrap_or("")
            .trim_end_matches(".png")
            .trim_end_matches(".xnb");
        let seasonal = if let Some(suffix) = name.strip_prefix("spring_") {
            format!("{season}_{suffix}")
        } else {
            name.into()
        };
        let original = sheet.image.replace('\\', "/");
        let mut components = vec!["Maps"];
        for part in original.split('/') {
            match part {
                "" | "." => (),
                ".." => {
                    components.pop().ok_or("Map image leaves Content")?;
                }
                _ => components.push(part),
            }
        }
        if matches!(components.get(1), Some(&"Maps" | &"TileSheets")) {
            components.remove(0);
        }
        let mut asset = components.join("/");
        asset = asset
            .trim_end_matches(".png")
            .trim_end_matches(".xnb")
            .to_owned();
        let folder = asset.rsplit_once('/').map(|(p, _)| p).unwrap_or("Maps");
        let candidates = [
            format!("{map_folder}/{seasonal}"),
            format!("{folder}/{seasonal}"),
            format!("Maps/{seasonal}"),
            format!("TileSheets/{seasonal}"),
            asset,
        ];
        let mut decoded = None;
        for candidate in candidates {
            if let Ok(path) = content_path(root, &candidate)
                && let Ok(texture) = Xnb::open(&path).and_then(|mut x| x.texture())
            {
                decoded = Some(texture);
                break;
            }
        }
        let texture =
            decoded.ok_or_else(|| format!("Unable to decode installed map sheet {name}"))?;
        let png = texture.png()?;
        sheet.image = seasonal.clone();
        if map.images.values().map(|i| i.url.len()).sum::<usize>() + png.len() * 4 / 3
            > 48 * 1024 * 1024
        {
            return Err("Map artwork memory limit exceeded".into());
        }
        map.images.insert(
            seasonal,
            Sheet {
                url: format!("data:image/png;base64,{}", STANDARD.encode(png)),
                width: texture.width,
                height: texture.height,
            },
        );
    }
    Ok(map)
}
#[cfg(test)]
mod tests {
    use super::*;
    fn int(b: &mut Vec<u8>, n: i32) {
        b.extend(n.to_le_bytes());
    }
    fn string(b: &mut Vec<u8>, s: &str) {
        int(b, s.len() as i32);
        b.extend(s.as_bytes());
    }
    fn static_tile(b: &mut Vec<u8>, index: i32) {
        b.push(b'S');
        int(b, index);
        b.push(0);
        int(b, 0);
    }
    #[test]
    fn decodes_tiles_empty_runs_animation_and_water_collision() {
        let mut b = b"tBIN10".to_vec();
        string(&mut b, "Test");
        string(&mut b, "");
        int(&mut b, 0);
        int(&mut b, 1);
        string(&mut b, "terrain");
        string(&mut b, "");
        string(&mut b, "test");
        for n in [2, 1, 16, 16, 0, 0, 0, 0] {
            int(&mut b, n);
        }
        int(&mut b, 1);
        string(&mut b, "@TileIndex@1@Water");
        b.push(3);
        string(&mut b, "T");
        int(&mut b, 1);
        string(&mut b, "Back");
        b.push(1);
        string(&mut b, "");
        for n in [3, 1, 16, 16, 0] {
            int(&mut b, n);
        }
        b.push(b'T');
        string(&mut b, "terrain");
        static_tile(&mut b, 0);
        b.push(b'A');
        int(&mut b, 100);
        int(&mut b, 1);
        b.push(b'T');
        string(&mut b, "terrain");
        static_tile(&mut b, 1);
        int(&mut b, 0);
        b.push(b'N');
        int(&mut b, 1);
        let map = parse(&b).unwrap();
        assert_eq!(map.width, 3);
        assert_eq!(map.layers[0].tiles[1].as_ref().unwrap().index, 1);
        assert_eq!(map.walkable, vec![true, false, false]);
        b.truncate(b.len() - 4);
        int(&mut b, 2);
        assert!(parse(&b).is_err());
    }
    #[test]
    fn rejects_truncated_and_oversized_maps() {
        assert!(parse(b"tBIN").is_err());
        let mut bad = b"tBIN10".to_vec();
        bad.extend(i32::MAX.to_le_bytes());
        assert!(parse(&bad).is_err());
    }
}
