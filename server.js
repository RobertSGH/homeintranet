//SETTING UP THE SERVER && express
require('dotenv').config();

const express = require('express');
const { use } = require('express/lib/application');
const PORT = process.env.PORT || 3000;
const bcrypt = require('bcrypt');
const app = express();
const path = require('path');
const jwt = require('jsonwebtoken');
const pgp = require('pg-promise')();
const db = pgp(process.env.DATABASE_URL);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html')); // assuming your new HTML file is named 'landing.html'
});

// Move the current root to /app or another path
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});

app.use(express.static('public')); //serving static files

db.connect()
  .then((obj) => {
    obj.done(); // success, release connection
    console.log('Database connection successful');
  })
  .catch((error) => {
    console.error('Database connection error:', error.stack);
  });
console.log('Connected to db');

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      account_id: user.account_id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '1h',
    }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

//Protecting routes
const ensureAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      req.isAuthenticated = true;
      return next();
    } catch (err) {
      console.error('Invalid token:', err);
      res.status(401).json({ message: 'Invalid token' });
    }
  } else {
    req.isAuthenticated = false;
    res.status(401).json({ message: 'Unauthorized' });
  }
};

const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden' });
};

async function ensureEventOwnerOrAdmin(req, res, next) {
  const { id } = req.params;
  const loggedInUser = req.user;

  try {
    const row = await db.oneOrNone('SELECT * FROM events WHERE id = $1', [id]);

    if (!row) {
      res.status(404).send({ error: 'Event not found' });
    } else {
      console.log('Event row:', row);
      console.log('Logged in user:', loggedInUser);

      if (row.user_id === loggedInUser.id || loggedInUser.role === 'admin') {
        next();
      } else {
        res.status(403).send({
          error: 'You do not have permission to modify this event',
        });
      }
    }
  } catch (err) {
    res.status(500).send({ error: 'Failed to fetch event' });
  }
}

async function ensureAnnouncementOwner(req, res, next) {
  const { id } = req.params;
  const loggedInUser = req.user;

  try {
    const row = await db.oneOrNone(
      'SELECT * FROM announcements WHERE id = $1',
      [id]
    );

    if (!row) {
      res.status(404).send({ error: 'Announcement not found' });
    } else {
      console.log('Announcement row:', row);
      console.log('Logged in user:', loggedInUser);

      if (
        row.username === loggedInUser.username ||
        loggedInUser.role === 'admin'
      ) {
        next();
      } else {
        res.status(403).send({
          error: 'You do not have permission to modify this announcement',
        });
      }
    }
  } catch (err) {
    res.status(500).send({ error: 'Failed to fetch announcement' });
  }
}

//Registration
const checkExistingEmailUsername = async (email, username) => {
  const existingEmail = await db.oneOrNone(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  const existingUsername = await db.oneOrNone(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  return { existingEmail, existingUsername };
};

app.post('/api/register-new-user', async (req, res) => {
  try {
    console.log('New user registering');

    const { username, email, password } = req.body;
    const defaultRole = 'admin';
    const currentDate = new Date().toISOString();

    const { existingEmail, existingUsername } =
      await checkExistingEmailUsername(email, username);

    if (existingEmail) {
      res.status(400).json({ message: 'Email already exists' });
      return;
    }

    if (existingUsername) {
      res.status(400).json({ message: 'Username already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createUser = async (accountId) => {
      try {
        const result = await db.one(
          'INSERT INTO users(username, email, password, role, account_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [username, email, hashedPassword, defaultRole, accountId]
        );
        res.status(201).json({
          message: 'User successfully registered',
          id: result.id,
        });
      } catch (err) {
        console.error('Error:', err);
        res.status(500).json({
          message: 'Error registering user',
          error: err,
        });
      }
    };

    try {
      const result = await db.one(
        'INSERT INTO accounts(name, email, created_at) VALUES ($1, $2, $3) RETURNING id',
        [username, email, currentDate]
      );
      await createUser(result.id);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ message: 'Error creating account', error: err });
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ message: 'Unexpected error', error: err });
  }
});

app.post(
  '/api/create-user',
  ensureAuthenticated,
  ensureAdmin,
  async (req, res) => {
    try {
      console.log('Authenticated user registering a new user');
      const { username, email, password, role } = req.body;

      if (req.isAuthenticated && req.user.role !== 'admin') {
        res.status(403).json({ message: 'Only admins can create new users' });
        return;
      }

      const { existingEmail, existingUsername } =
        await checkExistingEmailUsername(email, username);

      if (existingEmail) {
        res.status(400).json({ message: 'Email already exists' });
        return;
      }

      if (existingUsername) {
        res.status(400).json({ message: 'Username already exists' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const createUser = async () => {
        try {
          const result = await db.one(
            'INSERT INTO users(username, email, password, role, account_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [username, email, hashedPassword, role, req.user.account_id]
          );
          res.status(201).json({
            message: 'User successfully registered',
            id: result.id,
          });
        } catch (err) {
          console.error('Error:', err);
          res.status(500).json({
            message: 'Error registering user',
            error: err,
          });
        }
      };

      await createUser();
    } catch (err) {
      console.error('Unexpected error:', err);
      res.status(500).json({ message: 'Unexpected error', error: err });
    }
  }
);

//Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [
      username,
    ]);

    if (!user) {
      return res.status(401).json({ message: 'Incorrect username' });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    const token = generateToken(user);
    res.json({ message: 'Logged in successfully', user, token });
  } catch (err) {
    console.error('Error:', err);
    res
      .status(500)
      .json({ message: 'Error during authentication', error: err });
  }
});

//Logout
app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err);
      res.status(500).json({ message: 'Internal Server Error', error: err });
    } else {
      res.json({ message: 'Logged out successfully' });
    }
  });
});

//Persisted login
app.get('/api/check-auth', (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyToken(token);
      res.json({ isAuthenticated: true, user: decoded });
    } catch (err) {
      res
        .status(401)
        .json({ isAuthenticated: false, message: 'Invalid token' });
    }
  } else {
    res.json({ isAuthenticated: false });
  }
});

app.get('/api/users', ensureAuthenticated, async (req, res) => {
  if (req.isAuthenticated) {
    const accountId = req.user.account_id;
    const sql = 'SELECT * FROM users WHERE account_id = $1';

    try {
      const rows = await db.any(sql, [accountId]);
      res.json({ users: rows, role: req.user.role });
    } catch (err) {
      res.status(500).send({ error: 'Failed to fetch users' });
      console.error(err.message);
    }
  } else {
    res
      .status(403)
      .send({ error: 'You do not have permission to access this data' });
  }
});

app.delete(
  '/api/users/:id',
  ensureAuthenticated,
  ensureAdmin,
  async (req, res) => {
    const userId = req.params.id;
    const accountId = req.user.account_id;

    try {
      const result = await db.result(
        'DELETE FROM users WHERE id = $1 AND account_id = $2',
        [userId, accountId]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ message: 'User not found' });
      } else {
        res.json({ message: 'User successfully deleted', id: userId });
      }
    } catch (err) {
      res.status(500).json({ message: 'Error deleting user' });
    }
  }
);

app.post('/api/announcements', ensureAuthenticated, async (req, res) => {
  const { title, content } = req.body;
  console.log('User:', req.user);

  if (req.isAuthenticated) {
    const sql =
      'INSERT INTO announcements(title, message, created_at, updated_at, username, account_id) VALUES ($1, $2, $3, $4, $5, $6)';
    const currentDate = new Date().toISOString();
    const params = [
      title,
      content,
      currentDate,
      currentDate,
      req.user.username,
      req.user.account_id,
    ];

    try {
      await db.none(sql, params);
      res.status(201).json({ message: 'Announcement created' });
    } catch (err) {
      res.status(500).send({ error: 'Failed to create announcement' });
      console.error(err.message);
    }
  } else {
    res
      .status(403)
      .send({ error: 'You must be logged in to create an announcement' });
  }
});

app.get('/api/announcements', ensureAuthenticated, async (req, res) => {
  if (req.isAuthenticated) {
    const sql =
      'SELECT * FROM announcements WHERE account_id = $1 ORDER BY created_at DESC';
    const params = [req.user.account_id];

    try {
      const rows = await db.any(sql, params);
      res.json({ announcements: rows, role: req.user.role });
    } catch (err) {
      res.status(500).send({ error: 'Failed to fetch announcements' });
      console.error(err.message);
    }
  } else {
    res
      .status(403)
      .send({ error: 'You must be logged in to access announcements' });
  }
});

app.put(
  '/api/announcements/:id',
  ensureAuthenticated,
  ensureAnnouncementOwner,
  async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;

    if (req.isAuthenticated) {
      const findAnnouncementSql =
        'SELECT * FROM announcements WHERE id = $1 AND account_id = $2';
      const findParams = [id, req.user.account_id];

      try {
        const row = await db.oneOrNone(findAnnouncementSql, findParams);

        if (
          row &&
          (req.user.role === 'admin' || req.user.username === row.username)
        ) {
          const sql =
            'UPDATE announcements SET title = $1, message = $2, updated_at = $3 WHERE id = $4';
          const currentDate = new Date().toISOString();
          const params = [title, content, currentDate, id];

          await db.none(sql, params);
          res.status(200).json({ message: 'Announcement updated' });
        } else {
          res.status(403).send({
            error: 'You do not have permission to update announcements',
          });
        }
      } catch (err) {
        res.status(500).send({ error: 'Failed to find announcement' });
        console.error(err.message);
      }
    } else {
      res
        .status(403)
        .send({ error: 'You do not have permission to update announcements' });
    }
  }
);

app.delete(
  '/api/announcements/:id',
  ensureAuthenticated,
  ensureAnnouncementOwner,
  async (req, res) => {
    const id = req.params.id;

    if (req.isAuthenticated) {
      const findAnnouncementSql =
        'SELECT * FROM announcements WHERE id = $1 AND account_id = $2';
      const findParams = [id, req.user.account_id];

      try {
        const row = await db.oneOrNone(findAnnouncementSql, findParams);

        if (
          row &&
          (req.user.role === 'admin' || req.user.username === row.username)
        ) {
          const sql = 'DELETE FROM announcements WHERE id = $1';
          const params = [id];

          await db.none(sql, params);
          res.json({ message: 'Announcement deleted', id: id });
        } else {
          res.status(403).send({
            error: 'You do not have permission to delete an announcement',
          });
        }
      } catch (err) {
        res.status(500).send({ error: 'Failed to find announcement' });
        console.error(err.message);
      }
    } else {
      res.status(403).send({
        error: 'You do not have permission to delete an announcement',
      });
    }
  }
);

app.post('/api/events', ensureAuthenticated, async (req, res) => {
  const { title, description, start_date, end_date, all_day } = req.body;
  const user_id = req.user.id;
  const account_id = req.user.account_id;

  const sql =
    'INSERT INTO events (user_id, account_id, title, description, start_date, end_date, all_day) VALUES ($1, $2, $3, $4, $5, $6, $7)';
  const params = [
    user_id,
    account_id,
    title,
    description,
    start_date,
    end_date,
    all_day,
  ];

  try {
    const eventId = await db.one(sql + ' RETURNING id', params).id;

    const getUsernameSql =
      'SELECT users.username as user_name FROM users WHERE users.id = $1';
    const row = await db.one(getUsernameSql, [user_id]);

    res.status(201).json({
      message: 'Event created',
      id: eventId,
      start_date,
      end_date,
      all_day,
      title,
      description,
      user_id,
      user_name: row.user_name,
      account_id,
    });
  } catch (err) {
    console.error('Error in the query:', err.message);
    res.status(500).send({ error: 'Failed to create event' });
  }
});

app.get('/api/events', ensureAuthenticated, async (req, res) => {
  const accountId = req.user.account_id;

  const sql = `
    SELECT events.id, events.title, events.description, events.start_date, events.end_date, events.all_day, users.username as user_name
    FROM events
    INNER JOIN users ON events.user_id = users.id
    WHERE users.account_id = $1
  `;

  try {
    const rows = await db.any(sql, [accountId]);
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).send({ error: 'Failed to fetch events' });
    console.error(err.message);
  }
});

app.put(
  '/api/events/:id',
  ensureAuthenticated,
  ensureEventOwnerOrAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { title, description, start_date, end_date, all_day } = req.body;
    const accountId = req.user.account_id;

    const sql = `UPDATE events SET title = COALESCE($1, title), description = COALESCE($2, description), 
    start_date = COALESCE($3, start_date), end_date = COALESCE($4, end_date), 
    all_day = COALESCE($5, all_day) 
    WHERE id = $6 AND user_id IN (SELECT id FROM users WHERE account_id = $7)`;
    const params = [
      title,
      description,
      start_date,
      end_date,
      all_day,
      id,
      accountId,
    ];

    try {
      await db.none(sql, params);
      res.status(201).json({
        message: 'Event updated',
        id: id,
        start_date,
        end_date,
        all_day,
        title,
        description,
      });
    } catch (err) {
      res.status(500).send({ error: 'Failed to update event' });
      console.error(err.message);
    }
  }
);

app.delete(
  '/api/events/:id',
  ensureAuthenticated,
  ensureEventOwnerOrAdmin,
  async (req, res) => {
    const { id } = req.params;
    const accountId = req.user.account_id;

    const sql =
      'DELETE FROM events WHERE id = $1 AND user_id IN (SELECT id FROM users WHERE account_id = $2)';
    const params = [id, accountId];

    try {
      await db.none(sql, params);
      res.status(200).json({ message: 'Event deleted' });
    } catch (err) {
      res.status(500).send({ error: 'Failed to delete event' });
      console.error(err.message);
    }
  }
);

app.delete('/api/events', ensureAuthenticated, async (req, res) => {
  const sql = 'DELETE FROM events';

  try {
    await db.none(sql);
    res.status(200).json({ message: 'All events deleted' });
  } catch (err) {
    res.status(500).send({ error: 'Failed to delete all events' });
    console.error(err.message);
  }
});

module.exports = app; // for vercel

// function alterTable() {
//   const sql = 'ALTER TABLE events ADD COLUMN account_id INTEGER';

//   db.run(sql, (err) => {
//     if (err) {
//       console.error('Failed to alter table:', err.message);
//     } else {
//       console.log('Table altered successfully');
//     }
//   });
// }
// alterTable();

//CLOSE DB CONNECTION
// db.close((err) => {
//   if (err) {
//     console.error(err.message);
//   }
//   console.log('Closed the database connection.');
// });

// const saltRounds = 10;

// app.post('/api/create-admin', async (req, res) => {
//   const { username, email, password } = req.body;
//   const role = 'admin';

//   try {
//     // Hash the password
//     const hashedPassword = await bcrypt.hash(password, saltRounds);

//     const sql =
//       'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
//     const params = [username, email, hashedPassword, role];

//     db.run(sql, params, function (err) {
//       if (err) {
//         console.error('Error in the query:', err.message);
//         res.status(500).send({ error: 'Failed to create admin user' });
//       } else {
//         res
//           .status(201)
//           .json({ message: 'Admin user created', id: this.lastID });
//       }
//     });
//   } catch (err) {
//     console.error('Error hashing password:', err.message);
//     res.status(500).send({ error: 'Failed to hash password' });
//   }
// });

// db.get('SELECT * FROM accounts WHERE name = ?', [emailToCheck], (err, row) => {
//   if (err) {
//     console.error('Error:', err);
//   } else if (row) {
//     console.log('Account found:', row);
//   } else {
//     console.log('Account not found');
//   }
// });

// const addAccountIdToAnnouncements = `
// ALTER TABLE events ADD COLUMN account_id INTEGER;
// `;

// db.run(addAccountIdToAnnouncements, (err) => {
//   if (err) {
//     console.error(
//       'Error adding account_id column to announcements:',
//       err.message
//     );
//   } else {
//     console.log('Added account_id column to announcements table');
//   }
// });

// async function deleteAllTableContent() {
//   try {
//     await db.none('TRUNCATE users');
//     console.log('Table content deleted successfully');
//   } catch (error) {
//     console.error('Error deleting table content:', error);
//   }
// }
// deleteAllTableContent();

//new table named users with three columns: id, name, and email. The id column is an auto-incrementing primary key
// db.run(
//   'CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, email TEXT)',
//   (err) => {
//     if (err) {
//       console.log(err.message);
//     }
//     console.log('Created the "users" table');
//   }
// );

//Created table with accounts
// db.run(
//   `CREATE TABLE accounts (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     name TEXT NOT NULL,
//     email TEXT NOT NULL,
//     created_at TEXT NOT NULL,
//     updated_at TEXT
//   );
//   )`,
//   (err) => {
//     if (err) {
//       console.error(err.message);
//     }
//     console.log('Created the "accounts" table');
//   }
// );

//Created db with new fields
// db.run(
//   `CREATE TABLE IF NOT EXISTS users(
//     id INTEGER PRIMARY KEY,
//     username TEXT UNIQUE,
//     email TEXT UNIQUE,
//     password TEXT,
//     role TEXT
//   )`,
//   (err) => {
//     if (err) {
//       console.error(err.message);
//     }
//     console.log('Created the "users" table');
//   }
// );

//Created db for announcements
// db.run(
//   `CREATE TABLE announcements (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   title TEXT NOT NULL,
//   message TEXT NOT NULL,
//   created_at DATETIME NOT NULL,
//   updated_at DATETIME NOT NULL
// )`,
//   (err) => {
//     if (err) {
//       console.error(err.message);
//     }
//     console.log('Created the "announcements" table');
//   }
// );

//Created db for events
// db.run(
//   `CREATE TABLE events (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     title TEXT NOT NULL,
//     start_date TEXT NOT NULL,
//     end_date TEXT NOT NULL,
//     all_day BOOLEAN NOT NULL,
//     description TEXT
// )`,
//   (err) => {
//     if (err) {
//       console.error(err.message);
//     }
//     console.log('Created the "events" table');
//   }
// );

//Add user_id column to events table
// db.run('ALTER TABLE events ADD COLUMN user_id INTEGER', (err) => {
//   if (err) {
//     console.error(err.message);
//   } else {
//     console.log('Added user_id column to the "events" table');
//   }
// });
// db.run('PRAGMA foreign_keys = ON', (err) => {
//   if (err) {
//     console.error(err.message);
//   } else {
//     console.log('Foreign key constraint enabled');
//   }
// });
