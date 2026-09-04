import { classifyHubConsoleLine, tokenizeHubConsoleLine } from "./hub-console-crt";

/** V5 CRT — kind chip + inline syntax-colored segments. */
export function HubConsoleCrtLine({ line }: { line: string }) {
  const kind = classifyHubConsoleLine(line);
  const segments = tokenizeHubConsoleLine(line);
  return (
    <span className="hub-console-crt__line">
      <span className={`hub-console-crt__chip hub-console-crt__chip--${kind}`}>{kind}</span>
      <span className={`hub-console-crt__tok hub-console-crt__tok--${kind}`}>
        {segments.map((seg, i) => (
          <span key={`${i}-${seg.text.slice(0, 12)}`} className={`hub-console-crt__seg hub-console-crt__seg--${seg.kind}`}>
            {seg.text}
          </span>
        ))}
      </span>
      {"\n"}
    </span>
  );
}
