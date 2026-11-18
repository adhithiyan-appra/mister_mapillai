import { SectionHeading } from '../../components/common/SectionHeading';
import { homeJourneySteps } from '../../data/showcase';
import { cssVars } from '../../utils/style';

export function JourneySection() {
  return <section className="mm-sec" aria-labelledby="journey-title">
    <div className="mm-container">
      <SectionHeading id="journey-title" eyebrow="How It Works" title={<>Your Journey <em>With Us</em></>} />
    </div>
    <ol className="mm-container mm-journey mm-reveal" style={cssVars({ '--n': homeJourneySteps.length })}>
      <li className="mm-journey__track" aria-hidden="true"><div className="mm-journey__fill" /></li>
      {homeJourneySteps.map((step, i) => <li className="mm-step" style={cssVars({ '--d': `${i * 0.18}s` })} key={step.title}>
        <div className="mm-step__num" aria-hidden="true">{i + 1}</div>
        <div className="mm-step__copy">
          <h3 className="mm-step__title"><span className="mm-sr">Step {i + 1}: </span>{step.title}</h3>
          <p>{step.description}</p>
        </div>
      </li>)}
    </ol>
  </section>;
}
