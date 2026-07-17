import type { CalculatorInput, CalculatorSettings } from './types';

// Значения по умолчанию — реально используемые значения хранятся в Supabase
// и редактируются руководителем в Настройках админ-панели.
export const DEFAULT_SETTINGS: Pick<
  CalculatorSettings,
  'sign_type_prices' | 'coefficients' | 'gifts' | 'kp_text' | 'offer_valid_hours'
> = {
  sign_type_prices: {
    'Объемные буквы': 15000,
    'Световой короб': 16000,
    'Буквы с контражуром': 20000,
    'Неоновые вывески': 25000,
  },
  coefficients: {
    backlight: 1.15,
    urgent: 1.2,
  },
  gifts: ['Световой блок питания в подарок при оплате в течение 12 часов'],
  kp_text:
    'Спасибо за обращение в KUBIK.std! Ниже — расчёт стоимости вашей вывески. ' +
    'Предложение действительно 12 часов, при оплате в этот срок дарим блок питания.',
  offer_valid_hours: 12,
};

export function calculatePrice(
  input: CalculatorInput,
  settings: Pick<CalculatorSettings, 'sign_type_prices' | 'coefficients'> = DEFAULT_SETTINGS
) {
  const pricePerM = settings.sign_type_prices[input.signType] ?? 15000;
  const area = Math.max(input.widthM, 1) * Math.max(input.heightCm / 100, 0.3);
  let total = pricePerM * area;

  if (input.backlight) {
    total *= settings.coefficients.backlight ?? 1.15;
  }

  // минимальная стоимость заказа
  total = Math.max(total, pricePerM * 2);

  return Math.round(total / 1000) * 1000;
}
