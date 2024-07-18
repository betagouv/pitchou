import store from './store.js'

export const mapStateToSqueletteProps = (state) => {
    return {
        email: store.state.secret ? '@' : undefined
    }
}