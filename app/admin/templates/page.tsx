import { OperationTemplatesBoard } from '@/components/admin/operation-templates-board';

export default function AdminTemplatesPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-navy-900">Технологические карты</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Для каждого типа изделия — цепочка операций. В поле «Ключи-зависимости» укажите через запятую ключи операций, которые должны быть выполнены раньше (посмотреть ключ можно внизу карточки операции).
      </p>
      <OperationTemplatesBoard />
    </div>
  );
}
