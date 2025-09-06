import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import pollutionData from "../data/PollutionData";

// Fix missing marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href,
});

const defaultCenter = [20.5937, 78.9629];
const defaultZoom = 5;

// Fly to site when selected
function FlyToSite({ site }) {
  const map = useMap();
  useEffect(() => {
    if (site) {
      map.flyTo([site.coordinates.latitude, site.coordinates.longitude], 8, { duration: 1.5 });
    }
  }, [site, map]);
  return null;
}

// Recenter button
function RecenterButton({ setActiveSite }) {
  const map = useMap();
  return (
    <button
      onClick={() => {
        map.flyTo(defaultCenter, defaultZoom);
        setActiveSite(null); // reset active site so radius returns to normal
      }}
      style={{
        position: "absolute",
        top: "100px",
        left: "10px",
        padding: "10px",
        background: "white",
        border: "1px solid #ccc",
        borderRadius: "50%",
        cursor: "pointer",
        zIndex: 1000,
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="black"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3"></circle>
        <line x1="12" y1="2" x2="12" y2="5"></line>
        <line x1="12" y1="19" x2="12" y2="22"></line>
        <line x1="2" y1="12" x2="5" y2="12"></line>
        <line x1="19" y1="12" x2="22" y2="12"></line>
      </svg>
    </button>
  );
}

export default function Map() {
  const [activeSite, setActiveSite] = useState(null);
  const markerRefs = useRef({});
  const [animatedRadius, setAnimatedRadius] = useState({}); // track radius for animation

  const getColor = (level) => {
    switch (level) {
      case "High Pollution":
        return "red";
      case "Moderate Pollution":
        return "orange";
      case "Low Pollution":
        return "green";
      default:
        return "blue";
    }
  };

  // Animate radius smoothly for all markers
  useEffect(() => {
    let animationFrame;
    const animate = () => {
      setAnimatedRadius((prev) => {
        const newRadius = {};
        pollutionData.forEach((site) => {
          const isActive = activeSite?.location === site.location;
          const current = prev[site.location] ?? 10;
          const target = isActive ? 50 : 10;
          const delta = (target - current) * 0.2; // smooth step
          newRadius[site.location] = Math.abs(delta) < 0.1 ? target : current + delta;
        });
        return newRadius;
      });
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [activeSite]);

  // Open popup when activeSite changes
  useEffect(() => {
    if (activeSite && markerRefs.current[activeSite.location]) {
      markerRefs.current[activeSite.location].openPopup();
    }
  }, [activeSite]);

  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
      {/* Sidebar */}
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
          {pollutionData.map((site) => (
            <li
              key={site.location}
              onClick={() => setActiveSite(site)}
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

      {/* Map */}
      <div style={{ flex: 1 }}>
        <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height: "400px", width: "800px" }}>
          {/* Base map */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

         <RecenterButton setActiveSite={setActiveSite} />
          {activeSite && <FlyToSite site={activeSite} />}

          {/* CircleMarkers */}
          {pollutionData.map((site, idx) => {
            const offset = idx * 0.01;
            const lat = site.coordinates.latitude + offset;
            const lng = site.coordinates.longitude + offset;

            return (
              <CircleMarker
                key={idx}
                center={[lat, lng]}
                radius={animatedRadius[site.location] ?? 10}
                color={getColor(site.category.level)}
                fillOpacity={0.7}
                ref={(ref) => (markerRefs.current[site.location] = ref)}
                eventHandlers={{
                  click: () => setActiveSite(site),
                }}
              >
                <Popup
                  onOpen={() => setActiveSite(site)}
                  onClose={() => {
                    if (markerRefs.current[site.location]) {
                      markerRefs.current[site.location].resetToggles?.();
                    }
                  }}
                >
                  <PopupContent site={site} markerRefs={markerRefs} />
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

// Popup Content
function PopupContent({ site, markerRefs }) {
  const [showQi, setShowQi] = useState(false);
  const [showWi, setShowWi] = useState(false);
  const [showMC, setShowMC] = useState(false);

  useEffect(() => {
    const marker = markerRefs.current[site.location];
    if (marker) {
      marker.resetToggles = () => {
        setShowQi(false);
        setShowWi(false);
        setShowMC(false);
      };
    }
  }, [site, markerRefs]);

  return (
    <div>
      <strong>{site.location}</strong>
      <br />
      <b>HMPI:</b> {site.HMPI.toFixed(2)}
      <br />
      <b>Category:</b> {site.category.level}
      <br />
      <b>Notes:</b> {site.notes}

      {/* Qi toggle */}
      <div style={{ marginTop: "8px" }}>
        <button
          style={{ marginBottom: "4px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}
          onClick={() => setShowQi(!showQi)}
        >
          {showQi ? "Hide Qi" : "Show Qi"}
        </button>
        {showQi && site.Qi && (
          <ul style={{ paddingLeft: "16px", margin: 0 }}>
            {Object.entries(site.Qi).map(([metal, value]) => (
              <li key={metal}>
                {metal}: {value}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Wi toggle */}
      <div style={{ marginTop: "8px" }}>
        <button
          style={{ marginBottom: "4px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}
          onClick={() => setShowWi(!showWi)}
        >
          {showWi ? "Hide Wi" : "Show Wi"}
        </button>
        {showWi && site.Wi && (
          <ul style={{ paddingLeft: "16px", margin: 0 }}>
            {Object.entries(site.Wi).map(([metal, value]) => (
              <li key={metal}>
                {metal}: {value}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Metal Contributions toggle */}
      <div style={{ marginTop: "8px" }}>
        <button
          style={{ marginBottom: "4px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}
          onClick={() => setShowMC(!showMC)}
        >
          {showMC ? "Hide Contributions" : "Show Contributions"}
        </button>
        {showMC && site.metalContributions && (
          <ul style={{ paddingLeft: "16px", margin: 0 }}>
            {Object.entries(site.metalContributions).map(([metal, value]) => (
              <li key={metal}>
                {metal}: {value}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// import { useState, useRef, useEffect } from "react";
// import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
// import "leaflet/dist/leaflet.css";
// import L from "leaflet";
// import pollutionData from "../data/PollutionData";

// // Fix missing marker icons
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
//   iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
//   shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href,
// });

// const defaultCenter = [20.5937, 78.9629];
// const defaultZoom = 5;

// // Helper: fly to site when sidebar is clicked
// function FlyToSite({ site }) {
//   const map = useMap();
//   useEffect(() => {
//     if (site) {
//       map.flyTo([site.coordinates.latitude, site.coordinates.longitude], 8, { duration: 1.5 });
//     }
//   }, [site, map]);
//   return null;
// }

// // ✅ Recenter Button
// function RecenterButton() {
//   const map = useMap();
//   return (
//     <button
//       onClick={() => map.flyTo(defaultCenter, defaultZoom)}
//       style={{
//         position: "absolute",
//         top: "100px",
//         left: "10px",
//         padding: "10px",
//         background: "white",
//         border: "1px solid #ccc",
//         borderRadius: "50%",
//         cursor: "pointer",
//         zIndex: 1000,
//         boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
//       }}
//     >
//       <svg
//         xmlns="http://www.w3.org/2000/svg"
//         width="20"
//         height="20"
//         viewBox="0 0 24 24"
//         fill="none"
//         stroke="black"
//         strokeWidth="2"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       >
//         <circle cx="12" cy="12" r="3"></circle>
//         <line x1="12" y1="2" x2="12" y2="5"></line>
//         <line x1="12" y1="19" x2="12" y2="22"></line>
//         <line x1="2" y1="12" x2="5" y2="12"></line>
//         <line x1="19" y1="12" x2="22" y2="12"></line>
//       </svg>
//     </button>
//   );
// }

// export default function Map() {
//   const [activeSite, setActiveSite] = useState(null);
//   const markerRefs = useRef({});

//   const getColor = (level) => {
//     switch (level) {
//       case "High Pollution":
//         return "red";
//       case "Moderate Pollution":
//         return "orange";
//       case "Low Pollution":
//         return "green";
//       default:
//         return "blue";
//     }
//   };

//   useEffect(() => {
//     if (activeSite && markerRefs.current[activeSite.location]) {
//       markerRefs.current[activeSite.location].openPopup();
//     }
//   }, [activeSite]);

//   return (
//     <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
//       {/* Sidebar */}
//       <aside
//         style={{
//           width: "180px",
//           background: "#fff",
//           border: "1px solid #e6e6e6",
//           borderRadius: "8px",
//           padding: "10px",
//           boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
//           maxHeight: "600px",
//           overflowY: "auto",
//           marginTop: "20px",
//         }}
//       >
//         <h4 style={{ marginBottom: "10px" }}>Sites</h4>
//         <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
//           {pollutionData.map((site) => (
//             <li
//               key={site.location}
//               onClick={() => setActiveSite(site)}
//               style={{
//                 padding: "6px 0",
//                 fontSize: "14px",
//                 cursor: "pointer",
//                 color: activeSite?.location === site.location ? "blue" : "black",
//               }}
//             >
//               {site.location}
//             </li>
//           ))}
//         </ul>
//       </aside>

//       {/* Map */}
//       <div style={{ flex: 1 }}>
//         <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height: "600px", width: "100%" }}>
//           <TileLayer
//             attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
//             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           />

//           <RecenterButton />

//           {activeSite && <FlyToSite site={activeSite} />}

//           {pollutionData.map((site, idx) => {
//             // 🔹 apply small offset so overlapping sites are visible
//             const offset = idx * 0.01; // ~1 km apart per index
//             const lat = site.coordinates.latitude + offset;
//             const lng = site.coordinates.longitude + offset;

//             return (
//               <CircleMarker
//                 key={idx}
//                 center={[lat, lng]}
//                 radius={10}
//                 color={getColor(site.category.level)}
//                 fillOpacity={0.7}
//                 ref={(ref) => (markerRefs.current[site.location] = ref)}
//               >
//                 <Popup
//                   onClose={() => {
//                     if (markerRefs.current[site.location]) {
//                       markerRefs.current[site.location].resetToggles?.();
//                     }
//                   }}
//                 >
//                   <PopupContent site={site} markerRefs={markerRefs} />
//                 </Popup>
//               </CircleMarker>
//             );
//           })}
//         </MapContainer>
//       </div>
//     </div>
//   );
// }

// // ✅ Popup Content with toggles
// function PopupContent({ site, markerRefs }) {
//   const [showQi, setShowQi] = useState(false);
//   const [showWi, setShowWi] = useState(false);
//   const [showMC, setShowMC] = useState(false);

//   useEffect(() => {
//     const marker = markerRefs.current[site.location];
//     if (marker) {
//       marker.resetToggles = () => {
//         setShowQi(false);
//         setShowWi(false);
//         setShowMC(false);
//       };
//     }
//   }, [site, markerRefs]);

//   return (
//     <div>
//       <strong>{site.location}</strong>
//       <br />
//       <b>HMPI:</b> {site.HMPI.toFixed(2)}
//       <br />
//       <b>Category:</b> {site.category.level}
//       <br />
//       <b>Notes:</b> {site.notes}

//       {/* Qi toggle */}
//       <div style={{ marginTop: "8px" }}>
//         <button
//           style={{ marginBottom: "4px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}
//           onClick={() => setShowQi(!showQi)}
//         >
//           {showQi ? "Hide Qi" : "Show Qi"}
//         </button>
//         {showQi && site.Qi && (
//           <ul style={{ paddingLeft: "16px", margin: 0 }}>
//             {Object.entries(site.Qi).map(([metal, value]) => (
//               <li key={metal}>
//                 {metal}: {value}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//       {/* Wi toggle */}
//       <div style={{ marginTop: "8px" }}>
//         <button
//           style={{ marginBottom: "4px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}
//           onClick={() => setShowWi(!showWi)}
//         >
//           {showWi ? "Hide Wi" : "Show Wi"}
//         </button>
//         {showWi && site.Wi && (
//           <ul style={{ paddingLeft: "16px", margin: 0 }}>
//             {Object.entries(site.Wi).map(([metal, value]) => (
//               <li key={metal}>
//                 {metal}: {value}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//       {/* Metal Contributions toggle */}
//       <div style={{ marginTop: "8px" }}>
//         <button
//           style={{ marginBottom: "4px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}
//           onClick={() => setShowMC(!showMC)}
//         >
//           {showMC ? "Hide Contributions" : "Show Contributions"}
//         </button>
//         {showMC && site.metalContributions && (
//           <ul style={{ paddingLeft: "16px", margin: 0 }}>
//             {Object.entries(site.metalContributions).map(([metal, value]) => (
//               <li key={metal}>
//                 {metal}: {value}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>
//     </div>
//   );
// }
