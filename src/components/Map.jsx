import { useState, useRef, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import pollutionData from "../data/PollutionData";

// Fix missing marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url
  ).href,
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url)
    .href,
});

const defaultCenter = [20.5937, 78.9629];
const defaultZoom = 5;

// Fly to site when selected
function FlyToSite({ site }) {
  const map = useMap();
  useEffect(() => {
    if (site) {
      map.flyTo(
        [site.coordinates.latitude, site.coordinates.longitude],
        8,
        { duration: 1.5 }
      );
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
        setActiveSite(null);
      }}
      className="absolute top-[100px] left-2 p-2 bg-white border border-gray-300 rounded-full cursor-pointer z-[1000] shadow-md"
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
  const [animatedRadius, setAnimatedRadius] = useState({});

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

  useEffect(() => {
    let animationFrame;
    const animate = () => {
      setAnimatedRadius((prev) => {
        const newRadius = {};
        pollutionData.forEach((site) => {
          const isActive = activeSite?.location === site.location;
          const current = prev[site.location] ?? 10;
          const target = isActive ? 50 : 10;
          const delta = (target - current) * 0.2;
          newRadius[site.location] =
            Math.abs(delta) < 0.1 ? target : current + delta;
        });
        return newRadius;
      });
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [activeSite]);

  useEffect(() => {
    if (activeSite && markerRefs.current[activeSite.location]) {
      markerRefs.current[activeSite.location].openPopup();
    }
  }, [activeSite]);

  return (
    <div className="flex gap-3 items-start">
      {/* Sidebar */}
      <aside className="w-44 bg-white border border-gray-200 rounded-lg p-3 shadow-sm max-h-[600px] overflow-y-auto mt-5">
        <h4 className="mb-2 font-semibold">Sites</h4>
        <ul className="list-none p-0 m-0">
          {pollutionData.map((site) => (
            <li
              key={site.location}
              onClick={() => setActiveSite(site)}
              className={`py-1 text-sm cursor-pointer ${
                activeSite?.location === site.location ? "text-blue-600" : "text-black"
              }`}
            >
              {site.location}
            </li>
          ))}
        </ul>
      </aside>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          className="h-[400px] w-[700px]"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterButton setActiveSite={setActiveSite} />
          {activeSite && <FlyToSite site={activeSite} />}

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

// Popup content
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
    <div className="text-sm">
      <strong>{site.location}</strong>
      <br />
      <b>HMPI:</b> {site.HMPI.toFixed(2)}
      <br />
      <b>Category:</b> {site.category.level}
      <br />
      <b>Notes:</b> {site.notes}

      {/* Qi */}
      <div className="mt-2">
        <button
          className="mb-1 px-2 py-1 text-xs border rounded cursor-pointer"
          onClick={() => setShowQi(!showQi)}
        >
          {showQi ? "Hide Qi" : "Show Qi"}
        </button>
        {showQi && site.Qi && (
          <ul className="pl-4 m-0 list-disc">
            {Object.entries(site.Qi).map(([metal, value]) => (
              <li key={metal}>
                {metal}: {value}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Wi */}
      <div className="mt-2">
        <button
          className="mb-1 px-2 py-1 text-xs border rounded cursor-pointer"
          onClick={() => setShowWi(!showWi)}
        >
          {showWi ? "Hide Wi" : "Show Wi"}
        </button>
        {showWi && site.Wi && (
          <ul className="pl-4 m-0 list-disc">
            {Object.entries(site.Wi).map(([metal, value]) => (
              <li key={metal}>
                {metal}: {value}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Metal Contributions */}
      <div className="mt-2">
        <button
          className="mb-1 px-2 py-1 text-xs border rounded cursor-pointer"
          onClick={() => setShowMC(!showMC)}
        >
          {showMC ? "Hide Contributions" : "Show Contributions"}
        </button>
        {showMC && site.metalContributions && (
          <ul className="pl-4 m-0 list-disc">
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


