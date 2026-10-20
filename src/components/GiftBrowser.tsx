import { localize } from '../lib/locale';
import { translate } from '../lib/locale';
import { useMemo, useState, useEffect } from 'react';
import { allGifts, tasteNames, giftPoints, teaPoints, type Taste } from '../domain/gifts';
import type { Farmer, SaveProfile } from '../domain/models';
import { birthdayDistance, villagerProfiles } from '../domain/social';
import { Sprite, useArtwork } from './Artwork';
export function GiftBrowser({
  name,
  farmer,
  save,
}: {
  name: string;
  farmer: Farmer | null;
  save?: SaveProfile | null;
}) {
  const { data: art } = useArtwork();
  const [taste, setTaste] = useState<Taste>('love'),
    [search, setSearch] = useState(''),
    [bag, setBag] = useState(false),
    [page, setPage] = useState(0);
  const birthday = Boolean(
    save && villagerProfiles[name] && birthdayDistance(villagerProfiles[name], save) === 0,
  );
  const [quality, setQuality] = useState(0),
    [occasion, setOccasion] = useState<'normal' | 'birthday' | 'winter-star'>(
      birthday ? 'birthday' : 'normal',
    );
  const [book, setBook] = useState(
    (farmer?.booksRead?.Book_Friendship ?? farmer?.stats.Book_Friendship ?? 0) > 0,
  );
  useEffect(() => {
    setBook((farmer?.booksRead?.Book_Friendship ?? farmer?.stats.Book_Friendship ?? 0) > 0);
    setOccasion(birthday ? 'birthday' : 'normal');
  }, [farmer?.id, birthday, farmer?.booksRead?.Book_Friendship, farmer?.stats.Book_Friendship]);
  const gifts = useMemo(() => allGifts(name, art), [name, art]);
  const quantity = (id: string) =>
    !farmer?.inventoryKnown || (!id.startsWith('object:') && !id.startsWith('trinket:'))
      ? null
      : (farmer.inventory[id.startsWith('object:') ? id.slice(7) : id] ?? 0);
  const filtered = gifts.filter(
    (g) =>
      g.taste === taste &&
      `${g.name} ${translate(g.name)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
      (!bag || (quantity(g.id) ?? 0) > 0),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 36)),
    current = Math.min(page, pages - 1);
  return localize(
    <section className="full-gift-guide">
      <h3>All gift preferences</h3>
      <p>
        Personal preferences, universal rules, item categories and context tags are combined from
        the installed game.
      </p>
      <div className="taste-tabs" role="group" aria-label="Gift preference">
        {tasteNames.map((t) => (
          <button
            key={t}
            className={`button ${t === taste ? 'primary' : ''} taste-${t}`}
            aria-pressed={t === taste}
            onClick={() => {
              setTaste(t);
              setPage(0);
            }}
          >
            {
              {
                love: 'Loves',
                like: 'Likes',
                neutral: 'Neutral',
                dislike: 'Dislikes',
                hate: 'Hates',
              }[t]
            }{' '}
            <span>{gifts.filter((g) => g.taste === t).length}</span>
          </button>
        ))}
      </div>
      <div className="gift-controls">
        <label>
          Gift quality
          <select
            aria-label="Gift quality"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
          >
            <option value={0}>Normal</option>
            <option value={1}>Silver</option>
            <option value={2}>Gold</option>
            <option value={4}>Iridium</option>
          </select>
        </label>
        <label>
          Gift occasion
          <select
            aria-label="Gift occasion"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value as typeof occasion)}
          >
            <option value="normal">Normal day</option>
            <option value="birthday">Birthday</option>
            <option value="winter-star">Feast of the Winter Star recipient</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={book} onChange={(e) => setBook(e.target.checked)} />
          Friendship 101 read
        </label>
      </div>
      <p className="fine-print">
        Base gift estimate: quality and occasion are selected scenarios. Spouse adjustments and
        special gift rules can change the result.
      </p>
      <div className="gift-controls">
        <input
          aria-label="Search gifts"
          placeholder="Search gifts…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={bag}
            disabled={!farmer?.inventoryKnown}
            onChange={(e) => {
              setBag(e.target.checked);
              setPage(0);
            }}
          />
          In this farmer’s bag
        </label>
      </div>
      <div className="gift-grid">
        {filtered.slice(current * 36, (current + 1) * 36).map((g) => (
          <div className={`gift-choice taste-${taste}`} key={g.id} title={g.reason}>
            <Sprite id={g.id} name={g.name} size={32} decorative />
            <span>
              <strong>{g.name}</strong>
              <small>
                {giftPoints(g.taste, quality, occasion, book) > 0 ? '+' : ''}
                {giftPoints(g.taste, quality, occasion, book)} base friendship points
              </small>
              <small>
                {quantity(g.id) !== null
                  ? `${quantity(g.id)} in this farmer’s bag`
                  : 'Inventory unknown'}{' '}
                · {g.personal ? 'Personal' : 'Universal / default'}
              </small>
            </span>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <p>
          {gifts.length
            ? 'No gifts match these filters.'
            : art.gameData?.giftTastes
              ? 'This character has no normal gift preference record.'
              : 'Connect the game to load complete gift preferences.'}
        </p>
      )}
      {pages > 1 && (
        <div className="gallery-pagination">
          <button className="button" disabled={current === 0} onClick={() => setPage(current - 1)}>
            Previous
          </button>
          <span>
            {current + 1} / {pages}
          </span>
          <button
            className="button"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      )}
      <p className="fine-print">
        These are normal item forms. Quality affects friendship points; special story gifts and
        flavoured products may have additional rules. Hover a gift for the rule used.
      </p>
      <details>
        <summary>Special relationship gifts</summary>
        <p>
          These gifts follow relationship or story rules instead of the normal preference table.
        </p>
        <p>
          Stardrop Tea: +{teaPoints(occasion)} friendship points for this occasion; it does not
          consume the normal gift limit.
        </p>
        <div className="gift-grid">
          {art.items
            .filter((e) =>
              [
                'Bouquet',
                'Wilted Bouquet',
                "Mermaid's Pendant",
                'Void Ghost Pendant',
                'Stardrop Tea',
              ].includes(e.name),
            )
            .map((e) => (
              <div className="gift-choice" key={e.id}>
                <Sprite id={e.id} size={32} decorative />
                <span>
                  <strong>{e.name}</strong>
                  <small>{e.description}</small>
                </span>
              </div>
            ))}
        </div>
      </details>
    </section>,
  );
}
