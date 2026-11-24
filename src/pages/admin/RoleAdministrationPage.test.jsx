import { fireEvent, render, screen } from '@testing-library/react';
import { api } from '../../services/api';
import RoleAdministrationPage from './RoleAdministrationPage';

afterEach(() => jest.restoreAllMocks());

test('unauthorized users cannot load or edit an approved policy', () => {
  const policy = jest.spyOn(api, 'rbacPolicy');
  render(<RoleAdministrationPage />);
  expect(screen.getByRole('alert')).toHaveTextContent('does not have permission');
  expect(policy).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Save policy' })).not.toBeInTheDocument();
});

test('reads approved roles and assigns one to an account using the existing audited API', async () => {
  jest.spyOn(api, 'rbacPolicy').mockResolvedValue({ data: { revision: 4, roles: { reader: ['customers.read'], clerk: [] } } });
  jest.spyOn(api, 'rbacUserRole').mockResolvedValue({ data: { user: { id: 'account-1', name: 'Operator', role: null } } });
  const assign = jest.spyOn(api, 'assignRbacUserRole').mockResolvedValue({ data: { user: { id: 'account-1', role: 'reader' } } });
  render(<RoleAdministrationPage permissions={['users.read', 'users.permissions.manage']} />);
  expect(await screen.findByText('Revision 4')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Account ID'), { target: { value: 'account-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find account' }));
  fireEvent.change(await screen.findByLabelText('Approved role'), { target: { value: 'reader' } });
  fireEvent.change(screen.getByLabelText('Assignment reason'), { target: { value: 'Approved desk duties' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save assignment' }));
  expect(await screen.findByText('Role assignment saved.')).toBeInTheDocument();
  expect(assign).toHaveBeenCalledWith('account-1', 'reader', 'Approved desk duties');
});
