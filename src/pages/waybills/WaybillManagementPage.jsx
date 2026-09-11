import { api, parseWaybills } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';
import { Copy, Package } from 'lucide-react';
import { useState } from 'react';

import { Button, Empty, Field } from '../../components/ui';
import PageHeading from '../../components/ui/PageHeading';

function PlusIcon() {
  return <Package size={17} />;
}
export default function WaybillManagementPage({ notify }) {
  const { busy, error, run } = useApiAction();
  const [numbers, setNumbers] = useState([]);
  const [selected, setSelected] = useState([]);
  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      notify('Waybill numbers copied.');
    } catch {
      notify('Clipboard unavailable. Select and copy the displayed numbers manually.');
    }
  }
  return (
    <>
      <PageHeading
        title="Waybill management"
        description="New journeys need a number. Get yours ready."
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="card">
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const count = Number(new FormData(e.currentTarget).get('quantity'));
            if (!Number.isInteger(count) || count < 1 || count > 10000) return;
            run(async () => {
              const batch = parseWaybills(await api.waybills(count));
              setNumbers((current) => [...new Set([...current, ...batch])]);
              setSelected([]);
              notify(batch.length + ' waybills allocated.');
            });
          }}
        >
          <Field
            label="Number of waybills"
            type="number"
            name="quantity"
            min="1"
            max="10000"
            defaultValue="5"
            required
          />
          <Button type="submit" disabled={busy}>
            <PlusIcon />
            Generate waybills
          </Button>
          <p className="muted">Generate waybills from your shipping account.</p>
        </form>
      </section>
      <section className="card mt-6">
        <div className="section-head">
          <div>
            <h2>
              Generated waybills <span className="count-badge">{numbers.length}</span>
            </h2>
            <p>Waybills from your shipping service will appear here.</p>
          </div>
          <Button
            variant="secondary"
            disabled={!selected.length}
            onClick={() => copy(selected.join('\n'))}
          >
            <Copy size={16} />
            Copy selected ({selected.length})
          </Button>
        </div>
        {numbers.length ? (
          <>
            <label className="check-label select-all">
              <input
                type="checkbox"
                checked={selected.length === numbers.length}
                onChange={(e) => setSelected(e.target.checked ? numbers : [])}
              />
              Select all
            </label>
            <div className="waybill-grid">
              {numbers.map((n) => (
                <div key={n} className={`waybill-item ${selected.includes(n) ? 'selected' : ''}`}>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={selected.includes(n)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? [...selected, n] : selected.filter((x) => x !== n)
                        )
                      }
                    />
                    <code>{n}</code>
                  </label>
                  <button className="icon-btn" aria-label={`Copy ${n}`} onClick={() => copy(n)}>
                    <Copy size={16} />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty
            title="Your waybills will appear here"
            description="Choose a quantity above to allocate waybills."
          />
        )}
      </section>
    </>
  );
}
