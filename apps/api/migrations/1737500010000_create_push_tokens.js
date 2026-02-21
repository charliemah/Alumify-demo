/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable("push_tokens", {
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE", primaryKey: true },
    token: { type: "text", notNull: true, primaryKey: true },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("push_tokens");
};
