/** Marque une information à fournir par La Petite IDE (jamais inventée). */
export function Todo({ children }: { children: React.ReactNode }) {
  return <mark className="todo">[À compléter : {children}]</mark>;
}
