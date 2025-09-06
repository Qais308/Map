export default function Sidebar({ sites, activeSite, onSelect }) {
  return (
    <aside
      style={{
        width: "180px",
        background: "#fff",
        border: "1px solid #e6e6e6",
        borderRadius: "8px",
        padding: "10px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
        maxHeight: "600px",
        overflowY: "auto",
        marginTop: "20px",
      }}
    >
      <h4 style={{ marginBottom: "10px" }}>Sites</h4>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {sites.map((site) => (
          <li
            key={site.location}
            onClick={() => onSelect(site)}
            style={{
              padding: "6px 0",
              fontSize: "14px",
              cursor: "pointer",
              color: activeSite?.location === site.location ? "blue" : "black",
            }}
          >
            {site.location}
          </li>
        ))}
      </ul>
    </aside>
  );
}
