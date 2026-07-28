'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Zap, AlertTriangle, Coffee } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import {
  STAGE_DEFS,
  toISODate,
  startOfWeek,
  getDayType,
  shouldActivateSunday,
  computeQueuePlacement,
  buildOperationsForRequest,
  assignEmployees,
  type DayType,
  type QueuePlacement,
  type DispatchableRequest,
  type ActiveOperation,
  type Competency,
} from '@/lib/dispatcher';
import type { ERPRequest, Employee, EmployeeCompetency, OrderOperation, RequestStatus } from '@/lib/types';

const STAGE_NAME: Record<string, string> = Object.fromEntries(STAGE_DEFS.map((s) => [s.key, s.name]));

const DAY_TYPE_LABEL: Record<DayType, string> = {
  production: 'Производственный день (пн/ср/пт)',
  installation: 'Монтажный день (вт/чт/сб)',
  sunday_active: 'Воскресенье — рабочий день (план недели не закрыт)',
  day_off: 'Выходной — план недели выполнен',
};

export function DispatcherBoard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [competencies, setCompetencies] = useState<EmployeeCompetency[]>([]);
  const [requests, setRequests] = useState<ERPRequest[]>([]);
  const [weekRequests, setWeekRequests] = useState<{ install_date: string | null; status: RequestStatus }[]>([]);
  const [operations, setOperations] = useState<OrderOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const supabase = createClient();
  const today = useMemo(() => new Date(), []);
  const todayISO = toISODate(today);
  const weekStartISO = toISODate(startOfWeek(today));

  async function loadAll() {
    setLoading(true);
    const weekEnd = toISODate(new Date(new Date(weekStartISO).setDate(new Date(weekStartISO).getDate() + 6)));

    const [{ data: emp }, { data: comp }, { data: reqs }, { data: weekReqs }] = await Promise.all([
      supabase.from('employees').select('*').eq('status', 'working').order('full_name'),
      supabase.from('employee_competencies').select('*'),
      supabase.from('requests').select('*').eq('status', 'in_production').order('created_at'),
      supabase.from('requests').select('install_date, status').gte('install_date', weekStartISO).lte('install_date', weekEnd),
    ]);

    const employeesList = (emp as Employee[]) ?? [];
    const competenciesList = (comp as EmployeeCompetency[]) ?? [];
    const requestsList = (reqs as ERPRequest[]) ?? [];

    setEmployees(employeesList);
    setCompetencies(competenciesList);
    setRequests(requestsList);
    setWeekRequests((weekReqs as { install_date: string | null; status: RequestStatus }[]) ?? []);

    if (requestsList.length > 0) {
      const { data: ops } = await supabase
        .from('order_operations')
        .select('*')
        .in('request_id', requestsList.map((r) => r.id));
      setOperations((ops as OrderOperation[]) ?? []);
    } else {
      setOperations([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Компетентные сотрудники диспетчера — только те, у кого есть хотя бы
  // одна компетенция (так Мазлов автоматически остаётся вне схемы).
  const dispatchableEmployees = useMemo(
    () => employees.filter((e) => competencies.some((c) => c.employee_id === e.id)),
    [employees, competencies]
  );

  const sundayActive = shouldActivateSunday(weekStartISO, weekRequests);
  const dayType = getDayType(today, sundayActive);

  const placements = useMemo(() => {
    const dispatchable: DispatchableRequest[] = requests.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      status: r.status,
      manual_override: r.manual_override,
      install_date: r.install_date,
      production_day: r.production_day,
    }));
    return computeQueuePlacement(dispatchable, today);
  }, [requests, today]);

  const placementByRequest = useMemo(() => new Map(placements.map((p) => [p.requestId, p])), [placements]);

  const activeToday = useMemo(() => {
    if (dayType === 'day_off') return [];
    if (dayType === 'sunday_active') {
      // Воскресенье — резерв для всего, что не завершено на этой неделе.
      return requests.filter((r) => {
        const p = placementByRequest.get(r.id);
        return p && (p.productionDay <= todayISO || p.installDay <= todayISO);
      });
    }
    if (dayType === 'production') {
      return requests.filter((r) => placementByRequest.get(r.id)?.productionDay === todayISO);
    }
    return requests.filter((r) => placementByRequest.get(r.id)?.installDay === todayISO);
  }, [dayType, requests, placementByRequest, todayISO]);

  const activeOperations: ActiveOperation[] = useMemo(
    () =>
      operations
        .filter((o) => o.request_id && activeToday.some((r) => r.id === o.request_id))
        .map((o) => ({
          id: o.id,
          requestId: o.request_id as string,
          key: o.key,
          status: o.status,
          assignedEmployeeId: o.assigned_employee_id,
        })),
    [operations, activeToday]
  );

  const assignmentResult = useMemo(() => {
    const comp: Competency[] = competencies.map((c) => ({ employeeId: c.employee_id, stageKey: c.stage_key, rank: c.rank }));
    return assignEmployees(
      activeOperations,
      comp,
      dispatchableEmployees.map((e) => ({ id: e.id, fullName: e.full_name }))
    );
  }, [activeOperations, competencies, dispatchableEmployees]);

  async function handleUpdatePlan() {
    setUpdating(true);
    try {
      // 1. Персистим только новые/перенесённые размещения — те, что уже
      // стоят на своём месте (existing/pinned_manual), не трогаем.
      for (const p of placements) {
        if (p.source !== 'new' && p.source !== 'carryover') continue;
        const req = requests.find((r) => r.id === p.requestId);
        if (!req) continue;
        const update: Record<string, unknown> = {
          production_day: p.productionDay,
          recommended_install_date: p.productionDay,
        };
        if (!req.manual_override) update.install_date = p.productionDay;
        await supabase.from('requests').update(update).eq('id', p.requestId);
      }

      // 2. Создаём цепочку операций для заявок, у которых её ещё нет.
      const requestIdsWithOps = new Set(operations.filter((o) => o.request_id).map((o) => o.request_id));
      const toCreate = requests.filter((r) => !requestIdsWithOps.has(r.id));
      for (const r of toCreate) {
        const rows = buildOperationsForRequest({ id: r.id, fulfillment_mode: r.fulfillment_mode });
        await supabase.from('order_operations').insert(rows);
      }

      // 3. Перезагружаем и назначаем сотрудников на сегодняшние доступные операции.
      await loadAll();
    } finally {
      setUpdating(false);
    }
  }

  async function persistAssignments() {
    if (assignmentResult.assignments.size === 0) return;
    setUpdating(true);
    try {
      for (const [operationId, employeeId] of assignmentResult.assignments) {
        await supabase.from('order_operations').update({ assigned_employee_id: employeeId }).eq('id', operationId);
      }
      await loadAll();
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Загрузка…</p>;

  const dueToday = requests.filter((r) => placementByRequest.get(r.id)?.installDay === todayISO);
  const overloadByCount = activeToday.length > 3;
  const understaffed = assignmentResult.understaffedStages;
  const overload = overloadByCount || understaffed.length > 0;

  return (
    <div className="max-w-4xl space-y-6">
      {/* 1-2. Дата и тип дня */}
      <Card>
        <CardContent className="space-y-1 pt-5">
          <h2 className="text-lg font-semibold text-navy-900">{formatDate(todayISO)}</h2>
          <p className="text-sm text-muted-foreground">{DAY_TYPE_LABEL[dayType]}</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleUpdatePlan} disabled={updating}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> {updating ? 'Обновляем…' : 'Обновить план'}
        </Button>
      </div>

      {/* 3. Активные объекты */}
      <Section title="Активные объекты сегодня">
        {activeToday.length === 0 && <Empty text="Сегодня нет активных объектов." />}
        <div className="space-y-2">
          {activeToday.map((r) => (
            <ObjectRow key={r.id} request={r} placement={placementByRequest.get(r.id)} />
          ))}
        </div>
      </Section>

      {/* 4. План производства */}
      <Section title="План производства">
        {dayType !== 'production' && dayType !== 'sunday_active' && <Empty text="Сегодня не производственный день." />}
        {(dayType === 'production' || dayType === 'sunday_active') && (
          <div className="space-y-3">
            {activeToday.map((r) => {
              const ops = operations.filter((o) => o.request_id === r.id);
              return (
                <div key={r.id} className="rounded-lg border border-border px-3 py-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-medium text-navy-900">{r.name}</span>
                    {r.urgent && <Badge variant="danger">Срочно — доп. смена 20:00–23:59</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ops.length === 0 && <span className="text-xs text-muted-foreground">Цепочка этапов ещё не создана — нажмите «Обновить план»</span>}
                    {ops.map((op) => (
                      <StageChip key={op.id} op={op} employeeName={employees.find((e) => e.id === op.assigned_employee_id)?.full_name} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* 5. План монтажей / отправок */}
      <Section title="План монтажей и отправок">
        {dayType !== 'installation' && dayType !== 'sunday_active' && <Empty text="Сегодня не монтажный день." />}
        {(dayType === 'installation' || dayType === 'sunday_active') && (
          <div className="space-y-2">
            {activeToday.length === 0 && <Empty text="Нет объектов к монтажу/отправке сегодня." />}
            {activeToday.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-navy-800">{r.name}</span>
                <Badge>{r.fulfillment_mode === 'shipping' ? 'Отправка' : 'Монтаж'}</Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 6-7. Распределение сотрудников и этапы */}
      <Section
        title="Распределение сотрудников"
        action={
          assignmentResult.assignments.size > 0 && (
            <Button size="sm" variant="secondary" onClick={persistAssignments} disabled={updating}>
              Сохранить назначения
            </Button>
          )
        }
      >
        {dispatchableEmployees.length === 0 && <Empty text="Нет сотрудников с заведёнными компетенциями." />}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dispatchableEmployees.map((e) => {
            const myOps = activeOperations.filter(
              (o) => o.assignedEmployeeId === e.id || assignmentResult.assignments.get(o.id) === e.id
            );
            const isIdle = assignmentResult.idleEmployeeIds.includes(e.id);
            return (
              <div key={e.id} className="rounded-lg border border-border px-3 py-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-navy-900">{e.full_name}</span>
                  {isIdle ? (
                    <Badge>Свободен</Badge>
                  ) : (
                    <Badge variant="success">{myOps.length} операц.</Badge>
                  )}
                </div>
                {myOps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Нет назначенных этапов сегодня.</p>
                ) : (
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {myOps.map((o) => {
                      const req = activeToday.find((r) => r.id === o.requestId);
                      return (
                        <li key={o.id}>
                          {STAGE_NAME[o.key] ?? o.key} — {req?.name ?? ''}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* 8. Что должно быть завершено сегодня */}
      <Section title="Объекты, которые должны быть завершены сегодня">
        {dueToday.length === 0 && <Empty text="Сегодня нет объектов с монтажом/отправкой." />}
        <div className="space-y-2">
          {dueToday.map((r) => (
            <div key={r.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-navy-800">{r.name}</span>
                {r.urgent && <Zap className="h-4 w-4 text-amber-600" />}
              </div>
              <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                <span>{r.finished_photo_url ? '✓ фотоотчёт' : '— нет фотоотчёта'}</span>
                <span>{r.fully_paid ? '✓ оплачено полностью' : '— оплата не закрыта'}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 9. Перегрузка */}
      <Section title="Перегрузка производства">
        {!overload && <Empty text="Перегрузки нет." />}
        {overload && (
          <div className="space-y-2 text-sm">
            {overloadByCount && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Сегодня активно {activeToday.length} объектов — больше нормативного максимума (3).
              </div>
            )}
            {understaffed.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Не хватает свободных специалистов на этапах: {understaffed.map((k) => STAGE_NAME[k] ?? k).join(', ')}.
              </div>
            )}
          </div>
        )}
      </Section>

      {/* 10. Свободные сотрудники */}
      <Section title="Свободные сотрудники">
        {assignmentResult.idleEmployeeIds.length === 0 ? (
          <Empty text="Все сотрудники задействованы." />
        ) : (
          <div className="space-y-2">
            {assignmentResult.idleEmployeeIds.map((id) => {
              const e = dispatchableEmployees.find((emp) => emp.id === id);
              if (!e) return null;
              const stages = competencies.filter((c) => c.employee_id === id && c.stage_key !== 'helper').map((c) => STAGE_NAME[c.stage_key] ?? c.stage_key);
              return (
                <div key={id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <Coffee className="h-4 w-4 text-muted-foreground" />
                  <span className="text-navy-800">{e.full_name}</span>
                  <span className="text-xs text-muted-foreground">— может помочь: {stages.join(', ') || '—'}</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">{title}</h2>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function ObjectRow({ request, placement }: { request: ERPRequest; placement?: QueuePlacement }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-navy-800">{request.name}</span>
        {request.urgent && <Badge variant="danger">Срочно</Badge>}
        {request.manual_override && <Badge>Дата вручную</Badge>}
      </div>
      <span className="text-xs text-muted-foreground">
        {placement ? `Производство ${formatDate(placement.productionDay)} · Монтаж ${formatDate(placement.installDay)}` : 'Дата не назначена'}
      </span>
    </div>
  );
}

function StageChip({ op, employeeName }: { op: OrderOperation; employeeName?: string }) {
  const style =
    op.status === 'done'
      ? 'bg-emerald-50 text-emerald-700'
      : op.status === 'in_progress'
        ? 'bg-blue-50 text-blue-700'
        : op.status === 'available'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-mist-100 text-muted-foreground';
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {STAGE_NAME[op.key] ?? op.key}
      {employeeName ? ` — ${employeeName}` : ''}
    </span>
  );
}
