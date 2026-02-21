/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable("challenges", {
    id: { type: "uuid", primaryKey: true },
    institution_id: { type: "uuid", references: "institutions", onDelete: "SET NULL" },
    title: { type: "varchar(200)", notNull: true },
    description: { type: "text", notNull: true },
    type: { type: "varchar(20)", notNull: true }, // solo, group, community
    start_at: { type: "timestamptz", notNull: true },
    end_at: { type: "timestamptz", notNull: true },
    points: { type: "integer", notNull: true, default: 0 },
    config: { type: "jsonb", default: "{}" },
    status: { type: "varchar(20)", notNull: true, default: "active" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("challenges", "institution_id");
  pgm.createIndex("challenges", "status");
  pgm.createIndex("challenges", "type");

  pgm.createTable("challenge_participations", {
    id: { type: "uuid", primaryKey: true },
    challenge_id: { type: "uuid", notNull: true, references: "challenges", onDelete: "CASCADE" },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    status: { type: "varchar(20)", notNull: true, default: "active" },
    team_id: { type: "uuid" },
    joined_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("challenge_participations", "challenge_id");
  pgm.createIndex("challenge_participations", "user_id");
  pgm.createConstraint("challenge_participations", "challenge_user_unique", {
    unique: true,
    columns: ["challenge_id", "user_id"],
  });
};

exports.down = (pgm) => {
  pgm.dropTable("challenge_participations");
  pgm.dropTable("challenges");
};
