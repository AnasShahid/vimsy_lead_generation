# Todo: Remove Directories Tab from Discovery

**Created:** 2026-02-09
**Area:** discovery, ui
**Priority:** medium

## Description

Remove the "Directories" tab from the discovery page. It doesn't make sense for the Vimsy lead generation workflow.

## Related Files

- `client/src/pages/DiscoveryPage.tsx` — Remove directory tab entry and rendering
- `client/src/components/discovery/DirectorySearchForm.tsx` — Delete component file
- `server/src/services/discovery/providers/` — Remove directory provider if exists

## Notes

Small cleanup task, execute immediately.
