import { Header } from '../components/layout/Header';

export function AnalysisPage() {
  return (
    <div>
      <Header title="Step 3: Technical Analysis" subtitle="Performance, security, and SEO scoring" />
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Coming Soon</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            This step will run PageSpeed Insights, SSL analysis, and WordPress version checks
            to generate a 0-100 health score for each site.
          </p>
        </div>
      </div>
    </div>
  );
}
