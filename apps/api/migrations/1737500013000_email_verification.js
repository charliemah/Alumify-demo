/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.addColumns("users", {
    email_verified_at: { type: "timestamptz" },
  });
  pgm.createTable("email_verification_tokens", {
    id: { type: "uuid", primaryKey: true },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    token_hash: { type: "varchar(255)", notNull: true },
    expires_at: { type: "timestamptz", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("email_verification_tokens", "user_id");
};

exports.down = (pgm) => {
  pgm.dropTable("email_verification_tokens");
  pgm.dropColumns("users", ["email_verified_at"]);
};
