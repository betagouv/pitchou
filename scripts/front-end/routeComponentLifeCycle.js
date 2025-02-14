//@ts-check

import { SvelteComponent } from "svelte";
import store from "./store.js";

/** @typedef {import("./store.js").PitchouState} PitchouState */
/** @typedef {(state: PitchouState) => any} MapStateToPropsFunction */

/** @type {SvelteComponent} */
let currentComponent;
/** @type {MapStateToPropsFunction} */
let currentMapStateToProps = (_) => {};

/**
 * 
 * @param {SvelteComponent} newComponent 
 * @param {MapStateToPropsFunction} newMapStateToProps 
 */
export function replaceComponent(newComponent, newMapStateToProps) {
  if (!newMapStateToProps) {
    throw new Error("Missing _mapStateToProps in replaceComponent");
  }

  if (currentComponent) currentComponent.$destroy();

  currentComponent = newComponent;
  document.documentElement.scrollTo(0, 0) 

  currentMapStateToProps = newMapStateToProps;
}

/**
 * 
 * @param {PitchouState} state 
 */
function render(state) {
  const props = currentMapStateToProps(state);
  // @ts-ignore
  if (props) {
    currentComponent.$set(props);
  }
}

store.subscribe(render);
