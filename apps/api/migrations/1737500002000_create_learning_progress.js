/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable("learning_progress", {
    id: { type: "uuid", primaryKey: true },
    challenge_id: { type: "uuid", notNull: true, references: "challenges", onDelete: "CASCADE" },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    milestone: { type: "integer", notNull: true },
    notes: { type: "text" },
    completed_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("learning_progress", ["challenge_id", "user_id"]);
  pgm.createIndex("learning_progress", "user_id");

  pgm.createTable("user_stats", {
    user_id: { type: "uuid", primaryKey: true, references: "users", onDelete: "CASCADE" },
    total_xp: { type: "integer", notNull: true, default: 0 },
    current_level: { type: "integer", notNull: true, default: 1 },
    streak_days: { type: "integer", notNull: true, default: 0 },
    last_activity_at: { type: "timestamptz" },
    rank_title: { type: "varchar(50)", notNull: true, default: "Rookie" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("user_stats");
  pgm.dropTable("learning_progress");
};
