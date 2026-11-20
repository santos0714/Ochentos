import { TAGS, type Tag } from '../lib/types';

/** Distintivos discretos en texto: Nuevo, Medalla, Vegetariano, Picante. */
export function Tags({ tags }: { tags: Tag[] }) {
  if (!tags.length) return null;
  return (
    <span className="tags">
      {tags.map((t) => (
        <span key={t} className={`tag tag--${t}`}>{t === 'nuevo' ? 'Nuevo' : TAGS[t]}</span>
      ))}
    </span>
  );
}
