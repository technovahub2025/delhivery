import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShippingDocumentsPage from './ShippingDocumentsPage';
import { api } from '../../services/api';

const reply = (data, status = 200) => ({
  ok: status < 400,
  status,
  text: async () => JSON.stringify(data),
});

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  delete global.fetch;
  jest.restoreAllMocks();
});

function openDocuments() {
  render(<ShippingDocumentsPage shipments={[]} />);
  fireEvent.change(screen.getByLabelText('Waybill'), { target: { value: '123456789' } });
  fireEvent.change(screen.getByLabelText('Document type'), { target: { value: 'documents' } });
  return screen.getByRole('button', { name: 'Get documents' });
}

test.each([
  [200, { error: 'Specific backend error', message: 'API failed' }, 'Specific backend error'],
  [400, { error: 'Specific backend error', message: 'API failed' }, 'Specific backend error'],
  [200, { error: '  ', message: 'Backend message' }, 'Backend message'],
  [400, { error: { code: 'INVALID' }, message: 'Backend message' }, 'Backend message'],
  [200, {}, 'Unable to fetch the document. Please try again.'],
  [400, { message: '  ' }, 'Unable to fetch the document. Please try again.'],
  [
    200,
    {
      message: 'Delhivery API request failed',
      error: 'doc_type: EPOD, is not available for this waybill.',
    },
    'Proof of delivery is not available for this shipment yet.',
  ],
  [
    400,
    {
      message: 'Delhivery API request failed',
      error: 'doc_type: EPOD, is not available for this waybill.',
    },
    'Proof of delivery is not available for this shipment yet.',
  ],
])('shows the document failure for HTTP %s: %j', async (status, payload, expected) => {
  fetch.mockResolvedValueOnce(reply({ success: false, ...payload }, status));
  const button = openDocuments();
  fireEvent.click(button);
  if (expected === 'Proof of delivery is not available for this shipment yet.') {
    expect(await screen.findByText('No documents found')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  } else {
    expect(await screen.findByRole('alert')).toHaveTextContent(expected);
  }
  expect(button).toBeEnabled();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

test.each([
  { details: { error: 'Detailed failure', message: 'API failed' } },
  { response: { data: { error: 'Detailed failure', message: 'API failed' } } },
])('reads errors thrown by a shared helper: %j', async (properties) => {
  jest
    .spyOn(api, 'documents')
    .mockRejectedValueOnce(Object.assign(new Error('API failed'), properties));
  fireEvent.click(openDocuments());
  expect(await screen.findByRole('alert')).toHaveTextContent('Detailed failure');
});

test('clears a previous document on failure and allows a successful retry', async () => {
  fetch.mockResolvedValueOnce(reply({ data: { url: 'https://example.com/document.pdf' } }));
  const button = openDocuments();
  fireEvent.click(button);
  await screen.findByRole('link');
  fetch.mockResolvedValueOnce(reply({ data: { success: false, error: 'Document unavailable' } }));
  fireEvent.click(button);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(await screen.findByText('No documents found')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(button).toBeEnabled();
  fetch.mockResolvedValueOnce(reply({ data: { url: 'https://example.com/retry.pdf' } }));
  fireEvent.click(button);
  await waitFor(() =>
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/retry.pdf')
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('uses the document fallback for a network failure and stops loading', async () => {
  fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  const button = openDocuments();
  fireEvent.click(button);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to fetch the document. Please try again.'
  );
  expect(button).toBeEnabled();
});

test.each([[], {}, { data: [] }, { data: null }, { data: { documents: [] } }, { files: [] }])(
  'shows no documents for an empty successful response: %j',
  async (payload) => {
    fetch.mockResolvedValueOnce(reply(payload));
    const button = openDocuments();
    fireEvent.click(button);
    expect(await screen.findByText('No documents found')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(button).toBeEnabled();
  }
);

test('preserves a generic API failure when no missing-document detail is provided', async () => {
  fetch.mockResolvedValueOnce(
    reply({ success: false, message: 'Delhivery API request failed' }, 500)
  );
  fireEvent.click(openDocuments());
  expect(await screen.findByRole('alert')).toHaveTextContent('Delhivery API request failed');
  expect(screen.queryByText('No documents found')).not.toBeInTheDocument();
});
