import records from '@/data/tel_services.json';
import QADashboard from '@/components/QADashboard';

export default function Page() {
  return <QADashboard records={records} />;
}
