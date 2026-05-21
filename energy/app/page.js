import records from '@/data/enr_services.json';
import QADashboard from '@/components/QADashboard';

export default function Page() {
  return <QADashboard records={records} />;
}
