import { MainCalculator } from '@/components/main-calculator';

export function Calculator() {
  return (
    <div id="calculator" className="rounded-2xl border border-border bg-white p-4 card-shadow sm:p-6 md:p-8">
      <MainCalculator mode="public" />
    </div>
  );
}
