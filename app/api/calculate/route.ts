import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePrice, DEFAULT_SETTINGS } from '@/lib/pricing';
import type { CalculatorInput } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CalculatorInput;

  let settings = DEFAULT_SETTINGS;
  try {
    const supabase = createClient();
    const { data } = await supabase.from('calculator_settings').select('*').single();
    if (data) {
      settings = {
        sign_type_prices: data.sign_type_prices,
        coefficients: data.coefficients,
        gifts: data.gifts,
        kp_text: data.kp_text,
        offer_valid_hours: data.offer_valid_hours,
      };
    }
  } catch {
    // Supabase не настроен — используем значения по умолчанию
  }

  const total = calculatePrice(body, settings);

  return NextResponse.json({ total, settings });
}
