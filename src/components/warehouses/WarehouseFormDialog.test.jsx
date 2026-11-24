import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WarehouseFormDialog from './WarehouseFormDialog';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
  api: { createWarehouse: jest.fn(), updateWarehouse: jest.fn() },
}));

const fillForm = () => {
  const values = [
    ['Warehouse name', 'Main Hub'], ['Contact name', 'Main Store'], ['Phone number', '9876543210'],
    ['Full address', 'First Road'], ['Pincode', '110001'], ['Registered business name', 'Main Store Pvt Ltd'],
    ['Email address', 'hub@example.com'], ['City', 'Delhi'], ['State', 'Delhi'],
  ];
  values.forEach(([label, value]) => fireEvent.change(screen.getByLabelText(label), { target: { value } }));
};

afterEach(() => jest.clearAllMocks());

test('create passes the returned MongoDB record to refresh without synthesizing an ID', async () => {
  const warehouse = { _id: 'mongo-id-42', id: 'mongo-id-42', name: 'Main Hub', registrationStatus: 'REGISTERED' };
  const onSaved = jest.fn().mockResolvedValue(undefined);
  api.createWarehouse.mockResolvedValue({ success: true, warehouse });
  render(<WarehouseFormDialog edit={{}} setEdit={jest.fn()} notify={jest.fn()} onSaved={onSaved} />);
  fillForm();
  fireEvent.click(screen.getByRole('button', { name: 'Add warehouse' }));
  await waitFor(() => expect(api.createWarehouse).toHaveBeenCalled());
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(warehouse));
  expect(onSaved.mock.calls[0][0].id).toBe('mongo-id-42');
});

test('successful update invokes backend refresh after update response', async () => {
  const warehouse = { _id: 'mongo-id-42', id: 'mongo-id-42', name: 'Main Hub', registrationStatus: 'REGISTERED' };
  const onSaved = jest.fn().mockResolvedValue(undefined);
  api.updateWarehouse.mockResolvedValue({ success: true, warehouse });
  render(<WarehouseFormDialog edit={{ id: warehouse.id, name: 'Main Hub' }} setEdit={jest.fn()} notify={jest.fn()} onSaved={onSaved} />);
  fillForm();
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(api.updateWarehouse).toHaveBeenCalled());
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(warehouse));
});
