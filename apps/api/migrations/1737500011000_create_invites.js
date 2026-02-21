/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable("invite_codes", {
    id: { type: "uuid", primaryKey: true },
    code: { type: "varchar(32)", notNull: true, unique: true },
    inviter_user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    challenge_id: { type: "uuid", references: "challenges", onDelete: "CASCADE" },
    bonus_xp: { type: "integer", notNull: true, default: 25 },
    expires_at: { type: "timestamptz", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("invite_codes", "code");
  pgm.createIndex("invite_codes", "inviter_user_id");
};

exports.down = (pgm) => {
  pgm.dropTable("invite_codes");
};
