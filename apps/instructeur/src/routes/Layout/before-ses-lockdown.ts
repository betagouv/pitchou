/**
 * loading odfjs loads ses and triggers a call to lockdown()
 * This call can be incompatible with other libs
 * https://www.npmjs.com/package/ses#ecosystem-compatibility
 * notably because of the "override mistake"
 * This module is the opportunity to do what is needed before the lockdown call to
 * preserve compatibility
 */

// SvelteSet, SvelteMap hit the override mistake when initializing the first instance
import { SvelteSet, SvelteMap } from "svelte/reactivity";

// we create a first instance to avoid getting an error after lockdown
let s = new SvelteSet();
let m = new SvelteMap();

void s;
void m;
