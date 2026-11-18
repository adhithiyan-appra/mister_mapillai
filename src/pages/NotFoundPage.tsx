export function NotFoundPage() {
  return <div className="mm mm-page">
    <section className="mm-banner mm-missing" aria-labelledby="missing-title">
      <div className="mm-ring mm-ring--center" aria-hidden="true" />
      <div className="mm-container" style={{ position: 'relative' }}>
        <span className="mm-eyebrow">Mister Mapillai</span>
        <h1 className="mm-title" id="missing-title">Page <em>Not Found</em></h1>
        <p className="mm-lead">This address is not part of the house.</p>
        <div className="mm-btns mm-btns--center" style={{ marginTop: 30 }}>
          <a href="/" className="mm-btn mm-btn--gold">Return Home</a>
          <a href="/collections" className="mm-btn mm-btn--outline">Explore Collections</a>
        </div>
      </div>
    </section>
  </div>;
}
