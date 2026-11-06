import { Breadcrumb } from "@/components/ui/Breadcrumb";

export interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

/** Mise en page commune des pages légales : en-tête, sommaire, sections en cartes. */
export function LegalPage({
  title,
  intro,
  updatedAt,
  sections,
  toc = false,
}: {
  title: string;
  intro?: React.ReactNode;
  updatedAt?: string;
  sections: LegalSection[];
  toc?: boolean;
}) {
  return (
    <div className="container legal">
      <header className="legal__head">
        <Breadcrumb items={[{ label: title }]} />
        <h1>{title}</h1>
        {intro ? <p className="legal__intro">{intro}</p> : null}
        {updatedAt ? <p className="legal__date">Mise à jour le {updatedAt}</p> : null}
      </header>

      {toc ? (
        <nav className="legal__toc" aria-label="Sommaire">
          <ol>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="legal__sections">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="legal__card" aria-labelledby={`${s.id}-t`}>
            <h2 id={`${s.id}-t`}>
              {toc ? <span className="legal__num">{i + 1}</span> : null}
              {s.title}
            </h2>
            <div className="legal__body">{s.content}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Liste « libellé : valeur » (fiche d'identité). */
export function InfoList({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="info-list">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
