import records from '@/data/tou_required_ducuments.json';
import QADashboard from '@/components/QADashboard';

export default function Page() {
  return <QADashboard records={records} />;
}
