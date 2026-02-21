/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO challenges (id, institution_id, title, description, type, start_at, end_at, points, config, status)
    VALUES (
      '33333333-3333-3333-3333-333333333333',
      '11111111-1111-1111-1111-111111111111',
      'Welcome to Alumify',
      'Complete your first 3 milestones to get started. Each milestone earns you 20 XP!',
      'solo',
      NOW() - INTERVAL '1 day',
      NOW() + INTERVAL '30 days',
      100,
      '{"milestones": 5, "xp_per_milestone": 20}'::jsonb,
      'active'
    )
    ON CONFLICT (id) DO NOTHING
  `);
  pgm.sql(`
    INSERT INTO challenges (id, institution_id, title, description, type, start_at, end_at, points, config, status)
    VALUES (
      '44444444-4444-4444-4444-444444444444',
      '11111111-1111-1111-1111-111111111111',
      'Team Learning Sprint',
      'Form a team and complete 5 milestones together. First team to finish wins bonus XP!',
      'group',
      NOW() - INTERVAL '1 day',
      NOW() + INTERVAL '14 days',
      200,
      '{"milestones": 5, "xp_per_milestone": 25, "max_team_size": 5}'::jsonb,
      'active'
    )
    ON CONFLICT (id) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DELETE FROM challenges WHERE id IN ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444')`);
};
