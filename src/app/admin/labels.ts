import { LEGAL } from "@/lib/format";
import type { AdminOrder } from "./data";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Page d'étiquettes à imprimer (destinataire + expéditeur), 2 par ligne sur A4. */
export function labelsPage(orders: AdminOrder[]): string {
  const sender = `${LEGAL.tradeName} — ${LEGAL.address}`;
  const labels = orders
    .map(
      (o) => `<div class="label">
      <p class="label__to">${o.lines.map(esc).join("<br>")}</p>
      <p class="label__from">Exp. : ${esc(sender)}</p>
      <p class="label__ref">${esc(o.reference)}</p>
    </div>`,
    )
    .join("");
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Étiquettes · La Petite IDE</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.4 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #000; background: #fff; }
  .bar { display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 12px 16px; background: #EEF3FB; }
  .bar button { font: inherit; font-weight: 700; padding: 8px 14px; border: 0; border-radius: 10px; background: #4E7AC7; color: #fff; cursor: pointer; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90mm, 1fr)); gap: 6mm; padding: 16px; }
  .label { border: 1px dashed #999; border-radius: 3mm; padding: 6mm; min-height: 45mm; break-inside: avoid; display: flex; flex-direction: column; }
  .label__to { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.45; flex: 1; }
  .label__from { margin: 4mm 0 0; font-size: 9px; color: #444; }
  .label__ref { margin: 1mm 0 0; font-size: 8px; color: #888; }
  @media print { .bar { display: none; } .grid { padding: 0; grid-template-columns: 1fr 1fr; } }
</style></head>
<body>
  <div class="bar"><span>${orders.length} étiquette${orders.length > 1 ? "s" : ""} · à découper</span><button type="button" onclick="window.print()">Imprimer</button></div>
  <div class="grid">${labels || "<p>Aucune étiquette.</p>"}</div>
</body></html>`;
}
