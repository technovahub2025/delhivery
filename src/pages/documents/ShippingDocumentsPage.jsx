import { useState } from 'react';
import { Button, Empty, Field, Skeleton } from '../../components/ui';
import PageHeading from '../../components/ui/PageHeading';
import ApiResult from '../../components/ui/ApiResult';
import { api, assertProviderSuccess, unwrap } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';

function documentErrorMessage(error) {
  const details = error?.response?.data ?? error?.details;
  const sources = [details?.data, details];
  const nonEmptyString = (value) => typeof value === 'string' && value.trim();
  const message =
    sources.map((value) => value?.error).find(nonEmptyString) ||
    sources.map((value) => value?.message).find(nonEmptyString) ||
    'Unable to fetch the document. Please try again.';
  return /\bEPOD\b/i.test(message) && /\bnot available\b/i.test(message)
    ? 'Proof of delivery is not available for this shipment yet.'
    : message;
}

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
            run(async () => {
              try {
                const response = await (type === 'label'
                  ? api.label(waybill.trim())
                  : api.documents(waybill.trim()));
                assertProviderSuccess(response);
                setResult(unwrap(response));
              } catch (failure) {
                setResult(null);
                throw new Error(documentErrorMessage(failure));
              }
            });
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
