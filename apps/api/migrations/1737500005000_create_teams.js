/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable("teams", {
    id: { type: "uuid", primaryKey: true },
    challenge_id: { type: "uuid", notNull: true, references: "challenges", onDelete: "CASCADE" },
    name: { type: "varchar(100)", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("teams", "challenge_id");

  pgm.createTable("team_members", {
    id: { type: "uuid", primaryKey: true },
    team_id: { type: "uuid", notNull: true, references: "teams", onDelete: "CASCADE" },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    role: { type: "varchar(20)", notNull: true, default: "member" },
    joined_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("team_members", "team_id");
  pgm.createIndex("team_members", "user_id");
  pgm.createConstraint("team_members", "team_user_unique", {
    unique: true,
    columns: ["team_id", "user_id"],
  });
};

exports.down = (pgm) => {
  pgm.dropTable("team_members");
  pgm.dropTable("teams");
};
