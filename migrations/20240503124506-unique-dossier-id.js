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

exports.up = function(db, callback) {
  return db.changeColumn("dossier", "id_demarches_simplifiées", { type: 'string', unique: true }, callback)
};

exports.down = function(db, callback) {
  return db.changeColumn("dossier", "id_demarches_simplifiées", { type: 'string' }, callback)
};

exports._meta = {
  "version": 1
};
