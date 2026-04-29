import "server-only";

export type Reading = {
  timestamp: string;
  turbidity: number;
  tempF: number;
  tempC: number;
  ph: number;
};

// Realistic baselines for Lake Tibet on the Butler Chain of Lakes (Windermere, FL).
// The Butler Chain is spring-fed, oligotrophic-to-mesotrophic, and known for clarity.
// Sources surveyed: Florida LAKEWATCH (UF/IFAS), Orange County Water Atlas
// (orange.wateratlas.usf.edu/butler-chain), USGS station USGS-02263900 (Lake Butler
// at Windermere). Late-April surface conditions sit near these centers; the
// generator adds a diurnal temperature swing and small natural noise.
const BASELINE = {
  turbidity: 1.2, // NTU — Butler Chain typically reads 0.5–3 NTU
  tempF: 76, // °F surface, late April Central Florida
  ph: 7.6, // limestone aquifer keeps the chain slightly alkaline
} as const;

const fToC = (f: number) => ((f - 32) * 5) / 9;

function readingAt(date: Date): Reading {
  const hour = date.getHours() + date.getMinutes() / 60;

  // Diurnal temperature: coolest ~6am, warmest ~4pm, ±2°F swing.
  const diurnalOffset = -2 * Math.cos(((hour - 4) / 24) * 2 * Math.PI);
  const tempF = BASELINE.tempF + diurnalOffset + (Math.random() - 0.5) * 0.6;

  const turbidity = Math.max(
    0.4,
    BASELINE.turbidity + (Math.random() - 0.5) * 0.6,
  );
  const ph = BASELINE.ph + (Math.random() - 0.5) * 0.25;

  return {
    timestamp: date.toISOString(),
    turbidity: Number(turbidity.toFixed(2)),
    tempF: Number(tempF.toFixed(1)),
    tempC: Number(fToC(tempF).toFixed(1)),
    ph: Number(ph.toFixed(2)),
  };
}

export async function getCurrentReading(): Promise<Reading> {
  // TODO: replace with `fetch(process.env.SENSOR_API_URL)` once the live sensor
  // endpoint is online. The shape of `Reading` is the contract.
  return readingAt(new Date());
}

export async function getHistory(hours: number): Promise<Reading[]> {
  // TODO: replace with `fetch(`${SENSOR_API_URL}/history?hours=${hours}`)`.
  const points = hours * 2; // one reading every 30 minutes
  const now = Date.now();
  const stepMs = (hours * 60 * 60 * 1000) / points;

  return Array.from({ length: points + 1 }, (_, i) => {
    const t = new Date(now - (points - i) * stepMs);
    return readingAt(t);
  });
}
