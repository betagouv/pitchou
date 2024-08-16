//@ts-check

import { compile } from 'json-schema-to-typescript'

import schema88444 from '../data/démarches-simplifiées/schema-DS-88444.json' with {type: 'json'}

const {revision: {champDescriptors, annotationDescriptors}} = schema88444

const dossier88444JsonSchemaProperties = Object.create(null)

const champsTypenamePourInterface = new Set([
    "DropDownListChampDescriptor",
    "MultipleDropDownListChampDescriptor",
    "YesNoChampDescriptor",
    "CheckboxChampDescriptor",
    "SiretChampDescriptor",
    "TextChampDescriptor",
    "AddressChampDescriptor",
    "PhoneChampDescriptor",
    "EmailChampDescriptor",
    "TextareaChampDescriptor",
    "IntegerNumberChampDescriptor",
    "DecimalNumberChampDescriptor",
    "DepartementChampDescriptor",
    "RepetitionChampDescriptor",
    "CommuneChampDescriptor",
    "DateChampDescriptor"
])

for(const champDescriptor of champDescriptors){
    const {label, required, description, __typename} = champDescriptor

    if(champsTypenamePourInterface.has(__typename)){
        dossier88444JsonSchemaProperties[label] = {
            "type": "string",
            description
        };
    }
}


const dossierDémarcheSimplifiée88444JSONSchema = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties" : dossier88444JsonSchemaProperties
}

/*
const jsonSchema = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "nom": {
        "type": "string",
        "description": "Le nom de la personne"
      },
      "age": {
        "type": "integer",
        "description": "L'âge de la personne",
        "minimum": 0
      },
      "email": {
        "type": "string",
        "format": "email",
        "description": "L'adresse email de la personne"
      }
    },
    "required": ["nom", "age"]
}
*/

const bannerComment = `/**
* This file was automatically generated by json-schema-to-typescript.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run json-schema-to-typescript to regenerate this file.
*/`


compile(dossierDémarcheSimplifiée88444JSONSchema, 'DossierDémarcheSimplifiée88444', {bannerComment})
  .then(ts => console.log('ts', ts))