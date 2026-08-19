import type { PageLoad } from "./$types";

// Public focused screen: hide the nav even when authenticated. The optional
// [[version]] segment selects which published version is displayed.
export const load: PageLoad = ({ params }) => ({ hideNav: true, version: params.version });
