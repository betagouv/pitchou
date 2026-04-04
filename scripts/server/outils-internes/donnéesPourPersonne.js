/** @import { default as Personne } from '../../types/database/public/Personne.js' */
/** @import { FastifyReply, FastifyRequest } from 'fastify' */
import {
    CAUSE_PERSONNE_INTROUVABLE_POUR_EMAIL,
    getÉvènementsForPersonne,
} from '../database/aarri/utils.js'
import { createOdsFile } from '@odfjs/odfjs'
import { formatDateAbsolue } from '../../front-end/affichageDossier.js';
import { normalisationEmail } from '../../commun/manipulationStrings.js';

/**
 * @param {FastifyRequest} request
 * @param {FastifyReply} reply
 */
export async function outilDonnéesPourPersonne(request, reply) {
    // @ts-ignore — validé par optsOutilInterneDonnéesPourPersonne
    const emailInput = request.body.email

    const email = normalisationEmail(emailInput)

    try {
        const arrayBuffer = await créerFichierODSDonnéesPourPersonne(email)
        return reply
            .type('application/vnd.oasis.opendocument.spreadsheet')
            .send(Buffer.from(arrayBuffer))
    } catch (e) {
        if (e instanceof Error && e.cause === CAUSE_PERSONNE_INTROUVABLE_POUR_EMAIL) {
            return reply.code(404).send(e.message)
        }
        console.error('erreur', e)
        throw e
    }
}

/**
 * @param {Personne['email']} email
 * @returns {Promise<ArrayBuffer>}
 */
async function créerFichierODSDonnéesPourPersonne(email) {

  console.log(`Mail de la personne concernée : ${email}`)
  console.log(`Début des Calculs des données AARRI.`)
  
  const évènements = await getÉvènementsForPersonne(email)
  const évènementsCount = Map.groupBy(évènements, ({ évènement }) => évènement )
  
  console.log('Cette personne a enregistré', évènements.length,'évènements depuis le',`${formatDateAbsolue(évènements.at(-1)?.date)}`)
  
  // Création du fichier ODS pour stocker les résultats
  const évènementsFormattésPourODS = évènements.map( ({ date, évènement, détails } ) => ([
      {
        value: formatDateAbsolue(date, 'dd/MM/yyyy'),
        type: 'string'
      }, 
      {
        value: évènement,
        type: 'string'
      },
      {
        value: détails ? JSON.stringify(détails) : ' ',
        type: 'string'
      }
  ]));
  
  const headerÉvènements = [[
    {
      value: "Date de l'évènement",
      type: 'string'
    },
    {
      value: 'Évènement',
      type: 'string'
    },
    {
      value: "Détails concernant l'évènement",
      type: 'string'
    }
  ]]
  const évènementCountsFormattésPourODS = [...évènementsCount].map( ([ nomÉvènement, évènements ]) => ([
      {
        value: nomÉvènement,
        type: 'string'
      },
      {
        value: évènements.length,
        type: 'number'
      },
  ]));
  
  
  const headerÉvènementsCount = [[
  {
    value: 'Évènement',
    type: 'string'
  },
  {
    value: "Nombre de fois que l'évènement a été enregistré",
    type: 'string'
  }]]
  
  const aujourdhui = new Date()
  
  const content = new Map([
      [
        'Informations',
          [
            [
              {
                value: `Les données ont été calculées le ${formatDateAbsolue(aujourdhui)}`,
                type: 'string'
              }
            ],
            [
              {
                value: `Mail de la personne concernée : ${email}`,
                type: 'string'
              }
            ],
          ]
      ],
      [
          'Évènements',
          [...headerÉvènements, ...évènementsFormattésPourODS]
      ],
      [
          "Évènements avec count",
          [...headerÉvènementsCount, ...évènementCountsFormattésPourODS]
      ]
  ])
  
  /** @type {ArrayBuffer} */
  const ods = await createOdsFile(content)

  return ods
}