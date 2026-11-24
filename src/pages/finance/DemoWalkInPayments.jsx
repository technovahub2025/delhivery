import { useEffect, useRef, useState } from 'react';
import { api, unwrap } from '../../services/api';

export default function DemoWalkInPayments() {
  const [data, setData] = useState(null);
  const [method, setMethod] = useState('');
  const [manualMethod, setManualMethod] = useState('');
  const [references, setReferences] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const inFlight = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    api.demoWalkInPayments(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      const value = unwrap(result);
      if (value.demoAvailable !== true) { setData({ demoAvailable: false }); return; }
      setData(value); setMethod(value.methods?.[0] || ''); setManualMethod(value.manual?.methods?.[0] || '');
    }).catch(failure => { if (!controller.signal.aborted) setError(failure.message || 'Demo payments could not be loaded.'); });
    return () => controller.abort();
  }, []);
  async function record(id) {
    if (!method || inFlight.current) return;
    inFlight.current = true;
    setBusy(id); setError('');
    try {
      const { receipt } = unwrap(await api.recordDemoWalkInPayment(id, method));
      setData(current => ({ ...current, shipments: current.shipments.map(row => row.id === id ? { ...row, receipt } : row) }));
    } catch (failure) { setError(failure.message || 'Demo receipt could not be saved.'); }
    finally { inFlight.current = false; setBusy(null); }
  }
  if (data && data.demoAvailable !== true) return null;
  if (data && !data.methods?.length && !data.manual?.methods?.length) return null;
  async function recordManual(id) {
    if (!manualMethod || !references[id]?.trim() || inFlight.current) return;
    inFlight.current = true;
    setBusy(id); setError('');
    try {
      const { receipt } = unwrap(await api.recordManualWalkInReceipt(id, manualMethod, references[id].trim()));
      setData(current => ({ ...current, manual: { ...current.manual, shipments: current.manual.shipments.map(row => row.id === id ? { ...row, receipt } : row) } }));
    } catch (failure) { setError(failure.message || 'Walk-in receipt could not be saved.'); }
    finally { inFlight.current = false; setBusy(null); }
  }
  return <section aria-label="Walk-in payments">
    {data?.methods?.length > 0 && <h3>Demo walk-in payments</h3>}
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">Loading demo shipments...</p>}
    {data?.methods?.length > 0 && <>
      <label>Sample payment method <select value={method} disabled={Boolean(busy)} onChange={event => setMethod(event.target.value)}>{data.methods.map(value => <option key={value}>{value}</option>)}</select></label>
      {!data.shipments.length && <p>Book a sample walk-in shipment to record its demo receipt.</p>}
      <ul>{data.shipments.map(row => <li key={row.id}>{row.reference} | {row.currency} {row.amount} | {row.receipt
        ? <span>Demo receipt recorded via {row.receipt.method}</span>
        : <button type="button" disabled={Boolean(busy)} onClick={() => record(row.id)}>{busy === row.id ? 'Saving...' : 'Record demo receipt'}</button>}</li>)}</ul>
    </>}
    {data?.manual?.methods?.length > 0 && <section aria-label="Walk-in receipts">
      <h3>Walk-in receipts</h3>
      <p>Record payment already received. This form does not initiate a transaction.</p>
      <label>Receipt method <select value={manualMethod} disabled={Boolean(busy)} onChange={event => setManualMethod(event.target.value)}>{data.manual.methods.map(value => <option key={value}>{value}</option>)}</select></label>
      {!data.manual.shipments.length && <p>No eligible walk-in shipments.</p>}
      <ul>{data.manual.shipments.map(row => <li key={row.id}>{row.reference} | {row.currency} {row.amount} | {row.receipt ? <span>Receipt recorded via {row.receipt.method} ({row.receipt.reference})</span> : <>
        <label>Receipt reference for {row.reference} <input value={references[row.id] || ''} maxLength={160} onChange={event => setReferences(current => ({ ...current, [row.id]: event.target.value }))} /></label>
        <button type="button" disabled={Boolean(busy) || !references[row.id]?.trim()} onClick={() => recordManual(row.id)}>Record receipt</button>
      </>}</li>)}</ul>
    </section>}
  </section>;
}
