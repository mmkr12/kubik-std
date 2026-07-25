import { MainCalculator } from '@/components/main-calculator';

export function Calculator() {
  return (
    <div id="calculator" className="bg-white md:rounded-2xl md:border md:border-border md:p-6 md:card-shadow md:p-8">
      <MainCalculator mode="public" />
    </div>
  );
}
