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
  healthyText: string;
};

const METRICS: Metric[] = [
  {
    key: "turbidity",
    label: "Turbidity",
    unit: "NTU",
    format: (r) => r.turbidity.toFixed(2),
    status: (v) => (v < 5 ? "good" : v < 10 ? "watch" : "poor"),
    healthyText: "< 5 NTU",
  },
  {
    key: "tempF",
    label: "Temperature",
    unit: "°F",
    secondary: (r) => `${r.tempC.toFixed(1)} °C`,
    format: (r) => r.tempF.toFixed(1),
    status: (v) => (v < 85 ? "good" : v < 90 ? "watch" : "poor"),
    healthyText: "68 – 85 °F",
  },
  {
    key: "ph",
    label: "pH",
    unit: "",
    format: (r) => r.ph.toFixed(2),
    status: (v) => (v >= 6.5 && v <= 8.5 ? "good" : v >= 6 && v <= 9 ? "watch" : "poor"),
    healthyText: "6.5 – 8.5",
  },
];

const STATUS_LABEL: Record<Status, string> = {
  good: "Healthy",
  watch: "Watch",
  poor: "Poor",
};

const STATUS_COLOR: Record<Status, string> = {
  good: "var(--status-good)",
  watch: "var(--status-watch)",
  poor: "var(--status-poor)",
};

function Sparkline({ values }: { values: number[] }) {
  const w = 180;
  const h = 32;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const stepX = w / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - lo) / span) * h * 0.85 - h * 0.075;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="block h-8 w-full"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.7"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
    <main className="mx-auto min-h-screen max-w-[760px] px-8 pt-20 pb-16">
      <header className="mb-16 flex flex-col gap-2.5">
        <span
          className="font-mono text-[11px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ink-2)" }}
        >
          Lake Tibet · Windermere, FL
        </span>
        <h1
          className="m-0 text-[28px] font-normal leading-tight tracking-[-0.015em]"
          style={{ color: "var(--ink-0)" }}
        >
          Water quality, right now.
        </h1>
      </header>

      <section className="mb-12">
        {METRICS.map((m, idx) => {
          const value = current[m.key];
          const status = m.status(value);
          const series = history.map((r) => r[m.key]);
          const isLast = idx === METRICS.length - 1;
          return (
            <div
              key={m.key}
              className="grid items-center gap-6 py-7 sm:grid-cols-[160px_1fr_200px] sm:gap-8"
              style={{
                borderBottom: isLast ? "none" : "1px solid var(--line)",
              }}
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px]" style={{ color: "var(--ink-1)" }}>
                  {m.label}
                </span>
                <span
                  className="font-mono text-[11px] tracking-[0.04em]"
                  style={{ color: "var(--ink-2)" }}
                >
                  {m.healthyText}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span
                  className="tabular-nums leading-none"
                  style={{
                    fontSize: 44,
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    color: "var(--ink-0)",
                  }}
                >
                  {m.format(current)}
                </span>
                {m.unit && (
                  <span className="text-sm" style={{ color: "var(--ink-2)" }}>
                    {m.unit}
                  </span>
                )}
                {m.secondary && (
                  <span
                    className="ml-1 text-[13px]"
                    style={{ color: "var(--ink-2)" }}
                  >
                    · {m.secondary(current)}
                  </span>
                )}
                <span
                  className="ml-1.5 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em]"
                  style={{ color: STATUS_COLOR[status] }}
                >
                  <span
                    className="block h-1.5 w-1.5 rounded-full"
                    style={{ background: STATUS_COLOR[status] }}
                  />
                  {STATUS_LABEL[status]}
                </span>
              </div>

              <Sparkline values={series} />
            </div>
          );
        })}
      </section>

      <footer
        className="flex flex-wrap justify-between gap-2 text-xs"
        style={{ color: "var(--ink-2)" }}
      >
        <span>
          Updated {formatTime(current.timestamp)} ET · Sampled every 15 min
        </span>
        <span>Aquasense</span>
      </footer>
    </main>
  );
}
