import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { calcItemCost, calcInstallCost, resolveNorm, type ProductionSettingsRow } from '@/lib/erp-pricing';
import type { ProductType, InstallCity, InstallComplexity } from '@/lib/types';
import { formatDate, formatTenge } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const productKey = params.get('productKey') ?? 'light_letters';
  const widthM = Number(params.get('widthM') ?? 2);
  const heightM = Number(params.get('heightM') ?? 1);
  const count = Number(params.get('count') ?? 1);
  const city = (params.get('city') as InstallCity) ?? 'taraz';
  const complexity = (params.get('complexity') as InstallComplexity) ?? 'light';
  const sundayRequested = params.get('sunday') === 'true';

  const supabase = createClient();
  const [{ data: productType }, { data: settings }] = await Promise.all([
    supabase.from('product_types').select('*').eq('key', productKey).single(),
    supabase.from('production_settings').select('*').single(),
  ]);

  if (!productType || !settings) {
    return new NextResponse('Не удалось загрузить данные калькулятора', { status: 500 });
  }

  const pt = productType as ProductType;
  const st = settings as ProductionSettingsRow;

  const { area, cost: itemCost } = calcItemCost(pt, { widthM, heightM, count });
  const norm = resolveNorm(pt, area);
  const installCost = calcInstallCost({ installMode: pt.install_mode, city, complexity, sundayRequested, settings: st });
  const total = itemCost + installCost;

  const installDate = new Date();
  installDate.setDate(installDate.getDate() + 10);

  const validUntil = new Date();
  validUntil.setHours(validUntil.getHours() + 12);

  const qrDataUrl = await QRCode.toDataURL('https://kubikstd.kz', { margin: 1, width: 240 });

  const sizeLabel = pt.unit === 'm2' ? `${widthM} м × ${heightM} м` : `${count} шт`;

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<title>Коммерческое предложение — KUBIK.std</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #EEF2F8; color: #0B1224; }
  .sheet { width: 210mm; min-height: 297mm; margin: 24px auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(11,18,36,0.15); }
  .head { background: linear-gradient(135deg, #0B1224 0%, #16234A 60%, #1D2C5C 100%); color: white; padding: 40px 48px; display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { font-size: 22px; font-weight: 700; }
  .logo span.b { color: #5C8CFF; }
  .badge { font-size: 12px; opacity: 0.6; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px; }
  .price { font-size: 34px; font-weight: 800; }
  .body { padding: 40px 48px; }
  .hero-img { width: 100%; height: 260px; border-radius: 16px; object-fit: cover; background: #0B1224 url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop') center/cover; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 28px; }
  .cell { background: #F7F9FC; border-radius: 14px; padding: 16px 18px; }
  .cell .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #667; opacity: 0.6; }
  .cell .value { font-size: 16px; font-weight: 700; margin-top: 4px; }
  .includes { margin-top: 28px; }
  .includes h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #667; }
  .includes ul { margin: 10px 0 0; padding: 0; list-style: none; }
  .includes li { padding: 8px 0; border-bottom: 1px solid #EEF2F8; font-size: 14px; }
  .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #EEF2F8; }
  .gift { background: #EAF0FF; border-radius: 14px; padding: 14px 18px; font-size: 13px; color: #2457E5; margin-top: 20px; }
  .valid { font-size: 12px; color: #9AA3B2; margin-top: 6px; }
  .qr { text-align: center; }
  .qr img { width: 110px; height: 110px; }
  .qr p { font-size: 11px; color: #9AA3B2; margin: 4px 0 0; }
  @media print { body { background: white; } .sheet { margin: 0; box-shadow: none; border-radius: 0; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div>
        <div class="logo">K<span class="b">&lt;&gt;</span>I <span style="opacity:.5;font-weight:400">.std</span></div>
        <div style="margin-top:26px" class="badge">Коммерческое предложение</div>
        <div style="font-size:20px;font-weight:600">${pt.name}</div>
      </div>
      <div style="text-align:right">
        <div class="badge">Стоимость</div>
        <div class="price">${formatTenge(total)}</div>
      </div>
    </div>
    <div class="body">
      <div class="hero-img"></div>
      <div class="grid">
        <div class="cell"><div class="label">Монтаж</div><div class="value">${formatDate(installDate.toISOString())}</div></div>
        <div class="cell"><div class="label">Гарантия</div><div class="value">24 месяца</div></div>
        <div class="cell"><div class="label">Изделие</div><div class="value">${itemCost > 0 ? formatTenge(itemCost) : '—'}</div></div>
      </div>
      <div class="includes">
        <h3>Что входит</h3>
        <ul>
          <li>Изготовление: ${pt.name} — ${sizeLabel}</li>
          <li>Проектирование и согласование макета</li>
          <li>Монтажные работы${installCost > 0 ? ' — ' + formatTenge(installCost) : ' (включены в стоимость)'}</li>
          <li>Гарантийное обслуживание</li>
        </ul>
      </div>
      <div class="gift">🎁 Световой блок питания в подарок при оплате в течение 12 часов</div>
      <div class="footer">
        <div>
          <div style="font-weight:600">Предложение действительно 12 часов</div>
          <div class="valid">до ${validUntil.toLocaleString('ru-RU')}</div>
        </div>
        <div class="qr">
          <img src="${qrDataUrl}" alt="QR" />
          <p>Оплатить онлайн</p>
        </div>
      </div>
    </div>
  </div>
  <script>window.onload = () => setTimeout(() => window.print && window.focus(), 300);</script>
</body>
</html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
