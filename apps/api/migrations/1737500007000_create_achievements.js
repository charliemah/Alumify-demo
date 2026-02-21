/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable("achievements", {
    id: { type: "uuid", primaryKey: true },
    code: { type: "varchar(50)", notNull: true, unique: true },
    name: { type: "varchar(100)", notNull: true },
    description: { type: "text", notNull: true },
    icon_url: { type: "text" },
    xp_reward: { type: "integer", notNull: true, default: 0 },
    criteria: { type: "jsonb", default: "{}" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("achievements", "code");

  pgm.createTable("user_achievements", {
    id: { type: "uuid", primaryKey: true },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    achievement_id: { type: "uuid", notNull: true, references: "achievements", onDelete: "CASCADE" },
    earned_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("user_achievements", "user_id");
  pgm.createIndex("user_achievements", "achievement_id");
  pgm.createConstraint("user_achievements", "user_achievement_unique", {
    unique: true,
    columns: ["user_id", "achievement_id"],
  });
};

exports.down = (pgm) => {
  pgm.dropTable("user_achievements");
  pgm.dropTable("achievements");
};
