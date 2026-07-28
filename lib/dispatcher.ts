// Производственный диспетчер: очередь объектов по дням недели и
// автоназначение сотрудников по компетенциям — регламент компании.
// Чистая бизнес-логика без обращений к Supabase, чтобы алгоритм было
// легко проверять и не путать с загрузкой данных (см. dispatcher-board.tsx).

import type { RequestStatus } from './types';

// ---------------------------------------------------------------------
// Даты и типы дней
// ---------------------------------------------------------------------

export type DayType = 'production' | 'installation' | 'sunday_active' | 'day_off';

const PRODUCTION_WEEKDAYS = [1, 3, 5]; // пн, ср, пт (Date#getDay())
const INSTALLATION_WEEKDAYS = [2, 4, 6]; // вт, чт, сб

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function startOfWeek(d: Date): Date {
  const day = d.getDay() === 0 ? 7 : d.getDay();
  return addDays(d, -(day - 1));
}

export function isProductionWeekday(d: Date): boolean {
  return PRODUCTION_WEEKDAYS.includes(d.getDay());
}

export function isInstallationWeekday(d: Date): boolean {
  return INSTALLATION_WEEKDAYS.includes(d.getDay());
}

/**
 * Тип сегодняшнего дня. Воскресенье активно, только если план недели не
 * закрыт (см. shouldActivateSunday) — это та же логика, что уже работает
 * в «Регламенте» (components/admin/regulations-board.tsx), просто вынесена
 * сюда, чтобы диспетчер мог её переиспользовать.
 */
export function getDayType(d: Date, sundayActive: boolean): DayType {
  if (d.getDay() === 0) return sundayActive ? 'sunday_active' : 'day_off';
  if (isProductionWeekday(d)) return 'production';
  return 'installation';
}

/** Есть ли среди заявок этой недели незавершённые — тогда воскресенье рабочее. */
export function shouldActivateSunday(
  weekStartISO: string,
  requests: { install_date: string | null; status: RequestStatus }[]
): boolean {
  const weekEnd = toISODate(addDays(new Date(weekStartISO), 6));
  const weekRequests = requests.filter(
    (r) => r.install_date && r.install_date >= weekStartISO && r.install_date <= weekEnd
  );
  if (weekRequests.length === 0) return false;
  return weekRequests.some((r) => r.status !== 'done' && r.status !== 'lost');
}

// ---------------------------------------------------------------------
// Очередь производства: распределение заявок по производственным дням
// ---------------------------------------------------------------------

export interface DispatchableRequest {
  id: string;
  created_at: string;
  status: RequestStatus;
  manual_override: boolean;
  install_date: string | null;
  production_day: string | null;
}

export interface QueuePlacement {
  requestId: string;
  productionDay: string; // ISO, пн/ср/пт
  installDay: string; // productionDay + 1 (вт/чт/сб)
  source: 'pinned_manual' | 'carryover' | 'existing' | 'new';
}

const BASE_DAILY_CAP = 2;
const ESCALATED_DAILY_CAP = 3;
const WEEK_ESCALATION_THRESHOLD = 6;
const MAX_WEEKLY_OBJECTS = 9;
const MAX_WEEKS_LOOKAHEAD = 20;

/**
 * Распределяет заявки по производственным дням (пн/ср/пт) по правилам:
 * 2 объекта/день, эскалация до 3/день, если на неделе получается больше 6,
 * жёсткий потолок 3/день и 9/неделю, переполнение — на следующую неделю.
 *
 * Уже размещённые заявки (production_day в будущем/текущей неделе) не
 * трогаются повторным запуском — иначе план дёргался бы на каждый клик
 * «Обновить план». Заявки с production_day в прошлой (уже закрытой) неделе,
 * которые всё ещё не done, — это «незавершённые объекты»: они переносятся и
 * ставятся первыми в очередь текущей недели (приоритет над новыми).
 * manual_override-заявки (менеджер выставил дату вручную) никогда не
 * двигаются, но учитываются в загрузке своего дня.
 */
export function computeQueuePlacement(requests: DispatchableRequest[], today: Date): QueuePlacement[] {
  const currentWeekStart = toISODate(startOfWeek(today));
  const todayISO = toISODate(today);

  const pinned: DispatchableRequest[] = [];
  const existing: DispatchableRequest[] = [];
  const carryover: DispatchableRequest[] = [];
  const fresh: DispatchableRequest[] = [];

  for (const r of requests) {
    if (r.status !== 'in_production') continue;
    if (r.manual_override && r.install_date) {
      pinned.push(r);
    } else if (r.production_day && toISODate(startOfWeek(new Date(r.production_day))) < currentWeekStart) {
      carryover.push(r);
    } else if (r.production_day) {
      existing.push(r);
    } else {
      fresh.push(r);
    }
  }

  carryover.sort((a, b) => a.created_at.localeCompare(b.created_at));
  fresh.sort((a, b) => a.created_at.localeCompare(b.created_at));

  const placements: QueuePlacement[] = [];
  const toDate = (iso: string) => new Date(iso);

  const pushPlacement = (requestId: string, productionDay: Date, source: QueuePlacement['source']) => {
    placements.push({
      requestId,
      productionDay: toISODate(productionDay),
      installDay: toISODate(addDays(productionDay, 1)),
      source,
    });
  };

  // Уже размещённые (не двигаем), но учитываем в загрузке дней.
  const lockedByDay = new Map<string, number>();
  const bump = (iso: string) => lockedByDay.set(iso, (lockedByDay.get(iso) ?? 0) + 1);
  for (const r of pinned) {
    bump(r.install_date as string);
    pushPlacement(r.id, toDate(r.install_date as string), 'pinned_manual');
  }
  for (const r of existing) {
    bump(r.production_day as string);
    pushPlacement(r.id, toDate(r.production_day as string), 'existing');
  }

  const queue = [...carryover, ...fresh];
  let cursorWeekStart = toDate(currentWeekStart);

  for (let week = 0; week < MAX_WEEKS_LOOKAHEAD && queue.length > 0; week++) {
    const weekDays = [
      addDays(cursorWeekStart, 0), // пн
      addDays(cursorWeekStart, 2), // ср
      addDays(cursorWeekStart, 4), // пт
    ];

    const lockedThisWeek = weekDays.reduce((sum, d) => sum + (lockedByDay.get(toISODate(d)) ?? 0), 0);

    // Проход 1: обычный норматив 2/день. Проход 2 (если после первого
    // прохода на неделе выходит больше 6 объектов): эскалированный 3/день.
    let placedThisWeek: { day: Date; requestId: string; source: QueuePlacement['source'] }[] = [];
    let dailyCap = BASE_DAILY_CAP;

    for (let pass = 0; pass < 2; pass++) {
      placedThisWeek = [];
      let remainingQueueIdx = 0;
      let weekTotal = lockedThisWeek;

      for (const day of weekDays) {
        const dayISO = toISODate(day);
        let dayLoad = lockedByDay.get(dayISO) ?? 0;
        // Прошедшие дни недели не заполняем новыми/перенесёнными объектами
        // (их загрузка уже зафиксирована в lockedByDay), только будущие и сегодня.
        while (
          dayISO >= todayISO &&
          dayLoad < dailyCap &&
          weekTotal < MAX_WEEKLY_OBJECTS &&
          remainingQueueIdx < queue.length
        ) {
          const item = queue[remainingQueueIdx];
          placedThisWeek.push({ day, requestId: item.id, source: carryover.includes(item) ? 'carryover' : 'new' });
          dayLoad++;
          weekTotal++;
          remainingQueueIdx++;
        }
      }

      // Эскалируем норматив, если неделя реально набрала больше 6 объектов
      // (например, закреплённых вручную), либо если очередь на этой неделе
      // упёрлась в потолок 2/день, а спрос ещё остался — тогда повышенный
      // норматив 3/день позволит вместить больше объектов именно на этой
      // неделе, а не переносить их на следующую без необходимости.
      const queueStillHasDemand = remainingQueueIdx < queue.length;
      const weekIsFull = weekTotal >= WEEK_ESCALATION_THRESHOLD;
      if (pass === 0 && dailyCap < ESCALATED_DAILY_CAP && (weekTotal > WEEK_ESCALATION_THRESHOLD || (weekIsFull && queueStillHasDemand))) {
        dailyCap = ESCALATED_DAILY_CAP;
        continue; // пересчитываем неделю с повышенным нормативом
      }
      break;
    }

    for (const p of placedThisWeek) {
      pushPlacement(p.requestId, p.day, p.source);
    }
    queue.splice(0, placedThisWeek.length);

    cursorWeekStart = addDays(cursorWeekStart, 7);
  }

  return placements;
}

// ---------------------------------------------------------------------
// Универсальная цепочка производственных этапов
// ---------------------------------------------------------------------

export type FulfillmentMode = 'installation' | 'shipping';

export interface StageDef {
  key: string;
  name: string;
  tier: number;
  dependsOn: string[];
}

// Печать букв/Фрезеровка → Сварка/Покраска → Пайка/Сборка →
// Монтаж-или-Отправка → (Фотоотчёт/Полная оплата/Закрытие — уже есть в
// requests как finished_photo_url/fully_paid/status='done', отдельными
// операциями не дублируются).
export const STAGE_DEFS: StageDef[] = [
  { key: 'design', name: 'Дизайн', tier: 1, dependsOn: [] },
  { key: 'letter_print', name: 'Печать букв', tier: 2, dependsOn: ['design'] },
  { key: 'milling', name: 'Фрезеровка', tier: 2, dependsOn: ['design'] },
  { key: 'welding', name: 'Сварка', tier: 3, dependsOn: ['letter_print', 'milling'] },
  { key: 'painting', name: 'Покраска', tier: 3, dependsOn: ['letter_print', 'milling'] },
  { key: 'soldering', name: 'Пайка', tier: 4, dependsOn: ['welding', 'painting'] },
  { key: 'assembly', name: 'Сборка', tier: 4, dependsOn: ['welding', 'painting'] },
  { key: 'installation', name: 'Монтаж', tier: 5, dependsOn: ['soldering', 'assembly'] },
  { key: 'shipping', name: 'Отправка', tier: 5, dependsOn: ['soldering', 'assembly'] },
];

export function getStageChain(fulfillmentMode: FulfillmentMode): StageDef[] {
  const excluded = fulfillmentMode === 'installation' ? 'shipping' : 'installation';
  return STAGE_DEFS.filter((s) => s.key !== excluded);
}

export interface NewOperationRow {
  request_id: string;
  key: string;
  name: string;
  depends_on_keys: string[];
  required: boolean;
  allows_parallel: boolean;
  status: 'locked' | 'available';
}

export function buildOperationsForRequest(request: { id: string; fulfillment_mode: FulfillmentMode }): NewOperationRow[] {
  return getStageChain(request.fulfillment_mode).map((s) => ({
    request_id: request.id,
    key: s.key,
    name: s.name,
    depends_on_keys: s.dependsOn,
    required: true,
    allows_parallel: s.tier >= 2 && s.tier <= 4,
    status: s.dependsOn.length === 0 ? 'available' : 'locked',
  }));
}

// ---------------------------------------------------------------------
// Автоназначение сотрудников
// ---------------------------------------------------------------------

export interface Competency {
  employeeId: string;
  stageKey: string;
  rank: number; // 1 = основная/сильнейшая компетенция
}

export interface ActiveOperation {
  id: string;
  requestId: string;
  key: string;
  status: 'locked' | 'available' | 'in_progress' | 'done';
  assignedEmployeeId: string | null;
}

export interface EmployeeForAssignment {
  id: string;
  fullName: string;
}

export interface AssignmentResult {
  assignments: Map<string, string>; // operationId -> employeeId
  idleEmployeeIds: string[];
  understaffedStages: string[];
}

const STAGE_ORDER = STAGE_DEFS.map((s) => s.key);

/**
 * Назначает свободных (available, без исполнителя) операций сотрудникам:
 * 1) среди тех, у кого есть прямая компетенция на этап — берём с
 *    наименьшим rank (наивысшая компетенция), при равенстве — менее
 *    загруженного;
 * 2) сотрудников без своей задачи на сегодня доназначаем на участок из их
 *    компетенций с максимальным дефицитом свободных рук (правило «после
 *    завершения задачи — помогает самому загруженному участку»);
 * 3) если на этап вообще нет прямых компетенций — фолбэк на сотрудников с
 *    компетенцией 'helper' (вспомогательные производственные работы).
 */
export function assignEmployees(
  operations: ActiveOperation[],
  competencies: Competency[],
  employees: EmployeeForAssignment[]
): AssignmentResult {
  const byEmployee = new Map<string, Competency[]>();
  for (const c of competencies) {
    if (!byEmployee.has(c.employeeId)) byEmployee.set(c.employeeId, []);
    byEmployee.get(c.employeeId)!.push(c);
  }

  const load = new Map<string, number>();
  for (const e of employees) load.set(e.id, 0);
  for (const op of operations) {
    if (op.assignedEmployeeId && (op.status === 'in_progress' || op.status === 'done')) {
      load.set(op.assignedEmployeeId, (load.get(op.assignedEmployeeId) ?? 0) + 1);
    }
  }

  const assignments = new Map<string, string>();
  const availableByStage = new Map<string, ActiveOperation[]>();
  for (const op of operations) {
    if (op.status !== 'available' || op.assignedEmployeeId) continue;
    if (!availableByStage.has(op.key)) availableByStage.set(op.key, []);
    availableByStage.get(op.key)!.push(op);
  }

  function candidatesFor(stageKey: string): { employeeId: string; rank: number }[] {
    const direct = employees
      .map((e) => {
        const comp = (byEmployee.get(e.id) ?? []).find((c) => c.stageKey === stageKey);
        return comp ? { employeeId: e.id, rank: comp.rank } : null;
      })
      .filter((x): x is { employeeId: string; rank: number } => x !== null);
    if (direct.length > 0) return direct;
    return employees
      .filter((e) => (byEmployee.get(e.id) ?? []).some((c) => c.stageKey === 'helper'))
      .map((e) => ({ employeeId: e.id, rank: 100 }));
  }

  for (const stageKey of STAGE_ORDER) {
    const ops = availableByStage.get(stageKey) ?? [];
    for (const op of ops) {
      const candidates = candidatesFor(stageKey).sort(
        (a, b) => a.rank - b.rank || (load.get(a.employeeId) ?? 0) - (load.get(b.employeeId) ?? 0)
      );
      const pick = candidates[0];
      if (pick) {
        assignments.set(op.id, pick.employeeId);
        load.set(pick.employeeId, (load.get(pick.employeeId) ?? 0) + 1);
      }
    }
  }

  // Правило 4: свободные сотрудники помогают самому загруженному участку
  // из своих компетенций.
  const deficitByStage = new Map<string, number>();
  for (const [stageKey, ops] of availableByStage) {
    const coveredHere = ops.filter((o) => assignments.has(o.id)).length;
    deficitByStage.set(stageKey, ops.length - coveredHere);
  }

  for (const e of employees) {
    if ((load.get(e.id) ?? 0) > 0) continue;
    const myStages = (byEmployee.get(e.id) ?? []).map((c) => c.stageKey).filter((k) => k !== 'helper');
    let bestStage: string | null = null;
    let bestDeficit = 0;
    for (const stageKey of myStages) {
      const deficit = deficitByStage.get(stageKey) ?? 0;
      if (deficit > bestDeficit) {
        bestDeficit = deficit;
        bestStage = stageKey;
      }
    }
    if (!bestStage) continue;
    const op = (availableByStage.get(bestStage) ?? []).find((o) => !assignments.has(o.id));
    if (op) {
      assignments.set(op.id, e.id);
      load.set(e.id, (load.get(e.id) ?? 0) + 1);
      deficitByStage.set(bestStage, (deficitByStage.get(bestStage) ?? 1) - 1);
    }
  }

  const idleEmployeeIds = employees.filter((e) => (load.get(e.id) ?? 0) === 0).map((e) => e.id);
  const understaffedStages = [...availableByStage.entries()]
    .filter(([, ops]) => ops.some((o) => !assignments.has(o.id)))
    .map(([stageKey]) => stageKey);

  return { assignments, idleEmployeeIds, understaffedStages };
}
