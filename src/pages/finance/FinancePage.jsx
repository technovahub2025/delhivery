import React, { useState } from "react";
import {
  Wallet, ArrowLeftRight, FileText, TrendingUp, TrendingDown,
  RefreshCw, Download
} from "lucide-react";

const inputStyle = {
  border: "1px solid #dbe2ec",
  borderRadius: 6,
  padding: "10px 12px",
  fontSize: 13,
  color: "#334155",
  background: "#fff"
};

const thStyle = {
  padding: "13px 12px",
  textAlign: "left",
  background: "#f8fafc",
  color: "#475569",
  borderTop: "1px solid #e2e8f0",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: "nowrap"
};

function FinanceTable({ columns, message }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 13
      }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} style={thStyle}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={columns.length} style={{
              textAlign: "center",
              padding: "70px 15px",
              color: "#64748b",
              borderBottom: "1px solid #e2e8f0"
            }}>
              {message}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function FinancePage() {
  const [section, setSection] = useState("Wallet");
  const [walletTab, setWalletTab] = useState("Transactions");
  const [invoiceTab, setInvoiceTab] = useState("Invoice List");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [type, setType] = useState("All types");

  const reset = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setType("All types");
  };

  const tabs = [
    { name: "Wallet", icon: Wallet },
    { name: "Remittances", icon: ArrowLeftRight },
    { name: "Invoices", icon: FileText }
  ];

  const renderWallet = () => (
    <>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
        gap: 14,
        marginBottom: 24
      }}>
        {[
          { title: "Current Balance", icon: Wallet },
          { title: "Total Credit", icon: TrendingUp },
          { title: "Total Debit", icon: TrendingDown }
        ].map(({ title, icon: Icon }) => (
          <div key={title} style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: 18,
            background: "#f8fafc"
          }}>
            <div style={{
              display: "flex", alignItems: "center",
              gap: 9, color: "#64748b", fontSize: 13
            }}>
              <Icon size={17} /> {title}
            </div>
            <div style={{
              fontSize: 20, fontWeight: 700,
              marginTop: 12, color: "#172b4d"
            }}>Unavailable</div>
            <div style={{
              fontSize: 11, color: "#64748b", marginTop: 5
            }}>Awaiting finance API</div>
          </div>
        ))}
      </div>

      <div style={{
        display: "flex", gap: 24,
        borderBottom: "1px solid #e2e8f0",
        marginBottom: 18
      }}>
        {["Transactions", "Recharges"].map((tab) => (
          <button key={tab} onClick={() => {
            setWalletTab(tab);
            reset();
          }} style={{
            background: "transparent",
            border: 0,
            borderBottom: walletTab === tab
              ? "2px solid #526dff" : "2px solid transparent",
            color: walletTab === tab ? "#526dff" : "#334155",
            padding: "12px 15px",
            cursor: "pointer"
          }}>{tab}</button>
        ))}
      </div>

      <div style={{
        display: "flex", flexWrap: "wrap",
        gap: 10, marginBottom: 18
      }}>
        <input style={{ ...inputStyle, minWidth: 220 }}
          placeholder="Search by AWB number"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <input aria-label="From date" type="date" style={inputStyle}
          value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input aria-label="To date" type="date" style={inputStyle}
          value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <select style={inputStyle} value={type}
          onChange={(e) => setType(e.target.value)}>
          <option>All types</option>
          <option>Credit</option>
          <option>Debit</option>
        </select>
        <button style={buttonStyle} onClick={reset}>
          <RefreshCw size={14} /> Reset
        </button>
      </div>

      <FinanceTable
        columns={[
          "TRANSACTION DETAILS", "ACCOUNT DETAILS", "ORDER ID",
          "AWB / LRN", "WEIGHT & ZONE", "DESCRIPTION", "CREDIT", "DEBIT"
        ]}
        message="Wallet transaction API is not connected. No financial records are available."
      />
    </>
  );

  const buttonStyle = {
    ...inputStyle,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 7
  };

  const renderRemittances = () => (
    <>
      <div style={{
        display: "flex", flexWrap: "wrap",
        gap: 10, marginBottom: 18
      }}>
        <input style={{ ...inputStyle, minWidth: 260 }}
          placeholder="Search by Remittance Number"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={inputStyle}>
          <option>Processed On</option>
          <option>Last 7 days</option>
          <option>Last 30 days</option>
        </select>
        <button style={buttonStyle} onClick={reset}>
          <RefreshCw size={14} /> Reset
        </button>
      </div>
      <FinanceTable
        columns={[
          "REMITTANCE NUMBER", "DATE", "BANK'S TRANSACTION ID",
          "STATE", "TOTAL REMITTANCE"
        ]}
        message="Remittance API is not connected. No remittance records are available."
      />
    </>
  );

  const renderInvoices = () => (
    <>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 24,
        borderBottom: "1px solid #e2e8f0", marginBottom: 18
      }}>
        {["Invoice List", "Credit Notes", "Debit Notes"].map((tab) => (
          <button key={tab} onClick={() => {
            setInvoiceTab(tab);
            reset();
          }} style={{
            padding: "12px 15px",
            border: 0,
            borderBottom: invoiceTab === tab
              ? "2px solid #526dff" : "2px solid transparent",
            background: "transparent",
            color: invoiceTab === tab ? "#526dff" : "#334155",
            cursor: "pointer"
          }}>{tab}</button>
        ))}
      </div>

      <div style={{
        display: "flex", flexWrap: "wrap",
        gap: 10, marginBottom: 18
      }}>
        <input style={{ ...inputStyle, minWidth: 260 }}
          placeholder={`Search by ${invoiceTab === "Invoice List" ? "invoice" : invoiceTab === "Credit Notes" ? "credit note" : "debit note"} ID`}
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <input aria-label="From date" type="date" style={inputStyle}
          value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input aria-label="To date" type="date" style={inputStyle}
          value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button style={buttonStyle} onClick={reset}>
          <RefreshCw size={14} /> Reset
        </button>
      </div>

      <FinanceTable
        columns={[
          invoiceTab === "Invoice List" ? "INVOICE ID" :
            invoiceTab === "Credit Notes" ? "CREDIT NOTE ID" : "DEBIT NOTE ID",
          "INVOICE DATE", "GST NUMBER", "SERVICE TYPE", "INVOICE AMOUNT", "DOWNLOAD"
        ]}
        message="Invoice API is not connected. No invoice records or download links are available."
      />
    </>
  );

  return (
    <main style={{
      padding: "clamp(18px,3vw,36px)",
      background: "#f5f7fb",
      minHeight: "100%",
      color: "#172b4d"
    }}>
      <div style={{ marginBottom: 25 }}>
        <div style={{
          fontSize: 12, color: "#64748b", marginBottom: 18
        }}>Workspace <span style={{ padding: "0 10px" }}>/</span> Finance</div>
        <h1 style={{
          fontSize: 29, margin: "0 0 8px", fontWeight: 750
        }}>Finance</h1>
        <p style={{
          color: "#64748b", margin: 0, lineHeight: 1.6
        }}>Manage wallet transactions, remittances and invoices.</p>
      </div>

      <section style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        overflow: "hidden"
      }}>
        <nav style={{
          display: "flex", flexWrap: "wrap", gap: 8,
          padding: "12px 20px 0",
          borderBottom: "1px solid #e2e8f0"
        }}>
          {tabs.map(({ name, icon: Icon }) => (
            <button key={name} onClick={() => {
              setSection(name);
              reset();
            }} style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 16px",
              border: 0,
              borderBottom: section === name
                ? "2px solid #526dff" : "2px solid transparent",
              color: section === name ? "#526dff" : "#475569",
              background: "transparent",
              fontWeight: section === name ? 650 : 500,
              cursor: "pointer"
            }}>
              <Icon size={17} /> {name}
            </button>
          ))}
        </nav>

        <div style={{ padding: "24px 20px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", flexWrap: "wrap",
            gap: 12, marginBottom: 22
          }}>
            <h2 style={{ margin: 0, fontSize: 21 }}>{section}</h2>
            <span style={{
              color: "#92400e", background: "#fff7ed",
              border: "1px solid #fed7aa", borderRadius: 20,
              padding: "6px 10px", fontSize: 11, fontWeight: 600
            }}>Finance API not connected</span>
          </div>

          {section === "Wallet" && renderWallet()}
          {section === "Remittances" && renderRemittances()}
          {section === "Invoices" && renderInvoices()}

          <div style={{
            display: "flex", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8,
            marginTop: 18, paddingTop: 14,
            borderTop: "1px solid #e2e8f0",
            color: "#64748b", fontSize: 12
          }}>
            <span>Financial figures require a supported data source.</span>
            <span>Showing 0 records</span>
          </div>
        </div>
      </section>
    </main>
  );
}
