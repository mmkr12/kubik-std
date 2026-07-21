import { MaterialsKnowledgeBoard } from '@/components/admin/materials-knowledge-board';

export default function AdminMaterialsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">База материалов</h1>
      <MaterialsKnowledgeBoard />
    </div>
  );
}
