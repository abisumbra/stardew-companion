import { ExternalLink } from 'lucide-react';
import { localize } from '../lib/locale';
import { sourceLink } from '../lib/backend';
import { wikiReference } from '../domain/wiki';
import { useArtwork } from './Artwork';
export function WikiLink({
  id,
  name,
  onError,
}: {
  id: string;
  name: string;
  onError: (e: unknown) => void;
}) {
  const { data } = useArtwork(),
    ref = wikiReference(id, name, data);
  return localize(
    <div className="matching-wiki">
      <button className="source" onClick={() => void sourceLink(ref.url).catch(onError)}>
        <ExternalLink size={15} />
        Stardew Valley Wiki · {ref.title}
      </button>
      {!ref.verified && (
        <small>
          The page title matches the English game name; this individual page has not been verified.
        </small>
      )}
    </div>,
  );
}
