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
  db.createTable('personne', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    nom: { type: 'string' },
    prénoms: { type: 'string' },
    email: {type: 'string', unique: true},
    code_accès: {type: 'string', unique: true}
  }, callback);
};

exports.down = function(db, callback) {
  db.dropTable('personne', callback);
};

exports._meta = {
  "version": 1
};
