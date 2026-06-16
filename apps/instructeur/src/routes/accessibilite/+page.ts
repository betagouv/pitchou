import type { PageLoad } from "./$types";

// Focused screen: hide the nav even when authenticated
export const load: PageLoad = () => ({ hideNav: true });
