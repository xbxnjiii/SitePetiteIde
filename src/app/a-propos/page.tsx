import type { Metadata } from "next";
import Link from "next/link";
import { Todo } from "@/components/content/Todo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Mascot } from "@/components/ui/Mascot";

export const metadata: Metadata = {
  title: "À propos",
  description: "La Petite IDE crée des supports pédagogiques pour accompagner les étudiants en soins infirmiers.",
  alternates: { canonical: "/a-propos" },
};

export default function AboutPage() {
  return (
    <div className="container">
      <header className="page-head">
        <Breadcrumb items={[{ label: "À propos" }]} />
        <h1>À propos de La Petite IDE</h1>
      </header>
      <div className="about">
        <div className="prose" style={{ paddingBottom: 0 }}>
          <p>
            La Petite IDE, c&apos;est une marque pensée pour les étudiants en soins infirmiers. Notre objectif : te proposer des
            supports clairs, synthétiques et agréables à consulter pour faciliter tes révisions, tes apprentissages et ta
            pratique en stage.
          </p>
          <h2>Qui sommes-nous ?</h2>
          <p>
            <Todo>présentation des deux fondatrices — parcours, motivation, pourquoi La Petite IDE (5 à 10 lignes)</Todo>
          </p>
          <h2>Nos engagements</h2>
          <ul>
            <li>Des contenus synthétiques, relus et mis à jour.</li>
            <li>Des supports pensés pour la réalité de la formation IFSI et des stages.</li>
            <li>Un accès immédiat à tes PDF, sur tous tes appareils.</li>
          </ul>
          <p>
            Retrouve aussi nos conseils et nos vidéos sur TikTok et Instagram, ou <Link href="/contact">écris-nous</Link>.
          </p>
        </div>
        <Mascot className="mascot" />
      </div>
    </div>
  );
}
