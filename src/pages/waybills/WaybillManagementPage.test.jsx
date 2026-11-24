import { fireEvent, render, screen } from '@testing-library/react';
import { api } from '../../services/api';
import WaybillManagementPage from './WaybillManagementPage';

afterEach(() => { jest.restoreAllMocks(); sessionStorage.clear(); });

test('recovers a saved allocation after reloading without repeating the provider operation', async () => {
  const submit = jest.spyOn(api, 'waybills').mockRejectedValue(new Error('Response timed out'));
  const check = jest.spyOn(api, 'waybillAllocation').mockResolvedValue({ data: { state: 'CONFIRMED', waybills: ['1234567890'] } });
  const first = render(<WaybillManagementPage accountKey="owner-a" />);
  fireEvent.change(screen.getByLabelText('Number of waybills'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate waybills' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Response timed out');
  const key = submit.mock.calls[0][1];
  first.unmount();
  render(<WaybillManagementPage accountKey="owner-a" />);
  expect(screen.getByRole('button', { name: 'Generate waybills' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Check allocation status' }));
  expect(await screen.findByText('1234567890')).toBeInTheDocument();
  expect(check).toHaveBeenCalledWith(key);
  expect(submit).toHaveBeenCalledTimes(1);
});
