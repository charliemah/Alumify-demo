/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable("discussions", {
    id: { type: "uuid", primaryKey: true },
    challenge_id: { type: "uuid", references: "challenges", onDelete: "CASCADE" },
    team_id: { type: "uuid", references: "teams", onDelete: "CASCADE" },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    parent_id: { type: "uuid", references: "discussions", onDelete: "CASCADE" },
    body: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("discussions", "challenge_id");
  pgm.createIndex("discussions", "team_id");
  pgm.createIndex("discussions", "parent_id");
  pgm.createIndex("discussions", "created_at");
};

exports.down = (pgm) => {
  pgm.dropTable("discussions");
};
