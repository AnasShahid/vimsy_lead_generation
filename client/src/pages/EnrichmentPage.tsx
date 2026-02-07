import { Header } from '../components/layout/Header';

export function EnrichmentPage() {
  return (
    <div>
      <Header title="Step 2: Contact Enrichment" subtitle="Find decision-maker emails and company data" />
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Coming Soon</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            This step will use Hunter.io and Clearbit APIs to find contact emails,
            company information, and decision-maker details for discovered WordPress sites.
          </p>
        </div>
      </div>
    </div>
  );
}
