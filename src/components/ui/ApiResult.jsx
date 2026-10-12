// Render API results without displaying raw PDF/Base64 data.
function isPdfBase64(value) {
  if (typeof value !== "string") return false;

  const cleaned = value.replace(/\s/g, "");

  return (
    cleaned.length > 500 &&
    (
      cleaned.startsWith("JVBERi0") ||
      cleaned.startsWith("data:application/pdf;base64,")
    )
  );
}

function downloadPdf(value) {
  const cleaned = value.replace(/\s/g, "");
  const base64 = cleaned.startsWith("data:application/pdf;base64,")
    ? cleaned.split(",", 2)[1]
    : cleaned;

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "shipping-label.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    window.alert("Unable to download the PDF. Please try again.");
  }
}

export default function ApiResult({ value }) {
  if (value === null || value === undefined) {
    return <p className="muted">No result returned.</p>;
  }

  if (Array.isArray(value)) {
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
  }

  if (typeof value === "object") {
    return (
      <dl className="api-result">
        {Object.entries(value)
          .filter(([key]) => !/^(pdf_encoding|pdf_encoding_base64|base64_pdf)$/i.test(key))
          .map(([key, item]) => (
            <div key={key}>
              <dt>{key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")}</dt>
              <dd>
                <ApiResult value={item} />
              </dd>
            </div>
          ))}
      </dl>
    );
  }

  if (typeof value === "string" && /^https?:\/\/\S+$/i.test(value)) {
    return (
      <a
        className="text-link"
        href={value}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open document or link
      </a>
    );
  }

  if (isPdfBase64(value)) {
    return (
      <button
        type="button"
        className="text-link"
        onClick={() => downloadPdf(value)}
      >
        Download PDF
      </button>
    );
  }

  if (
    typeof value === "string" &&
    value.length > 500 &&
    /^[A-Za-z0-9+/=\s]+$/.test(value)
  ) {
    return <span className="muted">Encoded document data hidden.</span>;
  }

  return (
    <span>
      {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
    </span>
  );
}
