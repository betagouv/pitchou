/** @type {import('kanel').Config} */
module.exports = {
    customTypeMap: {
        'pg_catalog.bytea': 'Buffer'
    },

    preRenderHooks: [
        function hook(output, InstantiatedConfig){

            console.log('kanel', output)
            console.log('config', InstantiatedConfig)
            return output
        }
    ]
}
