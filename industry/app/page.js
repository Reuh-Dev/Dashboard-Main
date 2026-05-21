import records from '@/data/ind_services.json';
import QADashboard from '@/components/QADashboard';

export default function Page() {
  return <QADashboard records={records} />;
}
