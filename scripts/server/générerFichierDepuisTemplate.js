//import {join} from 'node:path'

import carbone from 'carbone'

/**
 * 
 * @param {Buffer} templateBuffer 
 * @param {any} données 
 * @returns {Promise<Buffer | string>}
 */
export default function générerFichier(templateBuffer, données){
    return new Promise((resolve, reject) => {
        const templateId = `template-${Math.random().toString(36).slice(2)}`
        // carbone conventions
        //const templatePath = process.cwd()
        //const templateFullPath = join(templatePath, templateId);

        carbone.addTemplate(templateId, templateBuffer, (err) => {
            if(err){
                reject(err)
                return
            }

            carbone.render(templateId, données, (err, result) => {
                if (err) {
                    reject(err)
                    return 
                }

                resolve(result);

                carbone.removeTemplate(templateId, _ => {
                    // ignorer si ça a produit une erreur
                })
            })

        })
    })
}