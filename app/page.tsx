import { getCurrentReading, getHistory, type Reading } from "@/lib/sensors";

export const revalidate = 900; // 15 minutes

type Status = "good" | "watch" | "poor";

type Metric = {
  key: "turbidity" | "tempF" | "ph";
  label: string;
  unit: string;
  secondary?: (r: Reading) => string;
  format: (r: Reading) => string;
  status: (v: number) => Status;
  explainer: string;
  domain: [number, number];
};

// Thresholds align with Florida DEP Class III recreational standards and EPA
// guidance for clear freshwater lakes.
const METRICS: Metric[] = [
  {
    key: "turbidity",
    label: "Turbidity",
    unit: "NTU",
    format: (r) => r.turbidity.toFixed(2),
    status: (v) => (v < 5 ? "good" : v < 10 ? "watch" : "poor"),
    explainer:
      "How cloudy the water is. Lower means clearer water and healthier light for plants below.",
    domain: [0, 4],
  },
  {
    key: "tempF",
    label: "Temperature",
    unit: "°F",
    secondary: (r) => `${r.tempC.toFixed(1)} °C`,
    format: (r) => r.tempF.toFixed(1),
    status: (v) => (v < 85 ? "good" : v < 90 ? "watch" : "poor"),
    explainer:
      "How warm the surface water is. Fish and turtles slow down or get stressed when it climbs too high.",
    domain: [68, 86],
  },
  {
    key: "ph",
    label: "pH",
    unit: "",
    format: (r) => r.ph.toFixed(2),
    status: (v) => (v >= 6.5 && v <= 8.5 ? "good" : v >= 6 && v <= 9 ? "watch" : "poor"),
    explainer:
      "How acidic or basic the water is. Healthy Florida lakes sit between 6.5 and 8.5 — close to pure water.",
    domain: [6, 9],
  },
];

const STATUS_STYLES: Record<Status, { dot: string; label: string; pill: string }> = {
  good: {
    dot: "bg-emerald-400",
    label: "Healthy",
    pill: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  },
  watch: {
    dot: "bg-amber-400",
    label: "Watch",
    pill: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  },
  poor: {
    dot: "bg-rose-400",
    label: "Poor",
    pill: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  },
};

function Sparkline({
  values,
  domain,
}: {
  values: number[];
  domain: [number, number];
}) {
  const w = 220;
  const h = 56;
  const [lo, hi] = domain;
  const span = hi - lo || 1;
  const stepX = w / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((Math.min(Math.max(v, lo), hi) - lo) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = values[values.length - 1];
  const lastY = h - ((Math.min(Math.max(last, lo), hi) - lo) / span) * h;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-14 w-full text-emerald-300"
      aria-hidden
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${points} ${w},${h}`} fill="url(#spark-fill)" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={w} cy={lastY} r="2.5" className="fill-emerald-200" />
    </svg>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export default async function Home() {
  const [current, history] = await Promise.all([
    getCurrentReading(),
    getHistory(24),
  ]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070b09] text-stone-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px] bg-[radial-gradient(ellipse_at_top,_rgba(16,84,66,0.45),_transparent_60%)]"
      />
      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-12 sm:px-8 sm:pt-16">
        <header className="flex flex-col gap-6 border-b border-emerald-900/40 pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-300/80">
              Tibet Butler Preserve · Windermere, Florida
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Live water quality from{" "}
              <span className="text-emerald-300">Lake Tibet</span>
            </h1>
            <p className="max-w-xl text-base text-stone-400">
              A continuous look at the lake’s health, sampled by a sensor on the Butler
              Chain of Lakes.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start rounded-full border border-emerald-900/50 bg-emerald-950/30 px-4 py-2 text-sm text-stone-300 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span>Updated {formatTime(current.timestamp)}</span>
          </div>
        </header>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          {METRICS.map((m) => {
            const value = current[m.key];
            const status = STATUS_STYLES[m.status(value)];
            const series = history.map((r) => r[m.key]);
            return (
              <article
                key={m.key}
                className="flex flex-col gap-5 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-6 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium uppercase tracking-wider text-stone-400">
                    {m.label}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${status.pill}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-semibold tracking-tight tabular-nums">
                    {m.format(current)}
                  </span>
                  {m.unit && (
                    <span className="text-lg text-stone-400">{m.unit}</span>
                  )}
                </div>
                {m.secondary && (
                  <span className="-mt-3 text-sm text-stone-400">
                    {m.secondary(current)}
                  </span>
                )}

                <Sparkline values={series} domain={m.domain} />

                <p className="text-sm leading-relaxed text-stone-400">{m.explainer}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-12 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-amber-200/90">
          <p>
            <strong className="font-semibold">Heads up:</strong> readings are
            simulated with realistic Lake Tibet baselines until the live sensor API is
            connected. The dashboard is wired to swap in real data with no UI changes.
          </p>
        </section>

        <footer className="mt-12 flex flex-col gap-2 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Data refreshes every 15 minutes. Sensor maintained by Aquasense.</span>
          <span className="font-mono text-xs uppercase tracking-[0.18em]">
            Butler Chain of Lakes
          </span>
        </footer>
      </div>
    </main>
  );
}
