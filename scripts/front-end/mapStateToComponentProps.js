/** @import {PitchouState} from '../front-end/store.js' */

/**
 * 
 * @param {PitchouState} state
 * @returns 
*/
export const mapStateToSqueletteProps = (state) => {
    return {
        email: state.secret ? '@' : undefined
    }
}