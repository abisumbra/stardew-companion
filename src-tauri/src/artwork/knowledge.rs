use super::*;
impl Artwork {
    pub(super) fn knowledge(&mut self, root: &Path) {
        if let Ok(schema) = serde_json::from_str::<Value>(
            include_str!("schema.json").trim_start_matches('\u{feff}'),
        ) {
            let enums: serde_json::Map<String, Value> = schema
                .as_object()
                .into_iter()
                .flatten()
                .filter(|(_, v)| v["kind"] == "enum")
                .map(|(k, v)| {
                    (
                        k.rsplit('.').next().unwrap_or(k).into(),
                        v["values"].clone(),
                    )
                })
                .collect();
            self.game_data.insert("enums".into(), Value::Object(enums));
        }
        for (key, asset) in [
            ("characters", "Data/Characters"),
            ("achievements", "Data/Achievements"),
            ("monsters", "Data/Monsters"),
            ("monsterGoals", "Data/MonsterSlayerQuests"),
            ("objects", "Data/Objects"),
            ("bigCraftables", "Data/BigCraftables"),
            ("weapons", "Data/Weapons"),
            ("boots", "Data/Boots"),
            ("shirts", "Data/Shirts"),
            ("pants", "Data/Pants"),
            ("hats", "Data/hats"),
            ("furniture", "Data/Furniture"),
            ("crops", "Data/Crops"),
            ("locations", "Data/Locations"),
            ("buildings", "Data/Buildings"),
            ("quests", "Data/Quests"),
            ("bundles", "Data/Bundles"),
            ("mail", "Data/mail"),
            ("giftTastes", "Data/NPCGiftTastes"),
            ("shops", "Data/Shops"),
            ("trinkets", "Data/Trinkets"),
            ("tvRecipes", "Data/TV/CookingChannel"),
            ("specialOrders", "Data/SpecialOrders"),
            ("farmAnimals", "Data/FarmAnimals"),
            ("machines", "Data/Machines"),
            ("fish", "Data/Fish"),
            ("fruitTrees", "Data/FruitTrees"),
            ("festivalDates", "Data/Festivals/FestivalDates"),
        ] {
            match Self::data(root, asset) {
                Ok(mut data) => {
                    self.resolve_text(root, &mut data);
                    self.game_data.insert(key.into(), data);
                }
                Err(e) => self.warnings.push(format!("{asset}: {e}")),
            }
        }
        if let Some(characters) = self.game_data.get("characters").and_then(Value::as_object) {
            let names: Vec<_> = characters.keys().cloned().collect();
            for name in names {
                let asset = format!("Characters/schedules/{name}");
                if content_path(root, &asset).is_ok() {
                    match Self::data(root, &asset) {
                        Ok(data) => {
                            self.schedules.insert(name, data);
                        }
                        Err(e) => self.warnings.push(format!("Schedule {name}: {e}")),
                    }
                }
            }
        }
        if let Ok(files) = fs::read_dir(root.join("Content/Data/Events")) {
            for file in files
                .flatten()
                .filter(|file| {
                    file.path()
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .is_some_and(|s| !s.contains('.'))
                })
                .take(256)
            {
                let path = file.path();
                if path.extension().and_then(|s| s.to_str()) != Some("xnb") {
                    continue;
                }
                let Some(location) = path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .filter(|s| !s.contains('.'))
                else {
                    continue;
                };
                let Ok(data) = Self::data(root, &format!("Data/Events/{location}")) else {
                    continue;
                };
                for (key, _) in data.as_object().into_iter().flatten().take(4000) {
                    let mut parts = key.split('/');
                    let id = parts.next().unwrap_or_default();
                    let conditions: Vec<String> = parts.map(str::to_owned).collect();
                    for condition in &conditions {
                        let tokens: Vec<_> = condition.split_whitespace().collect();
                        if !matches!(tokens.first(), Some(&"f" | &"Friendship")) {
                            continue;
                        }
                        for pair in tokens[1..].as_chunks::<2>().0 {
                            let Ok(points) = pair[1].parse::<u32>() else {
                                continue;
                            };
                            self.events
                                .entry(pair[0].into())
                                .or_default()
                                .push(EventReference {
                                    id: id.into(),
                                    location: location.into(),
                                    friendship_points: points,
                                    conditions: conditions.clone(),
                                });
                        }
                    }
                }
            }
        }
    }
    fn resolve_text(&mut self, root: &Path, value: &mut Value) {
        match value {
            Value::String(s) if s.starts_with("[LocalizedText ") => {
                *s = self.display_name(root, Some(s), s);
            }
            Value::String(s)
                if s.starts_with('[')
                    && s.ends_with(']')
                    && s[1..s.len() - 1]
                        .chars()
                        .all(|c| c.is_ascii_alphanumeric() || c == '_') =>
            {
                let token = format!(
                    "[LocalizedText Strings\\SpecialOrderStrings:{}]",
                    &s[1..s.len() - 1]
                );
                *s = self.display_name(root, Some(&token), s);
            }
            Value::Array(items) => {
                for v in items {
                    self.resolve_text(root, v);
                }
            }
            Value::Object(map) => {
                for v in map.values_mut() {
                    self.resolve_text(root, v);
                }
            }
            _ => (),
        }
    }
    pub(super) fn translate(&mut self, root: &Path) {
        self.translations = self.language_dictionary(root, "tr").unwrap_or_default();
    }
    pub fn language_dictionary(
        &self,
        root: &Path,
        language: &str,
    ) -> Result<BTreeMap<String, String>, String> {
        let suffix = match language {
            "en" => return Ok(BTreeMap::new()),
            "de" => "de-DE",
            "es" => "es-ES",
            "fr" => "fr-FR",
            "hu" => "hu-HU",
            "it" => "it-IT",
            "ja" => "ja-JP",
            "ko" => "ko-KR",
            "pt" => "pt-BR",
            "ru" => "ru-RU",
            "tr" => "tr-TR",
            "zh" => "zh-CN",
            _ => return Err("Unsupported game language".into()),
        };
        let mut translations = BTreeMap::new();
        for (file, english) in &self.text {
            if let Ok(turkish) = Self::data(root, &format!("{file}.{suffix}")) {
                for (key, text) in english.as_object().into_iter().flatten() {
                    if let (Some(en), Some(tr)) = (text.as_str(), turkish[key].as_str())
                        && !en.is_empty()
                        && en != tr
                    {
                        translations.insert(en.into(), tr.into());
                    }
                }
            }
        }
        // Legacy slash-delimited assets put display text next to machine-readable fields.
        // Only import known display fields, never conditions, IDs or script commands.
        for (key, file, fields) in [
            ("achievements", "Data/Achievements", &[0usize, 1][..]),
            ("quests", "Data/Quests", &[1usize, 2, 3][..]),
            ("monsters", "Data/Monsters", &[14usize][..]),
            ("bundles", "Data/Bundles", &[0usize][..]),
            ("hats", "Data/hats", &[1usize, 5][..]),
            ("boots", "Data/Boots", &[1usize, 6][..]),
            ("furniture", "Data/Furniture", &[7usize][..]),
        ] {
            if let (Some(english), Ok(turkish)) = (
                self.game_data
                    .get(key)
                    .cloned()
                    .or_else(|| Self::data(root, file).ok()),
                Self::data(root, &format!("{file}.{suffix}")),
            ) {
                for (id, raw) in english.as_object().into_iter().flatten() {
                    if let (Some(en), Some(tr)) = (raw.as_str(), turkish[id].as_str()) {
                        let a: Vec<_> = en.split('/').collect();
                        let b: Vec<_> = tr.split('/').collect();
                        for field in fields {
                            if let (Some(en), Some(tr)) = (a.get(*field), b.get(*field))
                                && !en.is_empty()
                                && en != tr
                            {
                                translations.insert((*en).into(), (*tr).into());
                            }
                        }
                    }
                }
            }
        }
        Ok(translations)
    }
}
