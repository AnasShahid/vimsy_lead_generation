import { Header } from '../components/layout/Header';

export function OutreachPage() {
  return (
    <div>
      <Header title="Step 5: Email Outreach" subtitle="Automated cold email sequences" />
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Coming Soon</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            This step will send a 4-email sequence over 14 days with personalized content,
            attached PDF reports, and tracking links.
          </p>
        </div>
      </div>
    </div>
  );
}
