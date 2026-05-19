import records from '@/data/economy_and_trade_services.json';
import QADashboard from '@/components/QADashboard';

export default function Page() {
  return <QADashboard records={records} />;
}
