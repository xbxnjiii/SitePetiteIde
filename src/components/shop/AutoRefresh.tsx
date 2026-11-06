"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Recharge la page toutes les 2 s (20 fois max) en attendant la confirmation du paiement. */
export function AutoRefresh() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= 20) return;
    const t = setTimeout(() => {
      router.refresh();
      setTries((n) => n + 1);
    }, 2000);
    return () => clearTimeout(t);
  }, [tries, router]);
  return tries >= 20 ? (
    <p className="notice">C&apos;est plus long que prévu : pas d&apos;inquiétude, ton lien te sera envoyé par email dès la confirmation.</p>
  ) : null;
}
