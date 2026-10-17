import { useCallback, useEffect, useState } from "react";
import { FileBarChart, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { api } from "../../services/api";

const types = ["Orders", "NDR", "Exceptions NDR"];
const statuses = ["Manifested", "In Transit", "Delivered", "Cancelled"];
const subStatuses = ["COD", "Prepaid", "Pending Pickup", "RTO"];

const emptyForm = {
  title: "",
  type: "Orders",
  recipient: "",
  recurrence: "Daily",
  status: [],
  subStatus: [],
};

const buttonStyle = {
  padding: "10px 14px",
  border: "1px solid #dbe2ea",
  borderRadius: 7,
  background: "#fff",
  cursor: "pointer",
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: 10,
  marginTop: 6,
  marginBottom: 16,
  border: "1px solid #dbe2ea",
  borderRadius: 7,
  boxSizing: "border-box",
};

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.reports();
      setReports(result?.data?.reports || []);
    } catch (err) {
      setError(err.message || "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  function openCreate() {
    setForm({ ...emptyForm, status: [], subStatus: [] });
    setEditing("new");
    setError("");
  }

  function openEdit(report) {
    setForm({
      title: report.title,
      type: report.type,
      recipient: report.recipient,
      recurrence: report.recurrence,
      status: [...(report.status || [])],
      subStatus: [...(report.subStatus || [])],
    });
    setEditing(report.id);
    setError("");
  }

  async function saveReport(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (editing === "new") {
        await api.createReport(form);
      } else {
        await api.updateReport(editing, form);
      }

      setEditing(null);
      await loadReports();
    } catch (err) {
      setError(err.message || "The report could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function toggleFilter(field, value) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  }

  async function toggleEnabled(report) {
    setError("");
    try {
      await api.updateReport(report.id, { enabled: !report.enabled });
      await loadReports();
    } catch (err) {
      setError(err.message || "Could not update report status.");
    }
  }

  async function deleteReport(id) {
    if (!window.confirm("Delete this report definition?")) return;

    setError("");
    try {
      await api.deleteReport(id);
      await loadReports();
    } catch (err) {
      setError(err.message || "Could not delete report.");
    }
  }

  return (
    <main style={{ padding: 24, color: "#17243a" }}>
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{ margin: 0 }}>Reports</h1>
          <p style={{ color: "#64748b" }}>
            Create and manage scheduled report definitions.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={buttonStyle} onClick={loadReports} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button style={buttonStyle} onClick={openCreate}>
            <Plus size={16} /> Schedule Report
          </button>
        </div>
      </header>

      <section style={{
        marginTop: 24,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 18,
      }}>
        <h2 style={{ fontSize: 20 }}>
          <FileBarChart size={20} /> Scheduled Reports
        </h2>

        <p style={{ color: "#64748b" }}>
          Report definitions are stored in MongoDB. Automatic email delivery
          is not configured yet.
        </p>

        {error && (
          <div role="alert" style={{
            margin: "12px 0",
            padding: 12,
            border: "1px solid #fecaca",
            borderRadius: 8,
            color: "#b91c1c",
            background: "#fef2f2",
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading reports...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              minWidth: 850,
              borderCollapse: "collapse",
              textAlign: "left",
            }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    "Report Title",
                    "Report Type",
                    "Status",
                    "Recipients",
                    "Recurrence",
                    "Order Status",
                    "Sub-status",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading} style={{
                      padding: 12,
                      borderBottom: "1px solid #e2e8f0",
                    }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td style={{ padding: 12 }}>{report.title}</td>
                    <td style={{ padding: 12 }}>{report.type}</td>
                    <td style={{ padding: 12 }}>
                      <button
                        style={buttonStyle}
                        onClick={() => toggleEnabled(report)}
                      >
                        {report.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>
                    <td style={{ padding: 12 }}>{report.recipient}</td>
                    <td style={{ padding: 12 }}>{report.recurrence}</td>
                    <td style={{ padding: 12 }}>
                      {report.status?.join(", ") || "All"}
                    </td>
                    <td style={{ padding: 12 }}>
                      {report.subStatus?.join(", ") || "All"}
                    </td>
                    <td style={{ padding: 12, whiteSpace: "nowrap" }}>
                      <button
                        style={buttonStyle}
                        onClick={() => openEdit(report)}
                        aria-label="Edit report"
                      >
                        <Pencil size={15} />
                      </button>{" "}
                      <button
                        style={buttonStyle}
                        onClick={() => deleteReport(report.id)}
                        aria-label="Delete report"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{
                      padding: 32,
                      textAlign: "center",
                      color: "#64748b",
                    }}>
                      No reports configured. Select Schedule Report to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing !== null && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "#0007",
          display: "grid",
          placeItems: "center",
          padding: 16,
        }}>
          <form
            onSubmit={saveReport}
            style={{
              background: "#fff",
              color: "#17243a",
              padding: 24,
              borderRadius: 12,
              width: "min(540px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2>{editing === "new" ? "Schedule Report" : "Edit Report"}</h2>

            <label>Report title
              <input
                required
                maxLength={120}
                style={inputStyle}
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>

            <label>Report type
              <select
                style={inputStyle}
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value })
                }
              >
                {types.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>

            <label>Recipient email
              <input
                required
                type="email"
                maxLength={254}
                style={inputStyle}
                value={form.recipient}
                onChange={(event) =>
                  setForm({ ...form, recipient: event.target.value })
                }
              />
            </label>

            <label>Recurrence
              <select
                style={inputStyle}
                value={form.recurrence}
                onChange={(event) =>
                  setForm({ ...form, recurrence: event.target.value })
                }
              >
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </label>

            <fieldset>
              <legend>Order status filters</legend>
              {statuses.map((value) => (
                <label key={value} style={{ display: "block", margin: "8px 0" }}>
                  <input
                    type="checkbox"
                    checked={form.status.includes(value)}
                    onChange={() => toggleFilter("status", value)}
                  />{" "}
                  {value}
                </label>
              ))}
            </fieldset>

            <fieldset style={{ marginTop: 16 }}>
              <legend>Order sub-status filters</legend>
              {subStatuses.map((value) => (
                <label key={value} style={{ display: "block", margin: "8px 0" }}>
                  <input
                    type="checkbox"
                    checked={form.subStatus.includes(value)}
                    onChange={() => toggleFilter("subStatus", value)}
                  />{" "}
                  {value}
                </label>
              ))}
            </fieldset>

            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 20,
            }}>
              <button
                type="button"
                style={buttonStyle}
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" style={buttonStyle} disabled={saving}>
                {saving ? "Saving..." : "Save Report"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
