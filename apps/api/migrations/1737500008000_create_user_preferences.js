/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable("user_preferences", {
    user_id: { type: "uuid", primaryKey: true, references: "users", onDelete: "CASCADE" },
    notify_streak_risk: { type: "boolean", notNull: true, default: true },
    notify_milestone_near: { type: "boolean", notNull: true, default: true },
    preferred_notify_time: { type: "time" },
    quiet_hours_start: { type: "time" },
    quiet_hours_end: { type: "time" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("user_preferences");
};
