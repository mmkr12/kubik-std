-- ============================================================
-- KUBIK.std — цены калькулятора «Световые буквы на каркасе»
-- переносятся из кода в настраиваемую колонку
-- Выполнить в Supabase SQL Editor ПОСЛЕ 020
-- ============================================================
-- Раньше все цены (₸/мм, множители типа свечения, цены LED/блоков питания,
-- каркаса, монтажа) были захардкожены в lib/light-letters-pricing.ts —
-- поменять число можно было только правкой кода. Значения по умолчанию
-- ниже — точная копия того, что было в коде, поэтому у существующих
-- клиентов ничего не изменится, пока цифры не поправят в /admin/settings.

alter table production_settings add column if not exists light_letters_pricing jsonb not null default '{
  "ratePerMm": {"50-250": 17, "251-750": 27, "751-1200": 22},
  "depthAnchors": [[40, 0.845], [50, 1.0], [60, 1.16]],
  "typeMultipliers": {
    "full_combo": {"50-250": 1.25, "251-750": 1.4, "751-1200": null},
    "full_single": {"50-250": 1, "251-750": 1, "751-1200": 2},
    "front": {"50-250": 1.15, "251-750": 1, "751-1200": 1},
    "side": {"50-250": 1.2, "251-750": 1, "751-1200": 2},
    "back": {"50-250": 1.5, "251-750": 1.6, "751-1200": 1.4},
    "back_and_front": {"50-250": 1.8, "251-750": 2, "751-1200": 2}
  },
  "goldSilverMultiplier": 1.5,
  "ledPerLetter": {
    "50-250": {"modules": 5, "tapeM": 1},
    "251-750": {"modules": 20, "tapeM": 3},
    "751-1200": {"modules": 60, "tapeM": 5}
  },
  "ledModuleUnitPrice": 80,
  "ledTapeUnitPricePerM": 1000,
  "psuModuleCapacity": 200,
  "psuTapeCapacityM": 30,
  "psuGraceFraction": 0.2,
  "psuUnitPrice": {"ip43": 8000, "ip67": 16000},
  "frameStepMeters": 6,
  "frameStepPrice": 8000,
  "complexityPrice": {"light": 10000, "medium": 25000, "medium_large": 40000, "hard": 60000},
  "cityFixedPrice": {"shymkent": 60000, "almaty": 120000},
  "deliveryPrice": {"pickup": 0, "taraz": 5000, "shymkent": 15000, "almaty": 20000},
  "productionPct": 0.2,
  "urgentMultiplier": 1.5
}';
