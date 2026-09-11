import { useState } from 'react';
import { Button, Empty, Field, Skeleton } from '../../components/ui';
import PageHeading from '../../components/ui/PageHeading';
import ApiResult from '../../components/ui/ApiResult';
import { api, unwrap } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';

export default function ShipmentTrackingPage() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('waybill');
  const [result, setResult] = useState(null);
  const { busy, error, run } = useApiAction();
  return (
    <>
      <PageHeading
        title="Every mile, in the picture."
        eyebrow="SHIPMENT TRACKING"
        description="Get the latest shipment updates from the shipping service."
      />
      <section className="card tracking-search">
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!query.trim()) return;
            setResult(null);
            run(async () => setResult(unwrap(await api.track({ [kind]: query.trim() }))));
          }}
        >
          <Field label="Search by">
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setResult(null);
              }}
              disabled={busy}
            >
              <option value="waybill">Waybill</option>
              <option value="ref_ids">Order reference</option>
            </select>
          </Field>
          <Field
            label="Waybill or reference number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
          />
          <Button type="submit" disabled={busy}>
            Track shipment
          </Button>
        </form>
      </section>
      <section className="card mt-6">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {busy ? (
          <Skeleton />
        ) : result ? (
          <>
            <h2>Shipment tracking</h2>
            <ApiResult value={result} />
          </>
        ) : (
          <Empty title="Track a shipment" description="Enter a waybill or order reference above." />
        )}
      </section>
    </>
  );
}
