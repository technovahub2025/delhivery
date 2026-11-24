import { useEffect, useState } from 'react';
import { Button, Field, PageHeading } from '../../components/ui';
import { api, unwrap } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';

export default function RoleAdministrationPage({ permissions = [] }) {
  const canRead = permissions.includes('users.read');
  const canManage = permissions.includes('users.permissions.manage');
  const { busy, error, run } = useApiAction();
  const [policy, setPolicy] = useState(null);
  const [policyText, setPolicyText] = useState('');
  const [userId, setUserId] = useState('');
  const [target, setTarget] = useState(null);
  const [role, setRole] = useState('');
  const [notice, setNotice] = useState('');

  function applyPolicy(response) {
    const data = unwrap(response);
    setPolicy(data);
    setPolicyText(JSON.stringify(data.roles, null, 2));
  }

  useEffect(() => {
    if (canRead) run(async () => applyPolicy(await api.rbacPolicy()));
    // Authorization changes are applied when the workspace renders a new signed-in user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  return <section>
    <PageHeading title="Role administration" description="Manage approved role policies and assignments." />
    {!canRead ? <>
      <p role="alert">This account does not have permission to review roles.</p>
    </> : <>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!policy ? <Button type="button" disabled={busy} onClick={() => run(async () => applyPolicy(await api.rbacPolicy()))}>Load role policy</Button> : <>
        <section className="card">
          <h2>Role policy</h2>
          <p>Revision {policy.revision || 'unavailable'}</p>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => run(async () => applyPolicy(await api.rbacPolicy()))}>Reload policy</Button>
          <form onSubmit={event => {
            event.preventDefault();
            const reason = new FormData(event.currentTarget).get('reason');
            setNotice('');
            run(async () => {
              let roles;
              try { roles = JSON.parse(policyText); }
              catch { throw new Error('Enter a valid JSON role policy.'); }
              applyPolicy(await api.saveRbacPolicy(roles, reason, policy.revision));
              setNotice('Role policy saved.');
            });
          }}>
            <Field label="Role permission map"><textarea rows={9} value={policyText} readOnly={!canManage} onChange={event => setPolicyText(event.target.value)} /></Field>
            {canManage && <><Field label="Policy change reason" name="reason" required maxLength={500} />
              <Button type="submit" disabled={busy}>Save policy</Button></>}
          </form>
        </section>
        <section className="card mt-6">
          <h2>User role</h2>
          <form onSubmit={event => {
            event.preventDefault();
            setTarget(null);
            setNotice('');
            run(async () => {
              const result = unwrap(await api.rbacUserRole(userId.trim())).user;
              setTarget(result);
              setRole(result.role || '');
            });
          }}>
            <Field label="Account ID" value={userId} onChange={event => { setUserId(event.target.value); setTarget(null); }} required />
            <Button type="submit" disabled={busy}>Find account</Button>
          </form>
          {target && <form onSubmit={event => {
            event.preventDefault();
            const reason = new FormData(event.currentTarget).get('reason');
            setNotice('');
            run(async () => {
              const result = unwrap(await api.assignRbacUserRole(target.id, role, reason)).user;
              setTarget(current => ({ ...current, ...result }));
              setNotice('Role assignment saved.');
            });
          }}>
            <p>{target.name || target.email || target.id} ? {target.role || 'Unassigned'}</p>
            {canManage && <>
              <Field label="Approved role"><select value={role} onChange={event => setRole(event.target.value)} required>
                <option value="">Select role</option>
                {Object.keys(policy.roles || {}).map(key => <option key={key}>{key}</option>)}
              </select></Field>
              <Field label="Assignment reason" name="reason" required maxLength={500} />
              <Button type="submit" disabled={busy || !role}>Save assignment</Button>
            </>}
          </form>}
        </section>
      </>}
    </>}
  </section>;
}
