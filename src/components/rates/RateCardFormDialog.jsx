import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Field, Modal } from '../ui';

const newSlab = () => ({ minWeight: 0, maxWeight: 1, baseRate: '0' });
const newMode = mode => ({ mode, weightSlabs: [newSlab()] });
const newZone = () => ({ zone: '', modes: [newMode('SURFACE')] });
const emptyCard = () => ({ scope: 'WALK_IN_STANDARD', customerId: '', name: '', currency: 'INR', effectiveFrom: '', effectiveTo: '', zoneRates: [newZone()], surcharges: [], gstRules: [] });
const toDate = value => value ? String(value).slice(0, 10) : '';

function ActionButton({ label, onClick, children }) {
  return <Button type="button" variant="secondary" aria-label={label} onClick={onClick}>{children}</Button>;
}

export default function RateCardFormDialog({ card, customers, onClose, onSave }) {
  const [form, setForm] = useState(() => card ? {
    ...emptyCard(), ...card, customerId: card.customerId || '', effectiveFrom: toDate(card.effectiveFrom), effectiveTo: toDate(card.effectiveTo),
    zoneRates: (card.zoneRates || []).map(zone => ({ ...zone, modes: (zone.modes || []).map(mode => ({ ...mode, weightSlabs: mode.weightSlabs || [] })) })),
    surcharges: card.surcharges || [], gstRules: card.gstRules || [],
  } : emptyCard());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  function updateZone(zoneIndex, field, value) {
    set('zoneRates', form.zoneRates.map((zone, index) => index === zoneIndex ? { ...zone, [field]: value } : zone));
  }
  function updateMode(zoneIndex, modeIndex, next) {
    set('zoneRates', form.zoneRates.map((zone, index) => index === zoneIndex ? { ...zone, modes: zone.modes.map((mode, row) => row === modeIndex ? next : mode) } : zone));
  }
  function updateSlab(zoneIndex, modeIndex, slabIndex, field, value) {
    const zone = form.zoneRates[zoneIndex]; const mode = zone.modes[modeIndex];
    updateMode(zoneIndex, modeIndex, { ...mode, weightSlabs: mode.weightSlabs.map((slab, index) => index === slabIndex ? { ...slab, [field]: field === 'minWeight' || field === 'maxWeight' ? Number(value) : value } : slab) });
  }
  function addMode(zoneIndex) {
    const zone = form.zoneRates[zoneIndex];
    if (zone.modes.length >= 2) return;
    updateZone(zoneIndex, 'modes', [...zone.modes, newMode(zone.modes.some(row => row.mode === 'SURFACE') ? 'EXPRESS' : 'SURFACE')]);
  }

  async function submit(event, forceVersion = false) {
    event.preventDefault(); setError('');
    const createVersion = forceVersion || event.nativeEvent?.submitter?.value === 'new-version';
    const payload = {
      scope: form.scope,
      ...(form.scope === 'CUSTOMER' ? { customerId: form.customerId } : {}),
      name: form.name.trim(), currency: form.currency.trim().toUpperCase(),
      effectiveFrom: form.effectiveFrom || null, effectiveTo: form.effectiveTo || null,
      zoneRates: form.zoneRates.map(zone => ({ zone: zone.zone.trim(), modes: zone.modes.map(mode => ({ mode: mode.mode, weightSlabs: mode.weightSlabs.map(slab => ({ minWeight: Number(slab.minWeight), maxWeight: Number(slab.maxWeight), baseRate: String(slab.baseRate), ...(slab.additionalWeightCharge !== undefined && slab.additionalWeightCharge !== '' ? { additionalWeightCharge: String(slab.additionalWeightCharge) } : {}), ...(slab.includedWeight != null && slab.includedWeight !== '' ? { includedWeight: Number(slab.includedWeight) } : {}), ...(slab.additionalWeightIncrement != null && slab.additionalWeightIncrement !== '' ? { additionalWeightIncrement: Number(slab.additionalWeightIncrement) } : {}) })) })) })),
      surcharges: form.surcharges.map(rule => ({ kind: rule.kind, value: String(rule.value), ...(rule.label ? { label: rule.label.trim() } : {}), ...(rule.calculationType ? { calculationType: rule.calculationType.trim() } : {}), ...(rule.basis ? { basis: rule.basis.trim() } : {}) })),
      gstRules: form.gstRules.map(rule => ({ rate: String(rule.rate), ...(rule.name ? { name: rule.name.trim() } : {}), ...(typeof rule.inclusive === 'boolean' ? { inclusive: rule.inclusive } : {}) })),
    };
    if (payload.scope === 'CUSTOMER' && !payload.customerId) return setError('Select a Credit customer for this rate card.');
    if (!payload.zoneRates.length || payload.zoneRates.some(zone => !zone.zone || !zone.modes.length || zone.modes.some(mode => !mode.weightSlabs.length || mode.weightSlabs.some(slab => !Number.isFinite(slab.minWeight) || !Number.isFinite(slab.maxWeight) || slab.maxWeight <= slab.minWeight || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(slab.baseRate) || (slab.additionalWeightCharge !== undefined && !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(slab.additionalWeightCharge)))))) return setError('Enter a zone, at least one shipping mode, and valid non-negative weight slabs.');
    if (payload.surcharges.some(rule => !['FUEL', 'COD', 'OTHER'].includes(rule.kind) || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(rule.value))) return setError('Each surcharge needs a supported type and non-negative amount.');
    if (payload.gstRules.some(rule => !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(rule.rate))) return setError('Each GST rule needs a non-negative rate.');
    setSaving(true);
    try { await onSave(payload, createVersion); }
    catch (saveError) { setError(saveError?.message || 'Rate card could not be saved.'); }
    finally { setSaving(false); }
  }

  return <Modal title={card ? `Edit rate card · v${card.version}` : 'Create rate card'} onClose={saving ? () => {} : onClose}>
    <form className="rate-card-form" onSubmit={submit}>
      <div className="rate-card-grid">
        <Field label="Scope"><select value={form.scope} disabled={Boolean(card)} onChange={event => setForm(current => ({ ...current, scope: event.target.value, customerId: '' }))}><option value="WALK_IN_STANDARD">Standard walk-in</option><option value="CUSTOMER">Customer-specific</option></select></Field>
        {form.scope === 'CUSTOMER' && <Field label="Credit customer"><select required value={form.customerId} onChange={event => set('customerId', event.target.value)}><option value="">Choose customer</option>{customers.filter(customer => customer.category === 'CREDIT').map(customer => <option key={customer.id} value={customer.id}>{customer.displayName || customer.companyName || customer.id}</option>)}</select></Field>}
        <Field label="Name" value={form.name} onChange={event => set('name', event.target.value)} maxLength={200} />
        <Field label="Currency" value={form.currency} onChange={event => set('currency', event.target.value)} maxLength={3} />
        <Field label="Effective from"><input type="date" value={form.effectiveFrom} onChange={event => set('effectiveFrom', event.target.value)} /></Field>
        <Field label="Effective to"><input type="date" value={form.effectiveTo} onChange={event => set('effectiveTo', event.target.value)} /></Field>
      </div>
      {card && <p className="rate-card-note">Version {card.version}. Cards used by shipments cannot be changed; create a new version to preserve shipment history.</p>}

      <section className="rate-card-section"><div className="rate-card-section-title"><h3>Destination zones and rates</h3><Button type="button" variant="secondary" onClick={() => set('zoneRates', [...form.zoneRates, newZone()])}><Plus size={15} /> Add zone</Button></div>
        {form.zoneRates.map((zone, zoneIndex) => <fieldset className="rate-card-zone" key={zoneIndex}><legend>Zone {zoneIndex + 1}</legend>
          <div className="rate-card-section-title"><Field label="Zone name" value={zone.zone} onChange={event => updateZone(zoneIndex, 'zone', event.target.value)} maxLength={100} /><ActionButton label={`Remove zone ${zoneIndex + 1}`} onClick={() => set('zoneRates', form.zoneRates.filter((_, index) => index !== zoneIndex))}><Trash2 size={15} /></ActionButton></div>
          {zone.modes.map((mode, modeIndex) => <div className="rate-card-mode" key={modeIndex}><div className="rate-card-section-title"><Field label="Shipping mode"><select value={mode.mode} onChange={event => updateMode(zoneIndex, modeIndex, { ...mode, mode: event.target.value })}><option value="SURFACE">Surface</option><option value="EXPRESS">Express</option></select></Field><ActionButton label={`Remove ${mode.mode} mode`} onClick={() => updateZone(zoneIndex, 'modes', zone.modes.filter((_, index) => index !== modeIndex))}><Trash2 size={15} /></ActionButton></div>
            {mode.weightSlabs.map((slab, slabIndex) => <div className="rate-card-slab" key={slabIndex}><Field label="Min weight" type="number" min="0" step="any" value={slab.minWeight} onChange={event => updateSlab(zoneIndex, modeIndex, slabIndex, 'minWeight', event.target.value)} /><Field label="Max weight" type="number" min="0" step="any" value={slab.maxWeight} onChange={event => updateSlab(zoneIndex, modeIndex, slabIndex, 'maxWeight', event.target.value)} /><Field label="Base rate" inputMode="decimal" value={slab.baseRate} onChange={event => updateSlab(zoneIndex, modeIndex, slabIndex, 'baseRate', event.target.value)} /><Field label="Additional weight charge" inputMode="decimal" value={slab.additionalWeightCharge ?? ''} onChange={event => updateSlab(zoneIndex, modeIndex, slabIndex, 'additionalWeightCharge', event.target.value)} /><Field label="Included weight (kg)" type="number" min="0" step="any" value={slab.includedWeight ?? ''} onChange={event => updateSlab(zoneIndex, modeIndex, slabIndex, 'includedWeight', event.target.value)} /><Field label="Additional weight increment (kg)" type="number" min="0" step="any" value={slab.additionalWeightIncrement ?? ''} onChange={event => updateSlab(zoneIndex, modeIndex, slabIndex, 'additionalWeightIncrement', event.target.value)} /><ActionButton label={`Remove slab ${slabIndex + 1}`} onClick={() => updateMode(zoneIndex, modeIndex, { ...mode, weightSlabs: mode.weightSlabs.filter((_, index) => index !== slabIndex) })}><Trash2 size={15} /></ActionButton></div>)}
            <Button type="button" variant="secondary" onClick={() => updateMode(zoneIndex, modeIndex, { ...mode, weightSlabs: [...mode.weightSlabs, newSlab()] })}><Plus size={14} /> Add weight slab</Button>
          </div>)}
          {zone.modes.length < 2 && <Button type="button" variant="secondary" onClick={() => addMode(zoneIndex)}><Plus size={14} /> Add mode</Button>}
        </fieldset>)}
      </section>

      <section className="rate-card-section"><div className="rate-card-section-title"><h3>Surcharges</h3><Button type="button" variant="secondary" onClick={() => set('surcharges', [...form.surcharges, { kind: 'FUEL', value: '0' }])}><Plus size={15} /> Add surcharge</Button></div>
        <p className="rate-card-note">Use FIXED with SHIPMENT, or PERCENTAGE with BASE_RATE, FREIGHT, or COD_AMOUNT for COD.</p>{form.surcharges.map((rule, index) => <div className="rate-card-slab" key={index}><Field label="Type"><select value={rule.kind} onChange={event => set('surcharges', form.surcharges.map((row, i) => i === index ? { ...row, kind: event.target.value } : row))}><option value="FUEL">Fuel</option><option value="COD">COD</option><option value="OTHER">Other</option></select></Field><Field label="Label" value={rule.label || ''} onChange={event => set('surcharges', form.surcharges.map((row, i) => i === index ? { ...row, label: event.target.value } : row))} /><Field label="Calculation type" value={rule.calculationType || ''} onChange={event => set('surcharges', form.surcharges.map((row, i) => i === index ? { ...row, calculationType: event.target.value } : row))} /><Field label="Basis" value={rule.basis || ''} onChange={event => set('surcharges', form.surcharges.map((row, i) => i === index ? { ...row, basis: event.target.value } : row))} /><Field label="Value" inputMode="decimal" value={rule.value} onChange={event => set('surcharges', form.surcharges.map((row, i) => i === index ? { ...row, value: event.target.value } : row))} /><ActionButton label={`Remove surcharge ${index + 1}`} onClick={() => set('surcharges', form.surcharges.filter((_, i) => i !== index))}><Trash2 size={15} /></ActionButton></div>)}
      </section>

      <section className="rate-card-section"><div className="rate-card-section-title"><h3>GST rules</h3><Button type="button" variant="secondary" onClick={() => set('gstRules', [...form.gstRules, { rate: '0', inclusive: false }])}><Plus size={15} /> Add GST rule</Button></div>
        {form.gstRules.map((rule, index) => <div className="rate-card-slab" key={index}><Field label="Name" value={rule.name || ''} onChange={event => set('gstRules', form.gstRules.map((row, i) => i === index ? { ...row, name: event.target.value } : row))} /><Field label="Rate" inputMode="decimal" value={rule.rate} onChange={event => set('gstRules', form.gstRules.map((row, i) => i === index ? { ...row, rate: event.target.value } : row))} /><Field label="Inclusive"><select value={String(Boolean(rule.inclusive))} onChange={event => set('gstRules', form.gstRules.map((row, i) => i === index ? { ...row, inclusive: event.target.value === 'true' } : row))}><option value="false">No</option><option value="true">Yes</option></select></Field><ActionButton label={`Remove GST rule ${index + 1}`} onClick={() => set('gstRules', form.gstRules.filter((_, i) => i !== index))}><Trash2 size={15} /></ActionButton></div>)}
      </section>
      {error && <p className="rate-card-error" role="alert">{error}</p>}
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>{card && <Button type="button" variant="secondary" disabled={saving} onClick={event => submit(event, true)}>Create new version</Button>}<Button type="submit" value="update" disabled={saving}>{saving ? 'Saving...' : card ? 'Save changes' : 'Create rate card'}</Button></div>
    </form>
  </Modal>;
}
