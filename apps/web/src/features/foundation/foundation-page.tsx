import { useQuery } from '@tanstack/react-query';
import { fetchApiHealth } from '../../services/api-client';

function Status({ label, path }: { label: string; path: 'live' | 'ready' }) {
  const query = useQuery({ queryKey: ['api-health', path], queryFn: () => fetchApiHealth(path), refetchInterval: 15000 });
  const state = query.isPending ? 'Đang kiểm tra' : query.isError ? 'Chưa sẵn sàng' : 'Hoạt động';
  return <div className="status-row">
    <span>{label}</span>
    <strong className={query.isSuccess ? 'ok' : 'pending'}>{state}</strong>
  </div>;
}

export function FoundationPage() {
  return <main className="page">
    <div className="eyebrow">HIREBIT / FOUNDATION</div>
    <h1>Nền tảng đã sẵn sàng để xây dựng.</h1>
    <p>Frontend React đang chạy. Trang này theo dõi liveness và readiness của NestJS API.</p>
    <section className="card" aria-label="Trạng thái dịch vụ">
      <h2>Trạng thái dịch vụ</h2>
      <Status label="API process" path="live" />
      <Status label="PostgreSQL + Redis" path="ready" />
    </section>
  </main>;
}
