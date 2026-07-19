'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Employee, EmployeeRole, Role } from '@/lib/types';

export function StaffBoard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [employeeRoles, setEmployeeRoles] = useState<EmployeeRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const supabase = createClient();

  async function loadAll() {
    setLoading(true);
    const [{ data: emp }, { data: rl }, { data: er }] = await Promise.all([
      supabase.from('employees').select('*').order('created_at'),
      supabase.from('roles').select('*').eq('active', true).order('name'),
      supabase.from('employee_roles').select('*, role:roles(*)').is('unassigned_at', null),
    ]);
    setEmployees((emp as Employee[]) ?? []);
    setRoles((rl as Role[]) ?? []);
    setEmployeeRoles((er as EmployeeRole[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd() {
    if (!fullName.trim()) return;
    await supabase.from('employees').insert({ full_name: fullName, phone: phone || null });
    setFullName('');
    setPhone('');
    setShowAdd(false);
    loadAll();
  }

  async function handleStatusChange(id: string, status: Employee['status']) {
    await supabase.from('employees').update({ status }).eq('id', id);
    loadAll();
  }

  async function toggleRole(employeeId: string, roleId: string, currentlyAssigned: EmployeeRole | undefined) {
    if (currentlyAssigned) {
      await supabase.from('employee_roles').update({ unassigned_at: new Date().toISOString() }).eq('id', currentlyAssigned.id);
    } else {
      await supabase.from('employee_roles').insert({ employee_id: employeeId, role_id: roleId });
    }
    loadAll();
  }

  if (loading) return <p className="text-muted-foreground">Загрузка…</p>;

  return (
    <div className="space-y-6">
      {showAdd ? (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>ФИО</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иван Иванов" />
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 777 123 45 67" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Отмена</Button>
              <Button onClick={handleAdd}>Добавить сотрудника</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Личный логин создаётся отдельно в Supabase Authentication (как для менеджера), затем привяжется к этой записи по auth_user_id.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowAdd(true)}><Plus className="mr-1 h-4 w-4" /> Добавить сотрудника</Button>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((emp) => {
          const assigned = employeeRoles.filter((er) => er.employee_id === emp.id);
          return (
            <Card key={emp.id}>
              <CardContent className="space-y-3 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-navy-900">{emp.full_name}</h3>
                  <select
                    value={emp.status}
                    onChange={(e) => handleStatusChange(emp.id, e.target.value as Employee['status'])}
                    className="rounded-full border border-border bg-white px-2 py-1 text-xs"
                  >
                    <option value="working">Работает</option>
                    <option value="vacation">Отпуск</option>
                    <option value="fired">Уволен</option>
                  </select>
                </div>
                {emp.phone && <p className="text-sm text-muted-foreground">{emp.phone}</p>}
                {emp.is_admin && <Badge variant="success">Админ</Badge>}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {roles.map((role) => {
                    const current = assigned.find((a) => a.role_id === role.id);
                    return (
                      <button
                        key={role.id}
                        onClick={() => toggleRole(emp.id, role.id, current)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          current ? 'bg-blue-gradient text-white' : 'bg-mist-100 text-navy-700 hover:bg-mist-200'
                        }`}
                      >
                        {role.name}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
