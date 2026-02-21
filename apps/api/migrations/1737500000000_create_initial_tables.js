/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable("users", {
    id: { type: "uuid", primaryKey: true },
    email: { type: "varchar(255)", notNull: true, unique: true },
    password_hash: { type: "varchar(255)", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("refresh_tokens", {
    id: { type: "uuid", primaryKey: true },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
    token_hash: { type: "varchar(255)", notNull: true },
    expires_at: { type: "timestamptz", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("refresh_tokens", "user_id");
  pgm.createIndex("refresh_tokens", "expires_at");

  pgm.createTable("institutions", {
    id: { type: "uuid", primaryKey: true },
    name: { type: "varchar(255)", notNull: true },
    slug: { type: "varchar(100)", notNull: true, unique: true },
    domain: { type: "varchar(255)" },
    logo_url: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("alumni_profiles", {
    id: { type: "uuid", primaryKey: true },
    user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE", unique: true },
    institution_id: { type: "uuid", references: "institutions", onDelete: "SET NULL" },
    grad_year: { type: "integer" },
    degree: { type: "varchar(200)" },
    bio: { type: "text" },
    avatar_url: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("alumni_profiles", "institution_id");
};

exports.down = (pgm) => {
  pgm.dropTable("alumni_profiles");
  pgm.dropTable("institutions");
  pgm.dropTable("refresh_tokens");
  pgm.dropTable("users");
};
