"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { type SavedOrder, rememberOrder, savedOrders } from "@/lib/progress";

/** Page Merci : retient la commande sur cet appareil, pour retrouver ses fiches en un geste. */
export function RememberOrder(order: SavedOrder) {
  useEffect(() => rememberOrder(order), [order]);
  return null;
}

/** Raccourci « Mes fiches » : visible seulement sur l'appareil qui a servi à l'achat, tant que les liens sont valables. */
export function MyFichesLink({ className = "" }: { className?: string }) {
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  useEffect(() => setOrders(savedOrders()), []);
  if (!orders.length) return null;
  return (
    <div className={`myfiches ${className}`}>
      {orders.slice(0, 2).map((o) => (
        <Link key={o.id} href={`/merci?session_id=${encodeURIComponent(o.id)}`} className="myfiches__link">
          <span className="myfiches__icon">
            <Icon name="download" />
          </span>
          <span className="myfiches__text">
            <strong>Mes fiches</strong>
            <span>{o.name}</span>
          </span>
          <Icon name="arrow" />
        </Link>
      ))}
    </div>
  );
}
