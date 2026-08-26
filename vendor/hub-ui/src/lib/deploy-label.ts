/** Deploy target label for filter badges and directory chips. */
export function deployLabel(target?: string): string {
  const map: Record<string, string> = {
    "github-pages": "GitHub Pages",
    vercel: "Vercel",
    vps: "VPS · CloudFly",
    "github-release": "GitHub Release",
    local: "Local only",
    cloudflare: "Cloudflare Pages",
    "docker-lenovo": "Lenovo · Home Server",
    lenovo: "Lenovo · Home Server",
  };
  return target ? (map[target] ?? target) : "—";
}
