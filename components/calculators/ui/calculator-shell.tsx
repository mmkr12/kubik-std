export function CalculatorShell({
  left,
  right,
  footer,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">{left}</div>
        <div className="space-y-3">{right}</div>
      </div>
      <div className="sticky bottom-0 z-10 rounded-xl border border-border bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(16,26,51,0.06)] backdrop-blur">
        {footer}
      </div>
    </div>
  );
}
