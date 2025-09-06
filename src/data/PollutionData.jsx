// PollutionData.jsx
const pollutionData = [
  {
    location: "Vijayawada_Rural",
    coordinates: { latitude: 16.501508, longitude: 80.676725 },
    HMPI: 257.3,
    category: { level: "High Pollution", description: "Pollution is high; requires action" },
    notes: "Elevated levels of: As, Ni",
    Qi: { Pb: 12, As: 24, Ni: 45 },
    Wi: { Pb: 0.25, As: 0.18, Ni: 0.35 },
    metalContributions: { Pb: 30, As: 25, Ni: 45 }
  },
  {
    location: "SITE_1",
    coordinates: { latitude: 16.501508, longitude: 80.676725 },
    HMPI: 133.86,
    category: { level: "Moderate Pollution", description: "Pollution is moderate; may pose some risk" },
    notes: "Elevated levels of: Pb, Ni",
    Qi: { Pb: 55, Ni: 78 },
    Wi: { Pb: 0.22, Ni: 0.33 },
    metalContributions: { Pb: 65, Ni: 35 }
  },
  {
    location: "Hyderabad",
    coordinates: { latitude: 17.385044, longitude: 78.486671 },
    HMPI: 80.4,
    category: { level: "Low Pollution", description: "Pollution within acceptable limits" },
    notes: "Slightly elevated Pb",
    Qi: { Pb: 10 },
    Wi: { Pb: 0.1 },
    metalContributions: { Pb: 100 }
  }
  // ✅ Add the rest of your sites here
];

export default pollutionData;
