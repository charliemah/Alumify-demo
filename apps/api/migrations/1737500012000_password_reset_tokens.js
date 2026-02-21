/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable("password_reset_tokens", {
    id: { type: "uuid", primaryKey: true },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    token_hash: { type: "varchar(255)", notNull: true },
    expires_at: { type: "timestamptz", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("password_reset_tokens", "user_id");
  pgm.createIndex("password_reset_tokens", "expires_at");
};

exports.down = (pgm) => {
  pgm.dropTable("password_reset_tokens");
};
