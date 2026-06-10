import { useEffect } from 'react';
import './LegalPage.css';

function LegalPage({ doc }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [doc?.slug]);

  if (!doc) return null;

  return (
    <div className="legal-page section-container" dir="rtl">
      <header className="legal-header">
        <h1 className="page-title">{doc.title}</h1>
        {doc.subtitle && <p className="legal-subtitle">{doc.subtitle}</p>}
      </header>

      <article className="legal-body">
        {doc.intro?.map((para, i) => (
          <p key={`intro-${i}`} className="legal-paragraph">
            {para}
          </p>
        ))}

        {doc.sections?.map((section, si) => (
          <section key={`sec-${si}`} className="legal-section">
            <h2 className="legal-section-title">{section.heading}</h2>

            {section.paragraphs?.map((para, pi) => (
              <p key={`p-${si}-${pi}`} className="legal-paragraph">
                {para}
              </p>
            ))}

            {section.items?.length > 0 && (
              <ul className="legal-list">
                {section.items.map((item, ii) => (
                  <li key={`li-${si}-${ii}`}>{item}</li>
                ))}
              </ul>
            )}

            {section.footer?.map((para, fi) => (
              <p key={`f-${si}-${fi}`} className="legal-paragraph">
                {para}
              </p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}

export default LegalPage;
