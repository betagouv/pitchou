'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

/* Callback-based version */
exports.up = function (db, callback) {
  db.createTable('dossiers', {
    id: { type: 'int', primaryKey: true },
    id_demarches_simplifiées: { type: 'string' },
    statut: { type: 'string' },
    date_dépôt: { type: 'datetime' },
    identité_petitionnaire: { type: 'string'},
    espèces_protégées_concernées: { type: 'string' },
    enjeu_écologiques: { type: 'string' }
  }, callback);
};

exports.down = function (db, callback) {
  db.dropTable('dossiers', callback);
};

exports._meta = {
  "version": 1
};
