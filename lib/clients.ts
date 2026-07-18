import { createClient } from '@/lib/supabase/client';

// Клиент идентифицируется по номеру телефона: если заявка от того же
// номера — это тот же клиент, его карточка накапливает все заявки.
export async function findOrCreateClient(phone: string, name?: string) {
  const supabase = createClient();
  const normalizedPhone = phone.trim();

  const { data: existing } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', normalizedPhone)
    .maybeSingle();

  if (existing) {
    // Если имя раньше не было указано, а сейчас пришло — дозаполним.
    if (!existing.name && name) {
      await supabase.from('clients').update({ name }).eq('id', existing.id);
    }
    return existing;
  }

  const { data: created, error } = await supabase
    .from('clients')
    .insert({ phone: normalizedPhone, name: name || null })
    .select('*')
    .single();

  if (error) throw error;
  return created;
}
