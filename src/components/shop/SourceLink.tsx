"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sourceFromLocation } from "@/lib/source";

/** Lien interne qui conserve la provenance (?src=…) de la visite. */
export function SourceLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const [target, setTarget] = useState(href);
  useEffect(() => {
    const src = sourceFromLocation();
    if (src) setTarget(`${href}${href.includes("?") ? "&" : "?"}src=${encodeURIComponent(src)}`);
  }, [href]);
  return (
    <Link href={target} className={className}>
      {children}
    </Link>
  );
}
