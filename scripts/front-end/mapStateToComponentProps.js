/** @import {PitchouState} from '../front-end/store.js' */

/**
 * @typedef {Object} SqueletteProps
 * @property {string | undefined} email
 */
/**
 * 
 * @param {PitchouState} state
 * @returns {SqueletteProps}
*/
export const mapStateToSqueletteProps = (state) => {
    return {
        email: state.secret ? '@' : undefined
    }
}