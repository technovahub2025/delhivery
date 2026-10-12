import { Package, Plus, Trash2 } from 'lucide-react';

import ShipmentFormField from '../ShipmentFormField';
import { Field } from '../../ui';

const BOX_SIZES = {
  small: {
    label: 'Small',
    length: '20',
    width: '15',
    height: '10',
  },
  medium: {
    label: 'Medium',
    length: '30',
    width: '20',
    height: '15',
  },
  large: {
    label: 'Large',
    length: '40',
    width: '30',
    height: '20',
  },
  extraLarge: {
    label: 'Extra Large',
    length: '50',
    width: '40',
    height: '30',
  },
};

const createBox = () => ({
  packagingType: 'Cardboard',
  boxes: 1,
  boxPreset: 'custom',
  length: '',
  width: '',
  height: '',
  unit: 'cm',
  weight: '',
  weightUnit: 'gm',
});

function toCm(value, unit) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return unit === 'in' ? number * 2.54 : number;
}

function toKg(value, unit) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return unit === 'gm' ? number / 1000 : number;
}

function calculateBox(box) {
  const boxCount = Math.max(1, Number(box.boxes) || 1);

  const lengthCm = toCm(box.length, box.unit);
  const widthCm = toCm(box.width, box.unit);
  const heightCm = toCm(box.height, box.unit);

  const actualWeightPerBoxKg = toKg(box.weight, box.weightUnit);

  const volumetricWeightPerBoxKg =
    lengthCm > 0 && widthCm > 0 && heightCm > 0
      ? (lengthCm * widthCm * heightCm) / 5000
      : 0;

  return {
    actualWeightKg: actualWeightPerBoxKg * boxCount,
    volumetricWeightKg: volumetricWeightPerBoxKg * boxCount,
  };
}

function calculateTotals(boxes) {
  return boxes.reduce(
    (totals, box) => {
      const result = calculateBox(box);

      return {
        actualWeightKg: totals.actualWeightKg + result.actualWeightKg,
        volumetricWeightKg:
          totals.volumetricWeightKg + result.volumetricWeightKg,
      };
    },
    {
      actualWeightKg: 0,
      volumetricWeightKg: 0,
    }
  );
}

export default function PackageDetailsStep({ data, setData }) {
  const boxes = data.boxes?.length ? data.boxes : [createBox()];

  const totals = calculateTotals(boxes);

  const chargeableWeightKg = Math.max(
    totals.actualWeightKg,
    totals.volumetricWeightKg
  );

  function syncBoxes(updatedBoxes) {
    const updatedTotals = calculateTotals(updatedBoxes);
    const firstBox = updatedBoxes[0];

    setData((draft) => ({
      ...draft,
      boxes: updatedBoxes,

      length: firstBox.length,
      width: firstBox.width,
      height: firstBox.height,

      weight: String(
        Math.max(
          updatedTotals.actualWeightKg,
          updatedTotals.volumetricWeightKg
        )
      ),

      quantity: firstBox.boxes,

      actualWeightKg: updatedTotals.actualWeightKg,
      volumetricWeightKg: updatedTotals.volumetricWeightKg,
      chargeableWeightKg: Math.max(
        updatedTotals.actualWeightKg,
        updatedTotals.volumetricWeightKg
      ),
    }));
  }

  function updateBox(index, name, value) {
    const updatedBoxes = boxes.map((box, boxIndex) =>
      boxIndex === index ? { ...box, [name]: value } : box
    );

    syncBoxes(updatedBoxes);
  }

  function selectBoxSize(index, preset) {
    const updatedBoxes = boxes.map((box, boxIndex) => {
      if (boxIndex !== index) return box;

      if (preset === 'custom') {
        return {
          ...box,
          boxPreset: 'custom',
        };
      }

      const selectedSize = BOX_SIZES[preset];

      return {
        ...box,
        boxPreset: preset,
        unit: 'cm',
        length: selectedSize.length,
        width: selectedSize.width,
        height: selectedSize.height,
      };
    });

    syncBoxes(updatedBoxes);
  }

  function addBox() {
    if (boxes.length >= 5) return;

    const updatedBoxes = [...boxes, createBox()];

    setData((draft) => ({
      ...draft,
      boxes: updatedBoxes,
    }));
  }

  function removeBox(index) {
    if (boxes.length === 1) return;

    const updatedBoxes = boxes.filter((_, boxIndex) => boxIndex !== index);

    syncBoxes(updatedBoxes);
  }

  return (
    <div className="package-details">
      <div className="info-box">
        <Package size={19} />
        Use the packed weight and outer dimensions of your package.
      </div>

      <div className="package-section">
        <div className="package-section-header">
          <div>
            <h3>Product &amp; box details</h3>
            <p>Add the product and package information for this shipment.</p>
          </div>
        </div>

        <div className="form-grid package-product-grid">
          <ShipmentFormField
            label="Product description"
            name="description"
            data={data}
            onChange={setData}
          />

          <Field label="Product search">
            <input
              type="text"
              placeholder="Search by SKU name or code"
              value={data.productSearch || ''}
              onChange={(event) =>
                setData((draft) => ({
                  ...draft,
                  productSearch: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </div>

      <div className="package-section">
        <div className="package-section-title">
          <h3>Box details</h3>
        </div>

        {boxes.map((box, index) => (
          <div className="box-size-card" key={index}>
            <div className="box-size-header">
              <strong>Box {index + 1}</strong>

              {boxes.length > 1 && (
                <button
                  type="button"
                  className="box-remove-button"
                  onClick={() => removeBox(index)}
                  aria-label={`Remove box ${index + 1}`}
                >
                  <Trash2 size={15} />
                  Remove
                </button>
              )}
            </div>

            <div className="box-size-grid">
              <Field label="Packaging type">
                <select
                  value={box.packagingType}
                  onChange={(event) =>
                    updateBox(index, 'packagingType', event.target.value)
                  }
                >
                  <option>Cardboard</option>
                  <option>Polybag</option>
                  <option>Wooden box</option>
                  <option>Other</option>
                </select>
              </Field>

              <Field label="No. of boxes">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={box.boxes}
                  onChange={(event) =>
                    updateBox(index, 'boxes', event.target.value)
                  }
                />
              </Field>

              <Field label="Box size">
                <select
                  value={box.boxPreset || 'custom'}
                  onChange={(event) =>
                    selectBoxSize(index, event.target.value)
                  }
                >
                  <option value="custom">Custom size</option>
                  <option value="small">Small — 20 × 15 × 10 cm</option>
                  <option value="medium">Medium — 30 × 20 × 15 cm</option>
                  <option value="large">Large — 40 × 30 × 20 cm</option>
                  <option value="extraLarge">
                    Extra Large — 50 × 40 × 30 cm
                  </option>
                </select>
              </Field>

              <Field label="L">
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  placeholder="Length"
                  value={box.length}
                  readOnly={box.boxPreset && box.boxPreset !== 'custom'}
                  onChange={(event) =>
                    updateBox(index, 'length', event.target.value)
                  }
                />
              </Field>

              <Field label="B">
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  placeholder="Breadth"
                  value={box.width}
                  readOnly={box.boxPreset && box.boxPreset !== 'custom'}
                  onChange={(event) =>
                    updateBox(index, 'width', event.target.value)
                  }
                />
              </Field>

              <Field label="H">
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  placeholder="Height"
                  value={box.height}
                  readOnly={box.boxPreset && box.boxPreset !== 'custom'}
                  onChange={(event) =>
                    updateBox(index, 'height', event.target.value)
                  }
                />
              </Field>

              <Field label="Unit">
                <select
                  value={box.unit}
                  disabled={box.boxPreset && box.boxPreset !== 'custom'}
                  onChange={(event) =>
                    updateBox(index, 'unit', event.target.value)
                  }
                >
                  <option>cm</option>
                  <option>in</option>
                </select>
              </Field>

              <Field label="Package weight">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter weight"
                  value={box.weight}
                  onChange={(event) =>
                    updateBox(index, 'weight', event.target.value)
                  }
                />
              </Field>

              <Field label="Weight unit">
                <select
                  value={box.weightUnit}
                  onChange={(event) =>
                    updateBox(index, 'weightUnit', event.target.value)
                  }
                >
                  <option>gm</option>
                  <option>kg</option>
                </select>
              </Field>
            </div>
          </div>
        ))}

        <div className="box-add-row">
          <button
            type="button"
            className="add-box-button"
            onClick={addBox}
            disabled={boxes.length >= 5}
          >
            <Plus size={16} />
            Add another box size
          </button>

          <span>{boxes.length}/5 boxes</span>
        </div>

        <div className="package-weight-summary">
          <div>
            <span>Actual weight</span>
            <strong>{totals.actualWeightKg.toFixed(2)} kg</strong>
          </div>

          <div>
            <span>Volumetric weight</span>
            <strong>{totals.volumetricWeightKg.toFixed(2)} kg</strong>
          </div>

          <div>
            <span>Chargeable weight</span>
            <strong>{chargeableWeightKg.toFixed(2)} kg</strong>
          </div>
        </div>

        <div className="package-weight-warning">
          <Package size={17} />
          <span>
            Volumetric weight is calculated using L × B × H ÷ 5000.
            The higher of actual weight and volumetric weight is used as
            the chargeable weight.
          </span>
        </div>

        <label className="fragile-checkbox">
          <input
            type="checkbox"
            checked={Boolean(data.fragile)}
            onChange={(event) =>
              setData((draft) => ({
                ...draft,
                fragile: event.target.checked,
              }))
            }
          />
          <span>
            <strong>My package contains fragile items</strong>
            <small>Handle this shipment with extra care.</small>
          </span>
        </label>
      </div>
    </div>
  );
}
