import type { EnrichmentProvider, HunterDomainSearchConfig, Contact } from '@vimsy/shared';
import { hunterDomainSearch } from './hunter-domain-search';
import { upsertContact } from '../../db/queries/contacts';
import { getSiteById } from '../../db/queries/sites';

export interface EnrichmentResult {
  siteId: number;
  contactsAdded: number;
  contactsUpdated: number;
  totalResults: number;
  error?: string;
}

/**
 * Run enrichment for a single site using the specified provider.
 * Returns the number of contacts upserted.
 */
export async function runEnrichment(
  siteId: number,
  provider: EnrichmentProvider,
  config: HunterDomainSearchConfig,
  apiKey: string,
  jobId: string
): Promise<EnrichmentResult> {
  const site = getSiteById(siteId);
  if (!site) {
    return { siteId, contactsAdded: 0, contactsUpdated: 0, totalResults: 0, error: 'Site not found' };
  }

  if (provider === 'snov') {
    return { siteId, contactsAdded: 0, contactsUpdated: 0, totalResults: 0, error: 'Snov.io not implemented yet' };
  }

  // Hunter.io domain search
  const searchConfig: HunterDomainSearchConfig = {
    ...config,
    domain: site.domain,
    company: config.company || site.company_name || undefined,
  };

  const result = await hunterDomainSearch(searchConfig, apiKey);

  let contactsAdded = 0;
  for (const email of result.emails) {
    const contactData: Omit<Contact, 'id' | 'created_at' | 'updated_at'> = {
      site_id: siteId,
      email: email.value,
      first_name: email.first_name,
      last_name: email.last_name,
      full_name: [email.first_name, email.last_name].filter(Boolean).join(' ') || null,
      position: email.position,
      position_raw: email.position_raw,
      seniority: email.seniority,
      department: email.department,
      type: email.type,
      confidence: email.confidence,
      linkedin_url: email.linkedin,
      twitter: email.twitter,
      phone_number: email.phone_number,
      verification_status: email.verification?.status || null,
      verification_date: email.verification?.date || null,
      enrichment_source: 'hunter',
      enrichment_job_id: jobId,
    };

    upsertContact(contactData);
    contactsAdded++;
  }

  return {
    siteId,
    contactsAdded,
    contactsUpdated: 0,
    totalResults: result.totalResults,
  };
}
