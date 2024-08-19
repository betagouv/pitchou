/**
 * 
 * @param {import('../front-end/store.js').PitchouState} state
 * @returns 
*/
export const mapStateToSqueletteProps = (state) => {
    return {
        email: state.secret ? '@' : undefined
    }
}