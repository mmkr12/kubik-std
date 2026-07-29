// Единая точка проверки ошибок Supabase-запросов в клиентских
// компонентах. Раньше почти везде проверялся только "data" из ответа —
// если запись падала (нет прав, оборвалась сеть), код продолжал
// работать так, будто всё сохранилось (диалог закрывался, поле
// очищалось), и никто об этом не узнавал.
//
// Использование: const { error } = await supabase.from(...).insert(...);
// if (reportSupabaseError('Не удалось сохранить сотрудника', error)) return;
export function reportSupabaseError(action: string, error: { message: string } | null): boolean {
  if (!error) return false;
  console.error(action, error);
  window.alert(`${action}: ${error.message}`);
  return true;
}
