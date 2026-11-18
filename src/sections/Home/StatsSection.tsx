import { CountUp } from '../../components/common/CountUp';
import { marqueeItems, siteStats } from '../../data/showcase';
import { cssVars } from '../../utils/style';

export function StatsSection() {
  return <section className="mm-stats" aria-label="Mister Mapillai at a glance">
    <div className="mm-container mm-stats__grid">
      {siteStats.map((stat, i) => <div className="mm-stat mm-reveal" style={cssVars({ '--d': `${i * 0.1}s` })} key={stat.label}>
        <CountUp value={stat.value} decimals={stat.decimals ?? 0} suffix={stat.suffix} />
        <span>{stat.label}</span>
      </div>)}
    </div>
  </section>;
}

export function CeremonyMarquee() {
  // Two identical runs, so the -50% loop joins seamlessly.
  return <div className="mm-marquee" aria-hidden="true">
    <div className="mm-marquee__track">
      {[0, 1].map(run => marqueeItems.map(item => <span key={`${run}-${item}`}>{item}<span className="s">✦</span></span>))}
    </div>
  </div>;
}
