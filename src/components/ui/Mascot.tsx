// Mascotte officielle La Petite IDE (poses découpées depuis design/planche-poses.png).
export type MascotPose = "coucou" | "lecture" | "montre" | "pouce" | "bravo" | "idee" | "question";

const SIZES: Record<MascotPose, [number, number]> = {
  coucou: [169, 322],
  lecture: [158, 223],
  montre: [176, 278],
  pouce: [171, 206],
  bravo: [243, 192],
  idee: [140, 189],
  question: [129, 183],
};

export function Mascot({ pose = "pouce", className, alt = "" }: { pose?: MascotPose; className?: string; alt?: string }) {
  const [w, h] = SIZES[pose];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/img/mascotte/${pose}.webp`} width={w} height={h} alt={alt} className={className} loading="lazy" decoding="async" />
  );
}
