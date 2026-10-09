import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export default function AuthCard({ title, subtitle, children, footer }: Props) {
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-xl font-extrabold text-white shadow-lg shadow-brand-500/30">
          G
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-gray-500">{subtitle}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">{children}</div>

      <p className="mt-6 text-center text-sm text-gray-500">{footer}</p>
    </div>
  );
}