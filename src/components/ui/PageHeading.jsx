export default function PageHeading({ eyebrow = 'SHIPPING, SIMPLIFIED', title, description }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow muted">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
