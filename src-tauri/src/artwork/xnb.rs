//! Read-only, bounded XNB decoding. No managed game code is executed.
use serde_json::{Map, Value, json};
use std::{fs, path::Path};

const LIMIT: usize = 64 * 1024 * 1024;
pub struct Xnb {
    bytes: Vec<u8>,
    pos: usize,
    readers: Vec<String>,
}
impl Xnb {
    pub fn open(path: &Path) -> Result<Self, String> {
        if fs::metadata(path).map_err(|e| e.to_string())?.len() > LIMIT as u64 {
            return Err("XNB exceeds size limit".into());
        }
        Self::from_bytes(&fs::read(path).map_err(|e| e.to_string())?)
    }
    pub fn from_bytes(input: &[u8]) -> Result<Self, String> {
        if input.len() < 10 || &input[..3] != b"XNB" || input[4] != 5 {
            return Err("Unsupported XNB header".into());
        }
        let length = u32::from_le_bytes(input[6..10].try_into().unwrap()) as usize;
        if length != input.len() || length > LIMIT {
            return Err("Invalid XNB file length".into());
        }
        let flags = input[5];
        let bytes = if flags & 0xc0 != 0 {
            if input.len() < 14 {
                return Err("Truncated compressed XNB".into());
            }
            let expected = u32::from_le_bytes(input[10..14].try_into().unwrap()) as usize;
            if expected > LIMIT {
                return Err("XNB decompression limit exceeded".into());
            }
            if flags & 0x80 != 0 {
                let mut decoder = lzxd::Lzxd::new(lzxd::WindowSize::KB64);
                let mut out = Vec::with_capacity(expected);
                let mut pos = 14;
                while out.len() < expected {
                    let header = input.get(pos..pos + 2).ok_or("Truncated LZX frame")?;
                    let (frame, block, header_len) = if header[0] == 0xff {
                        let h = input.get(pos..pos + 5).ok_or("Truncated LZX frame")?;
                        (
                            u16::from_be_bytes([h[1], h[2]]) as usize,
                            u16::from_be_bytes([h[3], h[4]]) as usize,
                            5,
                        )
                    } else {
                        (
                            (expected - out.len()).min(32768),
                            u16::from_be_bytes([header[0], header[1]]) as usize,
                            2,
                        )
                    };
                    pos += header_len;
                    if frame == 0 || frame > 32768 || out.len() + frame > expected {
                        return Err("Invalid LZX frame size".into());
                    }
                    let data = input.get(pos..pos + block).ok_or("Truncated LZX block")?;
                    out.extend_from_slice(
                        decoder
                            .decompress_next(data, frame)
                            .map_err(|e| e.to_string())?,
                    );
                    pos += block;
                }
                out
            } else {
                lz4_flex::block::decompress(&input[14..], expected).map_err(|e| e.to_string())?
            }
        } else {
            input[10..].to_vec()
        };
        let mut x = Self {
            bytes,
            pos: 0,
            readers: vec![],
        };
        let n = x.varint()?;
        if n > 256 {
            return Err("Too many XNB readers".into());
        }
        for _ in 0..n {
            let name = x.string()?;
            x.take(4)?;
            x.readers.push(name);
        }
        if x.varint()? != 0 {
            return Err("Shared XNB resources are unsupported".into());
        }
        Ok(x)
    }
    fn take(&mut self, n: usize) -> Result<&[u8], String> {
        let end = self.pos.checked_add(n).ok_or("XNB offset overflow")?;
        let data = self
            .bytes
            .get(self.pos..end)
            .ok_or_else(|| format!("Truncated XNB at {} ({n} bytes)", self.pos))?;
        self.pos = end;
        Ok(data)
    }
    fn byte(&mut self) -> Result<u8, String> {
        Ok(self.take(1)?[0])
    }
    fn i32(&mut self) -> Result<i32, String> {
        Ok(i32::from_le_bytes(self.take(4)?.try_into().unwrap()))
    }
    fn varint(&mut self) -> Result<usize, String> {
        let mut n = 0usize;
        for shift in (0..35).step_by(7) {
            let b = self.byte()?;
            n |= ((b & 127) as usize) << shift;
            if b < 128 {
                return Ok(n);
            }
        }
        Err("Invalid XNB variable integer".into())
    }
    fn string(&mut self) -> Result<String, String> {
        let n = self.varint()?;
        if n > 1024 * 1024 {
            return Err("XNB string exceeds limit".into());
        }
        String::from_utf8(self.take(n)?.to_vec()).map_err(|e| e.to_string())
    }
    fn count(&mut self) -> Result<usize, String> {
        let n = self.i32()?;
        if !(0..=100_000).contains(&n) {
            return Err("Invalid XNB collection size".into());
        }
        Ok(n as usize)
    }
    pub fn data(&mut self) -> Result<Value, String> {
        let schemas: Value =
            serde_json::from_str(include_str!("schema.json").trim_start_matches('\u{feff}'))
                .map_err(|e| e.to_string())?;
        self.object(&schemas, 0)
    }
    fn object(&mut self, schemas: &Value, depth: usize) -> Result<Value, String> {
        if depth > 32 {
            return Err("XNB nesting exceeds limit".into());
        }
        let index = self.varint()?;
        if index == 0 {
            return Ok(Value::Null);
        }
        let reader = self
            .readers
            .get(index - 1)
            .ok_or("Invalid XNB reader index")?
            .clone();
        let args = generic_args(&reader);
        let kind = reader
            .split(['`', ','])
            .next()
            .unwrap_or("")
            .rsplit('.')
            .next()
            .unwrap_or("");
        match kind {
            "StringReader" => Ok(json!(self.string()?)),
            "DictionaryReader" => {
                let n = self.count()?;
                if args.len() != 2 {
                    return Err("Invalid dictionary reader".into());
                }
                let mut map = Map::new();
                for _ in 0..n {
                    let key = self.typed(&json!(args[0]), schemas, depth + 1)?;
                    let key = key
                        .as_str()
                        .map(str::to_owned)
                        .unwrap_or_else(|| key.to_string());
                    map.insert(key, self.typed(&json!(args[1]), schemas, depth + 1)?);
                }
                Ok(Value::Object(map))
            }
            "ListReader" | "ArrayReader" => {
                let n = self.count()?;
                let arg = args.first().ok_or("Invalid list reader")?;
                (0..n)
                    .map(|_| self.typed(&json!(arg), schemas, depth + 1))
                    .collect::<Result<Vec<_>, _>>()
                    .map(Value::Array)
            }
            "ReflectiveReader" => self.reflect(
                args.first().ok_or("Invalid reflective reader")?,
                schemas,
                depth + 1,
            ),
            "Int32Reader" | "EnumReader" => Ok(json!(self.i32()?)),
            "BooleanReader" => Ok(json!(self.byte()? != 0)),
            _ => Err(format!("Unsupported XNB reader: {kind}")),
        }
    }
    fn reflect(&mut self, name: &str, schemas: &Value, depth: usize) -> Result<Value, String> {
        if depth > 32 {
            return Err("XNB nesting exceeds limit".into());
        }
        let schema = schemas
            .get(name)
            .ok_or_else(|| format!("Unsupported game data schema: {name}"))?;
        let mut out = if let Some(base) = schema["base"].as_str() {
            self.reflect(base, schemas, depth + 1)?
                .as_object()
                .cloned()
                .unwrap_or_default()
        } else {
            Map::new()
        };
        for field in schema["members"].as_array().ok_or("Invalid field schema")? {
            let name = field["name"].as_str().ok_or("Invalid field name")?;
            let val = self
                .typed(&field["type"], schemas, depth + 1)
                .map_err(|e| format!("{name}: {e}"))?;
            out.insert(name.into(), val);
        }
        Ok(Value::Object(out))
    }
    fn typed(&mut self, ty: &Value, schemas: &Value, depth: usize) -> Result<Value, String> {
        let name = ty.as_str().unwrap_or("");
        match name.strip_prefix("System.").unwrap_or(name) {
            "Int32" | "enum" => Ok(json!(self.i32()?)),
            "Boolean" => Ok(json!(self.byte()? != 0)),
            "Int64" => Ok(json!(i64::from_le_bytes(self.take(8)?.try_into().unwrap()))),
            "Point" | "Microsoft.Xna.Framework.Point" => {
                Ok(json!({"X":self.i32()?, "Y":self.i32()?}))
            }
            "Vector2" | "Microsoft.Xna.Framework.Vector2" => Ok(
                json!({"X":f32::from_le_bytes(self.take(4)?.try_into().unwrap()), "Y":f32::from_le_bytes(self.take(4)?.try_into().unwrap())}),
            ),
            "Color" | "Microsoft.Xna.Framework.Color" => Ok(json!(self.take(4)?.to_vec())),
            "Rectangle" | "Microsoft.Xna.Framework.Rectangle" => Ok(json!({
                "X": self.i32()?, "Y": self.i32()?,
                "Width": self.i32()?, "Height": self.i32()?
            })),
            "Single" => Ok(json!(f32::from_le_bytes(self.take(4)?.try_into().unwrap()))),
            "Double" => Ok(json!(f64::from_le_bytes(self.take(8)?.try_into().unwrap()))),
            _ if ty["kind"] == "Nullable" => {
                if self.byte()? == 0 {
                    Ok(Value::Null)
                } else {
                    self.typed(&ty["args"][0], schemas, depth + 1)
                }
            }
            _ if schemas[name]["kind"] == "enum" => Ok(json!(self.i32()?)),
            _ => self.object(schemas, depth + 1),
        }
    }
    pub fn texture(&mut self) -> Result<Texture, String> {
        let reader = self.varint()?;
        if reader == 0
            || !self
                .readers
                .get(reader - 1)
                .is_some_and(|r| r.contains("Texture2DReader"))
        {
            return Err("Expected Texture2D XNB".into());
        }
        let format = self.i32()?;
        let width = self.i32()?;
        let height = self.i32()?;
        let levels = self.i32()?;
        if format != 0 {
            return Err(format!("Unsupported texture surface format {format}"));
        }
        if width <= 0 || height <= 0 || width > 8192 || height > 8192 || levels < 1 {
            return Err("Invalid texture dimensions".into());
        }
        let length = self.i32()?;
        let expected = (width as usize)
            .checked_mul(height as usize)
            .and_then(|n| n.checked_mul(4))
            .ok_or("Texture size overflow")?;
        if length as usize != expected || expected > LIMIT {
            return Err("Invalid texture byte count".into());
        }
        let mut pixels = self.take(expected)?.to_vec();
        // XNA stores premultiplied RGBA; PNG and CSS expect straight alpha.
        for p in pixels.as_chunks_mut::<4>().0 {
            if p[3] != 0 && p[3] != 255 {
                for c in 0..3 {
                    p[c] = ((p[c] as u32 * 255 + p[3] as u32 / 2) / p[3] as u32).min(255) as u8;
                }
            }
        }
        Ok(Texture {
            width: width as u32,
            height: height as u32,
            pixels,
        })
    }
    pub fn map_bytes(&mut self) -> Result<Vec<u8>, String> {
        let reader = self.varint()?;
        if reader == 0
            || !self
                .readers
                .get(reader - 1)
                .is_some_and(|s| s.contains("TideReader"))
        {
            return Err("Expected an installed tile-map asset".into());
        }
        let n = self.i32()?;
        if n < 0 || n as usize > LIMIT {
            return Err("Tile map exceeds size limit".into());
        }
        Ok(self.take(n as usize)?.to_vec())
    }
}
pub struct Texture {
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<u8>,
}
impl Texture {
    pub fn png(&self) -> Result<Vec<u8>, String> {
        let mut out = vec![];
        {
            let mut encoder = png::Encoder::new(&mut out, self.width, self.height);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder.write_header().map_err(|e| e.to_string())?;
            writer
                .write_image_data(&self.pixels)
                .map_err(|e| e.to_string())?;
        }
        Ok(out)
    }
}
fn generic_args(reader: &str) -> Vec<String> {
    let Some(start) = reader.find("[[") else {
        return vec![];
    };
    let bytes = reader.as_bytes();
    let mut depth = 0;
    let mut from = start + 2;
    let mut result = vec![];
    for i in start + 2..bytes.len() {
        match bytes[i] {
            b'[' => depth += 1,
            b']' if depth > 0 => depth -= 1,
            b']' => {
                let arg = &reader[from..i];
                let mut nested = 0;
                let end = arg
                    .char_indices()
                    .find_map(|(j, c)| {
                        match c {
                            '[' => nested += 1,
                            ']' => nested -= 1,
                            ',' if nested == 0 => return Some(j),
                            _ => {}
                        };
                        None
                    })
                    .unwrap_or(arg.len());
                result.push(arg[..end].into());
                if bytes.get(i + 1) == Some(&b']') {
                    break;
                }
                from = i + 3;
            }
            _ => {}
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture(payload: &[u8], reader: &str) -> Vec<u8> {
        let mut content = vec![1, reader.len() as u8];
        content.extend(reader.as_bytes());
        content.extend([0; 4]);
        content.extend([0, 1]);
        content.extend(payload);
        let mut bytes = b"XNBw\x05\0".to_vec();
        bytes.extend(((content.len() + 10) as u32).to_le_bytes());
        bytes.extend(content);
        bytes
    }
    #[test]
    fn decodes_rgba_and_unpremultiplies() {
        let mut p = vec![];
        for n in [0i32, 1, 1, 1, 4] {
            p.extend(n.to_le_bytes());
        }
        p.extend([64, 32, 0, 128]);
        let t = Xnb::from_bytes(&fixture(&p, "Texture2DReader"))
            .unwrap()
            .texture()
            .unwrap();
        assert_eq!(t.pixels, [128, 64, 0, 128]);
        assert_eq!(&t.png().unwrap()[..8], b"\x89PNG\r\n\x1a\n");
    }
    #[test]
    fn rejects_truncation_and_bombs() {
        assert!(Xnb::from_bytes(b"XNB").is_err());
        let mut b = b"XNBw\x05\x80".to_vec();
        b.extend(14u32.to_le_bytes());
        b.extend(u32::MAX.to_le_bytes());
        assert!(Xnb::from_bytes(&b).is_err());
        let p = fixture(&[], "Texture2DReader");
        assert!(Xnb::from_bytes(&p).unwrap().texture().is_err());
    }
    #[test]
    fn parses_nested_generic_types() {
        assert_eq!(
            generic_args("DictionaryReader`2[[System.String, mscorlib],[Foo, Game]], Xna"),
            vec!["System.String", "Foo"]
        );
        assert_eq!(
            generic_args(
                "ListReader`1[[System.Nullable`1[[System.Int32, mscorlib]], mscorlib]], Xna"
            ),
            vec!["System.Nullable`1[[System.Int32, mscorlib]]"]
        );
    }
    #[test]
    fn reads_inline_world_map_rectangles_and_nullable_rectangles() {
        let schema = json!({});
        let mut x = Xnb {
            bytes: [28i32, 81, 19, 10]
                .into_iter()
                .flat_map(i32::to_le_bytes)
                .collect(),
            pos: 0,
            readers: vec![],
        };
        assert_eq!(
            x.typed(&json!("Rectangle"), &schema, 0).unwrap(),
            json!({"X":28,"Y":81,"Width":19,"Height":10})
        );
        assert!(x.typed(&json!("Rectangle"), &schema, 0).is_err());
        let nullable = json!({"kind":"Nullable","args":["Rectangle"]});
        x.bytes = vec![0];
        x.pos = 0;
        assert_eq!(x.typed(&nullable, &schema, 0).unwrap(), Value::Null);
        x.bytes = vec![1];
        x.bytes
            .extend([1i32, 2, 3, 4].into_iter().flat_map(i32::to_le_bytes));
        x.pos = 0;
        assert_eq!(x.typed(&nullable, &schema, 0).unwrap()["Width"], 3);
    }
    fn encoded_string(out: &mut Vec<u8>, s: &str) {
        let mut n = s.len();
        while n >= 128 {
            out.push((n as u8 & 127) | 128);
            n >>= 7;
        }
        out.push(n as u8);
        out.extend(s.as_bytes());
    }
    #[test]
    fn reads_recipe_dictionary_and_lz4_frames() {
        let mut content = vec![2];
        encoded_string(
            &mut content,
            "Microsoft.Xna.Framework.Content.DictionaryReader`2[[System.String, mscorlib],[System.String, mscorlib]], Xna",
        );
        content.extend([0; 4]);
        encoded_string(
            &mut content,
            "Microsoft.Xna.Framework.Content.StringReader, Xna",
        );
        content.extend([0; 4]);
        content.extend([0, 1]);
        content.extend(1i32.to_le_bytes());
        content.push(2);
        encoded_string(&mut content, "Synthetic Chest");
        content.push(2);
        encoded_string(&mut content, "388 50/Home/130/true/l 0");
        let compressed = lz4_flex::block::compress(&content);
        let mut bytes = b"XNBw\x05\x40".to_vec();
        bytes.extend(((compressed.len() + 14) as u32).to_le_bytes());
        bytes.extend((content.len() as u32).to_le_bytes());
        bytes.extend(compressed);
        let value = Xnb::from_bytes(&bytes).unwrap().data().unwrap();
        assert_eq!(value["Synthetic Chest"], "388 50/Home/130/true/l 0");
    }
    #[test]
    fn rejects_invalid_texture_format_dimensions_and_frame_lengths() {
        for dims in [
            [1i32, 1, 1, 1, 4],
            [0, 0, 1, 1, 4],
            [0, 8193, 1, 1, 4],
            [0, 1, 1, 1, 100],
        ] {
            let p: Vec<u8> = dims.into_iter().flat_map(i32::to_le_bytes).collect();
            assert!(
                Xnb::from_bytes(&fixture(&p, "Texture2DReader"))
                    .unwrap()
                    .texture()
                    .is_err()
            );
        }
        let mut bytes = b"XNBw\x05\x80".to_vec();
        bytes.extend(16u32.to_le_bytes());
        bytes.extend(10u32.to_le_bytes());
        bytes.extend([0xff, 0]);
        assert!(Xnb::from_bytes(&bytes).is_err());
    }
}
