import { Header } from '../components/layout/Header';

export function ReportsPage() {
  return (
    <div>
      <Header title="Step 4: PDF Reports" subtitle="Generate branded analysis reports" />
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Coming Soon</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            This step will generate 7-page branded PDF reports with performance scores,
            security analysis, SEO findings, and Vimsy recommendations.
          </p>
        </div>
      </div>
    </div>
  );
}
