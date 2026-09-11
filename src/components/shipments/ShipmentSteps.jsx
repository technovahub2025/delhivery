import { Check, Truck } from 'lucide-react';

export default function ShipmentSteps({ names, step }) {
  return (
    <aside className="wizard-steps">
      {names.map((n, i) => (
        <div
          key={n}
          className={`wizard-step ${i === step ? 'active' : ''} ${i < step ? 'complete' : ''}`}
        >
          <span>{i < step ? <Check size={17} /> : i + 1}</span>
          <div>
            <small>STEP {i + 1}</small>
            <strong>{n}</strong>
          </div>
        </div>
      ))}
      <div className="wizard-help">
        <Truck size={26} />
        <h3>You pack it. We move it.</h3>
        <p>Review your details before submitting to the shipping service.</p>
      </div>
    </aside>
  );
}
