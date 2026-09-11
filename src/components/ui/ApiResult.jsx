// Render provider fields without inventing values or interpreting returned HTML.
export default function ApiResult({ value }) {
  if (value === null || value === undefined) return <p className="muted">No result returned.</p>;
  if (Array.isArray(value))
    return value.length ? (
      <div>
        {value.map((item, i) => (
          <div className="card" key={i}>
            <ApiResult value={item} />
          </div>
        ))}
      </div>
    ) : (
      <p className="muted">No results found.</p>
    );
  if (typeof value === 'object')
    return (
      <dl className="api-result">
        {Object.entries(value).map(([key, item]) => (
          <div key={key}>
            <dt>{key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')}</dt>
            <dd>
              <ApiResult value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  if (typeof value === 'string' && /^https?:\/\/\S+$/i.test(value))
    return (
      <a className="text-link" href={value} target="_blank" rel="noopener noreferrer">
        Open document or link
      </a>
    );
  return <span>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>;
}
