/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO institutions (id, name, slug, domain, logo_url)
    VALUES
      ('11111111-1111-1111-1111-111111111111', 'Alumify Demo University', 'alumify-demo', 'demo.alumify.app', NULL),
      ('22222222-2222-2222-2222-222222222222', 'Global Alumni Network', 'global', NULL, NULL)
    ON CONFLICT (id) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM institutions WHERE id IN (
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222'
    )
  `);
};
