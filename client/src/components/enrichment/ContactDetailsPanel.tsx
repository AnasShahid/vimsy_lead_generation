import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, HelpCircle, Linkedin, ExternalLink, Phone, Mail, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface Contact {
  id: number;
  site_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  position: string | null;
  position_raw: string | null;
  seniority: string | null;
  department: string | null;
  type: string | null;
  confidence: number | null;
  linkedin_url: string | null;
  twitter: string | null;
  phone_number: string | null;
  verification_status: string | null;
  verification_date: string | null;
  enrichment_source: string;
}

function VerificationBadge({ status }: { status: string | null }) {
  if (status === 'valid') {
    return (
      <span className="inline-flex items-center gap-0.5 text-green-600" title="Verified">
        <CheckCircle size={12} />
        <span className="text-[10px] font-medium">Verified</span>
      </span>
    );
  }
  if (status === 'accept_all') {
    return (
      <span className="inline-flex items-center gap-0.5 text-yellow-600" title="Accept All">
        <AlertCircle size={12} />
        <span className="text-[10px] font-medium">Accept All</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-gray-400" title={status || 'Unknown'}>
      <HelpCircle size={12} />
      <span className="text-[10px] font-medium">{status || 'Unknown'}</span>
    </span>
  );
}

function SeniorityBadge({ seniority }: { seniority: string | null }) {
  if (!seniority) return null;
  const colors: Record<string, string> = {
    executive: 'bg-purple-100 text-purple-700 border-purple-200',
    senior: 'bg-blue-100 text-blue-700 border-blue-200',
    junior: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  const cls = colors[seniority] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>
      {seniority.charAt(0).toUpperCase() + seniority.slice(1)}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number | null }) {
  if (confidence === null || confidence === undefined) return <span className="text-xs text-gray-400">-</span>;
  const color = confidence >= 80 ? 'bg-green-500' : confidence >= 50 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${confidence}%` }} />
      </div>
      <span className="text-[10px] text-gray-500 font-medium">{confidence}%</span>
    </div>
  );
}

interface ContactDetailsPanelProps {
  siteId: number;
}

export function ContactDetailsPanel({ siteId }: ContactDetailsPanelProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.getContactsForSite(siteId)
      .then(res => {
        if (!cancelled) {
          setContacts(res.data || []);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [siteId]);

  if (loading) {
    return (
      <div className="px-6 py-4 bg-gray-50 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={14} className="animate-spin" />
        Loading contacts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-4 bg-red-50 text-sm text-red-600">
        Error loading contacts: {error}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="px-6 py-6 bg-gray-50 text-center">
        <Mail size={20} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No contacts found.</p>
        <p className="text-xs text-gray-400 mt-1">Run enrichment to discover contacts for this domain.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border-t border-gray-200">
      <div className="px-6 py-2 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-500">{contacts.length} contact{contacts.length !== 1 ? 's' : ''} found</span>
      </div>
      <div className="divide-y divide-gray-200">
        {contacts.map(contact => (
          <div key={contact.id} className="px-6 py-3 flex items-start gap-4 hover:bg-gray-100">
            {/* Name & Position */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {contact.full_name || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown'}
                </span>
                <SeniorityBadge seniority={contact.seniority} />
                {contact.type === 'generic' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-600 border border-orange-200">
                    Generic
                  </span>
                )}
              </div>
              {contact.position && (
                <p className="text-xs text-gray-500 mt-0.5">{contact.position}</p>
              )}
              {contact.department && (
                <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{contact.department}</p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col items-start gap-0.5">
              <a href={`mailto:${contact.email}`} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                {contact.email}
              </a>
              <VerificationBadge status={contact.verification_status} />
            </div>

            {/* Confidence */}
            <div className="w-24 flex-shrink-0">
              <ConfidenceBar confidence={contact.confidence} />
            </div>

            {/* Links */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {contact.linkedin_url && (
                <a
                  href={contact.linkedin_url.startsWith('http') ? contact.linkedin_url : `https://linkedin.com/in/${contact.linkedin_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                  title="LinkedIn"
                >
                  <Linkedin size={14} />
                </a>
              )}
              {contact.twitter && (
                <a
                  href={`https://twitter.com/${contact.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-500 hover:text-sky-700"
                  title={`@${contact.twitter}`}
                >
                  <ExternalLink size={14} />
                </a>
              )}
              {contact.phone_number && (
                <a href={`tel:${contact.phone_number}`} className="text-gray-500 hover:text-gray-700" title={contact.phone_number}>
                  <Phone size={14} />
                </a>
              )}
            </div>

            {/* Source */}
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                {contact.enrichment_source === 'hunter' ? 'Hunter.io' : contact.enrichment_source}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
