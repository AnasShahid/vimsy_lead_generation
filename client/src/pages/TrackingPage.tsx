import { Header } from '../components/layout/Header';

export function TrackingPage() {
  return (
    <div>
      <Header title="Step 6: Response Tracking" subtitle="Monitor email opens, clicks, and responses" />
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Coming Soon</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            This step will track email delivery, opens, clicks, responses, and conversions
            with a monitoring dashboard and Slack notifications.
          </p>
        </div>
      </div>
    </div>
  );
}
