import type { ReactNode } from "react";

export function AuthCard({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <section className="w-full max-w-sm rounded-ui border border-line bg-surface/90 p-6 shadow-2xl backdrop-blur">
      <h1 className="mb-6 text-2xl font-bold">{title}</h1>
      {children}
      <p className="mt-6 text-sm text-muted">{footer}</p>
    </section>
  );
}
