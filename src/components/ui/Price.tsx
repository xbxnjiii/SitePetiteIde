import { formatPrice } from "@/lib/format";

export function Price({ cents, compareAt }: { cents: number; compareAt?: number }) {
  return (
    <span>
      <span className="price">{formatPrice(cents)}</span>
      {compareAt && compareAt > cents ? (
        <s className="price__old">
          <span className="visually-hidden">au lieu de </span>
          {formatPrice(compareAt)}
        </s>
      ) : null}
    </span>
  );
}
