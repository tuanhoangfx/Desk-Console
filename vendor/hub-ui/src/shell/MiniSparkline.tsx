type Props = {
  values: number[];
  color?: string;
  height?: number;
  className?: string;
  title?: string;
};

/** Compact SVG mini-bar trend (stable with sparse hourly data). */
export function MiniSparkline({ values, color = "#818cf8", height = 28, className = "", title }: Props) {
  const series = values.length ? values : [0];
  const max = Math.max(1, ...series);
  const width = 100;
  const barW = width / series.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`hub-chart-sparkline w-full ${className}`.trim()}
      preserveAspectRatio="none"
      role="img"
      aria-label={title ?? "Trend sparkline"}
    >
      <title>{title}</title>
      {series.map((v, i) => {
        const h = Math.max(v > 0 ? 3 : 1, (v / max) * (height - 4));
        return (
          <rect
            key={i}
            x={i * barW + 0.35}
            y={height - h - 1}
            width={Math.max(0.8, barW - 0.7)}
            height={h}
            fill={color}
            opacity={v > 0 ? 0.9 : 0.12}
            rx={0.5}
          />
        );
      })}
    </svg>
  );
}
