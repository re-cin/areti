// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_safe_hitman.sql';
import m0001 from './0001_icy_diamondback.sql';
import m0002 from './0002_accounts.sql';
import m0003 from './0003_drop_local_accounts.sql';
import m0004 from './0004_exam_difficulty.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004
    }
  }
  