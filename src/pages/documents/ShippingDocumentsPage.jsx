import { useState } from 'react';
import { Button, Empty, Field, Skeleton } from '../../components/ui';
import PageHeading from '../../components/ui/PageHeading';
import ApiResult from '../../components/ui/ApiResult';
import { api, unwrap } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';

export default function ShippingDocumentsPage({ shipments }) {
  const [waybill, setWaybill] = useState('');
  const [type, setType] = useState('label');
  const [result, setResult] = useState(null);
  const { busy, error, run } = useApiAction();
  return (
    <>
      <PageHeading
        title="Labels & documents"
        description="Retrieve documents for any shipment using its waybill."
      />
      <section className="card">
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!waybill.trim()) return;
            setResult(null);
            run(async () =>
              setResult(
                unwrap(
                  await (type === 'label'
                    ? api.label(waybill.trim())
                    : api.documents(waybill.trim()))
                )
              )
            );
          }}
        >
          <Field
            label="Waybill"
            value={waybill}
            onChange={(e) => setWaybill(e.target.value)}
            list="document-waybills"
            required
          />
          <datalist id="document-waybills">
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.customer}
              </option>
            ))}
          </datalist>
          <Field label="Document type">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setResult(null);
              }}
              disabled={busy}
            >
              <option value="label">Shipping label</option>
              <option value="documents">Shipment documents</option>
            </select>
          </Field>
          <Button type="submit" disabled={busy}>
            Get documents
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
            <h2>{type === 'label' ? 'Shipping label' : 'Shipment documents'}</h2>
            <ApiResult value={result} />
          </>
        ) : (
          <Empty
            title="Your documents will appear here"
            description="Enter a waybill to retrieve available files. Open a returned document link to view, print or save it."
          />
        )}
      </section>
    </>
  );
}
