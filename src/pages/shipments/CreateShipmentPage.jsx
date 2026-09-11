import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';

import ShipmentCreatedConfirmation from '../../components/shipments/ShipmentCreatedConfirmation';
import ShipmentSteps from '../../components/shipments/ShipmentSteps';
import PackageDetailsStep from '../../components/shipments/steps/PackageDetailsStep';
import PaymentStep from '../../components/shipments/steps/PaymentStep';
import PickupWarehouseStep from '../../components/shipments/steps/PickupWarehouseStep';
import RecipientDetailsStep from '../../components/shipments/steps/RecipientDetailsStep';
import ShipmentReviewStep from '../../components/shipments/steps/ShipmentReviewStep';
import useApiAction from '../../hooks/useApiAction';

import { Button } from '../../components/ui';

export default function CreateShipmentPage({ warehouses, onCreate, navigate }) {
  const { busy, error, run } = useApiAction();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    warehouse: warehouses[0]?.name || '',
    reference: '',
    state: '',
    description: '',
    quantity: '1',
    customer: '',
    email: '',
    phone: '',
    address: '',
    pincode: '',
    destination: '',
    weight: '',
    length: '',
    width: '',
    height: '',
    value: '',
    payment: 'Prepaid',
    mode: 'Express',
  });
  const [created, setCreated] = useState(null);
  const names = ['Pickup warehouse', 'Recipient details', 'Package details', 'Payment', 'Review'];

  function submit(e) {
    e.preventDefault();
    if (!data.warehouse) return;
    if (step < 4) setStep(step + 1);
    else {
      run(async () => {
        const s = await onCreate({
          ...data,
          dimensions: `${data.length} × ${data.width} × ${data.height} cm`,
        });
        setCreated(s);
      });
    }
  }
  if (created) return <ShipmentCreatedConfirmation created={created} navigate={navigate} />;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow muted">LET’S GET IT THERE</div>
          <h1>Create a shipment</h1>
          <p>A few simple details. A world of possibilities.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('shipments')}>
          Back to shipments
        </Button>
      </div>
      <div className="wizard-layout">
        <ShipmentSteps names={names} step={step} />
        <section className="card wizard-card">
          <div className="section-head">
            <div>
              <h2>{names[step]}</h2>
              <p>
                {
                  [
                    'Choose where your shipment begins.',
                    'Tell us where this package is headed.',
                    'A perfect fit starts with the right dimensions.',
                    'Set the payment and delivery preferences.',
                    'One final look before it heads out.',
                  ][step]
                }
              </p>
              <span className="step-label">{step + 1} of 5</span>
            </div>
          </div>
          {!warehouses.length && (
            <div className="info-box">
              Enter an existing registered warehouse name below, or add a new warehouse.
              <Button type="button" onClick={() => navigate('warehouses')}>
                Add warehouse
              </Button>
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={submit}>
            <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              {step === 0 && (
                <PickupWarehouseStep warehouses={warehouses} data={data} setData={setData} />
              )}
              {step === 1 && <RecipientDetailsStep data={data} setData={setData} />}
              {step === 2 && <PackageDetailsStep data={data} setData={setData} />}
              {step === 3 && <PaymentStep data={data} setData={setData} />}
              {step === 4 && <ShipmentReviewStep data={data} />}
              <div className="wizard-footer">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={step === 0}
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <Button type="submit" disabled={!data.warehouse}>
                  {step === 4 ? 'Create shipment' : 'Continue'}
                  <ArrowRight size={16} />
                </Button>
              </div>
            </fieldset>
          </form>
        </section>
      </div>
    </>
  );
}
