/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO achievements (id, code, name, description, icon_url, xp_reward, criteria)
    VALUES
      ('a1111111-1111-1111-1111-111111111111', 'first_challenge', 'First Challenge', 'Joined your first challenge', NULL, 25, '{}'),
      ('a2222222-2222-2222-2222-222222222222', 'streak_7', '7-Day Streak', 'Checked in 7 days in a row', NULL, 50, '{}'),
      ('a3333333-3333-3333-3333-333333333333', 'streak_30', '30-Day Streak', 'Checked in 30 days in a row', NULL, 150, '{}'),
      ('a4444444-4444-4444-4444-444444444444', 'team_player', 'Team Player', 'Joined a team challenge', NULL, 30, '{}'),
      ('a5555555-5555-5555-5555-555555555555', 'milestone_master', 'Milestone Master', 'Completed 10 milestones across challenges', NULL, 75, '{}'),
      ('a6666666-6666-6666-6666-666666666666', 'challenge_champion', 'Challenge Champion', 'Completed your first challenge', NULL, 50, '{}')
    ON CONFLICT (code) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM achievements WHERE code IN (
      'first_challenge', 'streak_7', 'streak_30',
      'team_player', 'milestone_master', 'challenge_champion'
    )
  `);
};
