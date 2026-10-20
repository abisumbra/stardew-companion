import { localize, formatNumber } from '../lib/locale';
import { itemPrices, itemPriceReference } from '../domain/prices';
import type { SaveProfile } from '../domain/models';
import { useArtwork, Sprite } from './Artwork';
import { Sources } from './common';
import { useState } from 'react';
export function PricePreview({ id }: { id: string }) {
  const { data: art } = useArtwork(),
    price = itemPriceReference(id, art);
  if (
    ![
      'object',
      'craftable',
      'weapon',
      'boots',
      'trinket',
      'hat',
      'shirt',
      'pants',
      'furniture',
      'tool',
    ].includes(price.kind)
  )
    return null;
  return localize(
    <small className="price-preview">
      {price.base === null ? (
        price.inputs.length ? (
          'Choose input for price'
        ) : (
          'No shop sale'
        )
      ) : (
        <>
          <span>Base price</span> · {formatNumber(price.base)}g
        </>
      )}
    </small>,
  );
}
export function ItemPrices({
  id,
  save,
  farmerId,
}: {
  id: string;
  save: SaveProfile | null;
  farmerId?: string | null;
}) {
  const { data: art } = useArtwork(),
    [inputId, setInputId] = useState(''),
    price = itemPrices(id, art, save, farmerId, inputId);
  if (
    ![
      'object',
      'craftable',
      'weapon',
      'boots',
      'trinket',
      'hat',
      'shirt',
      'pants',
      'furniture',
      'tool',
    ].includes(price.kind)
  )
    return null;
  return localize(
    <section className="item-prices" aria-label="Item quality and sell prices">
      <h3>Quality & sell price</h3>
      {price.inputs.length > 0 && (
        <label className="price-input-label">
          Input ingredient
          <select
            aria-label="Price input ingredient"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
          >
            <option value="">{price.key === '340' ? 'Wild honey' : 'Choose an ingredient'}</option>
            {price.inputs.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {price.base === null ? (
        <p>{price.reason || 'Price unavailable in the installed data.'}</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Quality</th>
                <th>
                  {['shirt', 'pants', 'furniture'].includes(price.kind)
                    ? 'Reference value'
                    : 'Base sell price'}
                </th>
                {save && <th>Saved farmer estimate</th>}
              </tr>
            </thead>
            <tbody>
              {price.rows.map((q) => (
                <tr key={q.id}>
                  <td>
                    <span className={`quality-star quality-${q.id}`} aria-hidden="true">
                      {q.id &&
                      art.sprites[
                        `ui:quality-${q.id === 1 ? 'silver' : q.id === 2 ? 'gold' : 'iridium'}`
                      ] ? (
                        <Sprite
                          id={`ui:quality-${q.id === 1 ? 'silver' : q.id === 2 ? 'gold' : 'iridium'}`}
                          size={16}
                          decorative
                        />
                      ) : q.id ? (
                        '★'
                      ) : (
                        '●'
                      )}
                    </span>
                    {q.name}
                  </td>
                  <td>
                    {q.available
                      ? q.base === null
                        ? 'Unknown'
                        : `${formatNumber(q.base)}g`
                      : 'Not applicable'}
                  </td>
                  {save && (
                    <td>
                      {q.available && q.adjusted !== null ? `${formatNumber(q.adjusted)}g` : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {price.reason && <p className="fine-print">{price.reason}</p>}
          {save && !price.adjustedKnown && (
            <p className="fine-print">
              Saved profession or profit-margin data is unavailable; base prices remain visible.
            </p>
          )}
          {price.modifiers.length > 0 && <p>{price.modifiers.join(' · ')}</p>}
          {price.margin !== null && (
            <p className="fine-print">
              <span>Profit margin</span> · {Math.round(price.margin * 100)}%
            </p>
          )}
          {save && save.players.length > 1 && (
            <p className="fine-print">
              The estimate uses this farmer. Shared-wallet sales may use another active farmer’s
              bonuses.
            </p>
          )}
        </>
      )}
      <p className="fine-print">
        Sell prices are per item. Shop purchase prices and special orders can differ.
      </p>
      {price.modifiers.includes('Tiller') && price.object?.Category === -79 && (
        <p className="fine-print">
          Assumes farm-grown fruit; foraged fruit may not receive Tiller.
        </p>
      )}
      <Sources
        ids={[
          'wiki-prices-quality',
          'wiki-prices-professions',
          ...([
            '348',
            '350',
            '342',
            '344',
            '447',
            '812',
            'SmokedFish',
            'DriedFruit',
            'DriedMushrooms',
            '340',
          ].includes(price.key)
            ? ['wiki-price-artisan']
            : []),
        ]}
        onError={() => {}}
      />
    </section>,
  );
}
