import { Button } from '../components/common/Button';

export function NotFoundPage() {
  return <section className="page-block page-missing">
    <div className="wrap">
      <span className="label">Mister Mapillai</span>
      <h1>Page not found</h1>
      <p className="lede">This address is not part of the house.</p>
      <div className="cta-row"><Button href="/">Return home</Button></div>
    </div>
  </section>;
}
