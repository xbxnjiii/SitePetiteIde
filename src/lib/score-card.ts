"use client";
// Génère une image « story » (1080×1920) du score, dans le navigateur (aucun envoi serveur).

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function font(varName: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function makeScoreCard(opts: { score: number; total: number; mode: string; theme: string }): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  await document.fonts?.ready;
  const title = font("--ff-nunito", "system-ui, sans-serif");
  const logoFont = font("--ff-fredoka", "system-ui, sans-serif");
  const body = font("--ff-inter", "system-ui, sans-serif");

  // Fond
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#C5D8F4");
  bg.addColorStop(0.55, "#F8F9FC");
  bg.addColorStop(1, "#FCE3EC");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  // Logo
  try {
    const logo = await loadImage("/img/logo-rond-512.webp");
    ctx.save();
    ctx.shadowColor = "rgba(78,122,199,0.35)";
    ctx.shadowBlur = 40;
    ctx.drawImage(logo, W / 2 - 170, 170, 340, 340);
    ctx.restore();
  } catch {
    /* logo facultatif */
  }
  ctx.fillStyle = "#2D3A5A";
  ctx.font = `600 64px ${logoFont}`;
  ctx.fillText("La Petite IDE", W / 2, 600);

  // Carte du score
  ctx.save();
  ctx.shadowColor = "rgba(45,58,90,0.15)";
  ctx.shadowBlur = 50;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, 110, 700, W - 220, 760, 60);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#C9668F";
  ctx.font = `800 44px ${title}`;
  ctx.fillText(opts.mode.toUpperCase(), W / 2, 810);
  ctx.fillStyle = "#5B6784";
  ctx.font = `500 44px ${body}`;
  ctx.fillText(`Quiz : ${opts.theme.toLowerCase()}`, W / 2, 880);

  ctx.fillStyle = "#4E7AC7";
  ctx.font = `800 300px ${title}`;
  const scoreText = String(opts.score);
  const sw = ctx.measureText(scoreText).width;
  ctx.font = `800 110px ${title}`;
  const tw = ctx.measureText(`/${opts.total}`).width;
  const startX = W / 2 - (sw + tw) / 2;
  ctx.textAlign = "left";
  ctx.font = `800 300px ${title}`;
  ctx.fillText(scoreText, startX, 1190);
  ctx.fillStyle = "#5B6784";
  ctx.font = `800 110px ${title}`;
  ctx.fillText(`/${opts.total}`, startX + sw + 10, 1190);
  ctx.textAlign = "center";

  ctx.fillStyle = "#2D3A5A";
  ctx.font = `800 64px ${title}`;
  ctx.fillText("Et toi, tu fais combien ?", W / 2, 1360);

  // Pied
  ctx.fillStyle = "#4E7AC7";
  roundRect(ctx, W / 2 - 300, 1560, 600, 110, 55);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 48px ${title}`;
  ctx.fillText("lapetiteide.fr/quiz", W / 2, 1632);
  ctx.fillStyle = "#5B6784";
  ctx.font = `500 38px ${body}`;
  ctx.fillText("@lapetiteide.fr", W / 2, 1740);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("image"))), "image/png"));
}

/** Partage l'image (feuille de partage du téléphone) ou la télécharge si le partage de fichiers n'est pas possible. */
export async function shareScoreCard(blob: Blob, text: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], "mon-score-la-petite-ide.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
