import { Router } from 'express';
import { getTagsForSite, getTagsForSites, getAllTags } from '../db/queries/tags';

const router = Router();

// GET /api/tags — list all tags with counts
router.get('/', (_req, res) => {
  try {
    const tags = getAllTags();
    res.json({ success: true, data: tags });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tags/site/:id — get tags for a single site
router.get('/site/:id', (req, res) => {
  try {
    const siteId = parseInt(req.params.id);
    if (isNaN(siteId)) {
      return res.status(400).json({ success: false, error: 'Invalid site ID' });
    }

    const tags = getTagsForSite(siteId);
    res.json({ success: true, data: tags });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tags/sites?ids=1,2,3 — batch get tags for multiple sites
router.get('/sites', (req, res) => {
  try {
    const idsParam = req.query.ids as string;
    if (!idsParam) {
      return res.status(400).json({ success: false, error: 'ids query parameter is required (comma-separated)' });
    }

    const siteIds = idsParam.split(',').map(Number).filter(n => !isNaN(n));
    if (siteIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid site IDs provided' });
    }

    const tags = getTagsForSites(siteIds);
    res.json({ success: true, data: tags });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export const tagRoutes = router;
