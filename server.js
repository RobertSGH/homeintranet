//SETTING UP THE SERVER && express
const express = require('express');
const { use } = require('express/lib/application');
const PORT = process.env.PORT || 3000;
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();
const path = require('path');

app.use(express.static('public')); //serving static files
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// module.exports = app; // for vercel

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

//DATABASE
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./myDatabase.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to myDatabase');
});

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});

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

//Passport- Session Handling
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
  })
);

//Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    { usernameField: 'username' },
    (username, password, done) => {
      db.get(
        'SELECT * FROM users WHERE username = ?',
        username,
        (err, user) => {
          if (err) {
            return done(err);
          }
          if (!user) {
            return done(null, false, { message: 'Incorrect username' });
          }
          bcrypt.compare(password, user.password, (err, isValid) => {
            if (err) {
              return done(err);
            }
            if (!isValid) {
              return done(null, false, { message: 'Incorrect password.' });
            }

            return done(null, user);
          });
        }
      );
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', id, (err, user) => {
    done(err, user);
  });
});

//Protecting routes
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden' });
};

function ensureEventOwnerOrAdmin(req, res, next) {
  const { id } = req.params;
  const loggedInUser = req.user;

  const sql = 'SELECT * FROM events WHERE id = ?';
  const params = [id];

  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(500).send({ error: 'Failed to fetch event' });
    } else if (!row) {
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
  });
}

function ensureAnnouncementOwner(req, res, next) {
  const { id } = req.params;
  const loggedInUser = req.user;

  const sql = 'SELECT * FROM announcements WHERE id = ?';
  const params = [id];

  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(500).send({ error: 'Failed to fetch announcement' });
    } else if (!row) {
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
  });
}

//Registration
app.post('/api/register', async (req, res) => {
  console.log('Request body:', req.body);
  const { username, email, password, role } = req.body;
  const defaultRole = 'admin';
  const currentDate = new Date().toISOString();

  if (req.isAuthenticated() && req.user.role !== 'admin') {
    res.status(403).json({ message: 'Only admins can create new users' });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const createUser = (accountId) => {
      const userRole = req.user ? role : defaultRole;

      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
          console.error('Error:', err);
          res
            .status(500)
            .json({ message: 'Error checking for existing email', error: err });
        } else if (row) {
          res.status(400).json({ message: 'Email already exists' });
        } else {
          db.get(
            'SELECT * FROM users WHERE username = ?',
            [username],
            (err, row) => {
              if (err) {
                console.error('Error:', err);
                res.status(500).json({
                  message: 'Error checking for existing username',
                  error: err,
                });
              } else if (row) {
                res.status(400).json({ message: 'Username already exists' });
              } else {
                // Continue with the registration process
                db.run(
                  'INSERT INTO users(username, email, password, role, account_id) VALUES (?, ?, ?, ?, ?)',
                  [username, email, hashedPassword, userRole, accountId],
                  function (err) {
                    if (err) {
                      console.error('Error:', err);
                      res.status(500).json({
                        message: 'Error registering user',
                        error: err,
                      });
                    } else {
                      res.status(201).json({
                        message: 'User successfully registered',
                        id: this.lastID,
                      });
                    }
                  }
                );
              }
            }
          );
        }
      });
    };

    if (req.isAuthenticated()) {
      createUser(req.user.account_id);
    } else {
      db.run(
        'INSERT INTO accounts(name, email, created_at) VALUES (?, ?, ?)',
        [username, email, currentDate],
        function (err) {
          if (err) {
            console.error('Error:', err);
            res
              .status(500)
              .json({ message: 'Error creating account', error: err });
          } else {
            const accountId = this.lastID;
            createUser(accountId);
          }
        }
      );
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Error registering user', error: err });
  }
});

//Login
app.post('/api/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Logged in successfully', user: req.user });
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
  if (req.isAuthenticated()) {
    res.json({ isAuthenticated: true, user: req.user });
  } else {
    res.json({ isAuthenticated: false });
  }
});

app.get('/api/users', (req, res) => {
  if (req.isAuthenticated()) {
    const accountId = req.user.account_id;
    const sql = 'SELECT * FROM users WHERE account_id = ?';

    db.all(sql, [accountId], (err, rows) => {
      if (err) {
        res.status(500).send({ error: 'Failed to fetch users' });
        console.error(err.message);
      } else {
        res.json({ users: rows, role: req.user.role });
      }
    });
  } else {
    res
      .status(403)
      .send({ error: 'You do not have permission to access this data' });
  }
});

app.delete('/api/users/:id', ensureAuthenticated, ensureAdmin, (req, res) => {
  const userId = req.params.id;
  const accountId = req.user.account_id;

  db.run(
    'DELETE FROM users WHERE id = ? AND account_id = ?',
    [userId, accountId],
    function (err) {
      if (err) {
        res.status(500).json({ message: 'Error deleting user' });
      } else if (this.changes === 0) {
        res.status(404).json({ message: 'User not found' });
      } else {
        res.json({ message: 'User successfully deleted', id: userId });
      }
    }
  );
});

app.post('/api/announcements', (req, res) => {
  const { title, content } = req.body;

  if (req.isAuthenticated()) {
    const sql =
      'INSERT INTO announcements(title, message, created_at, updated_at, username, account_id) VALUES (?,?,?,?,?,?)';
    const currentDate = new Date().toISOString();
    const params = [
      title,
      content,
      currentDate,
      currentDate,
      req.user.username,
      req.user.account_id,
    ];

    db.run(sql, params, function (err) {
      if (err) {
        res.status(500).send({ error: 'Failed to create announcement' });
        console.error(err.message);
      } else {
        res
          .status(201)
          .json({ message: 'Announcement created', id: this.lastID });
      }
    });
  } else {
    res
      .status(403)
      .send({ error: 'You must be logged in to create an announcement' });
  }
});

app.get('/api/announcements', (req, res) => {
  if (req.isAuthenticated()) {
    const sql =
      'SELECT * FROM announcements WHERE account_id = ? ORDER BY created_at DESC';
    const params = [req.user.account_id];

    db.all(sql, params, (err, rows) => {
      if (err) {
        res.status(500).send({ error: 'Failed to fetch announcements' });
        console.error(err.message);
      } else {
        res.json({ announcements: rows, role: req.user.role });
      }
    });
  } else {
    res
      .status(403)
      .send({ error: 'You must be logged in to access announcements' });
  }
});

app.put('/api/announcements/:id', ensureAnnouncementOwner, (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (req.isAuthenticated()) {
    const findAnnouncementSql =
      'SELECT * FROM announcements WHERE id = ? AND account_id = ?';
    const findParams = [id, req.user.account_id];

    db.get(findAnnouncementSql, findParams, (err, row) => {
      if (err) {
        res.status(500).send({ error: 'Failed to find announcement' });
        console.error(err.message);
      } else {
        if (
          row &&
          (req.user.role === 'admin' || req.user.username === row.username)
        ) {
          const sql =
            'UPDATE announcements SET title = ?, message = ?, updated_at = ? WHERE id = ?';
          const currentDate = new Date().toISOString();
          const params = [title, content, currentDate, id];

          db.run(sql, params, function (err) {
            if (err) {
              res.status(500).send({ error: 'Failed to update announcement' });
              console.error(err.message);
            } else {
              res.status(200).json({ message: 'Announcement updated' });
            }
          });
        } else {
          res.status(403).send({
            error: 'You do not have permission to update announcements',
          });
        }
      }
    });
  } else {
    res
      .status(403)
      .send({ error: 'You do not have permission to update announcements' });
  }
});

app.delete(
  '/api/announcements/:id',
  ensureAuthenticated,
  ensureAnnouncementOwner,
  (req, res) => {
    const id = req.params.id;

    if (req.isAuthenticated()) {
      const findAnnouncementSql =
        'SELECT * FROM announcements WHERE id = ? AND account_id = ?';
      const findParams = [id, req.user.account_id];

      db.get(findAnnouncementSql, findParams, (err, row) => {
        if (err) {
          res.status(500).send({ error: 'Failed to find announcement' });
          console.error(err.message);
        } else {
          if (
            row &&
            (req.user.role === 'admin' || req.user.username === row.username)
          ) {
            const sql = 'DELETE FROM announcements WHERE id = ?';
            const params = [id];

            db.run(sql, params, function (err) {
              if (err) {
                res
                  .status(500)
                  .send({ error: 'Failed to delete announcement' });
                console.error(err.message);
              } else {
                res.json({ message: 'Announcement deleted', id: id });
              }
            });
          } else {
            res.status(403).send({
              error: 'You do not have permission to delete an announcement',
            });
          }
        }
      });
    } else {
      res.status(403).send({
        error: 'You do not have permission to delete an announcement',
      });
    }
  }
);

app.post('/api/events', ensureAuthenticated, (req, res) => {
  const { title, description, start_date, end_date, all_day } = req.body;
  const user_id = req.user.id;
  const account_id = req.user.account_id; // Add this line
  console.log('Received event data:', req.body);

  const sql =
    'INSERT INTO events (user_id, account_id, title, description, start_date, end_date, all_day) VALUES (?, ?, ?, ?, ?, ?, ?)'; // Add account_id
  const params = [
    user_id,
    account_id,
    title,
    description,
    start_date,
    end_date,
    all_day,
  ]; // Add account_id

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error in the query:', err.message);
      res.status(500).send({ error: 'Failed to create event' });
    } else {
      const eventId = this.lastID;

      // Fetch the username for the user who created the event
      const getUsernameSql = `
        SELECT users.username as user_name
        FROM users
        WHERE users.id = ?
      `;

      db.get(getUsernameSql, [user_id], (err, row) => {
        if (err) {
          console.error('Error fetching username:', err.message);
          res.status(500).send({ error: 'Failed to fetch username' });
        } else {
          res.status(201).json({
            message: 'Event created',
            id: eventId,
            start_date,
            end_date,
            all_day,
            title,
            description,
            user_id,
            user_name: row.user_name, // Add the user_name to the response
            account_id,
          });
        }
      });
    }
  });
});

app.get('/api/events', ensureAuthenticated, (req, res) => {
  const accountId = req.user.account_id;

  const sql = `
    SELECT events.id, events.title, events.description, events.start_date, events.end_date, events.all_day, users.username as user_name
    FROM events
    INNER JOIN users ON events.user_id = users.id
    WHERE users.account_id = ?
  `;

  db.all(sql, [accountId], (err, rows) => {
    // Add accountId to the parameters
    if (err) {
      res.status(500).send({ error: 'Failed to fetch events' });
      console.error(err.message);
    } else {
      res.status(200).json(rows);
    }
  });
});

app.put(
  '/api/events/:id',
  ensureAuthenticated,
  ensureEventOwnerOrAdmin,
  (req, res) => {
    const { id } = req.params;
    const { title, description, start_date, end_date, all_day } = req.body;
    const accountId = req.user.account_id;

    const sql = `UPDATE events SET title = COALESCE(?, title), description = COALESCE(?, description), 
    start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date), 
    all_day = COALESCE(?, all_day) 
    WHERE id = ? AND user_id IN (SELECT id FROM users WHERE account_id = ?)`; // Modify the WHERE clause
    const params = [
      title,
      description,
      start_date,
      end_date,
      all_day,
      id,
      accountId,
    ]; // Add accountId to the parameters

    db.run(sql, params, function (err) {
      if (err) {
        res.status(500).send({ error: 'Failed to update event' });
        console.error(err.message);
      } else {
        res.status(201).json({
          message: 'Event updated', // Change the message to 'Event updated'
          id: id, // Change this.lastID to id
          start_date,
          end_date,
          all_day,
          title,
          description,
        });
      }
    });
  }
);

app.delete(
  '/api/events/:id',
  ensureAuthenticated,
  ensureEventOwnerOrAdmin,
  (req, res) => {
    const { id } = req.params;
    const accountId = req.user.account_id;

    const sql =
      'DELETE FROM events WHERE id = ? AND user_id IN (SELECT id FROM users WHERE account_id = ?)'; // Modify the WHERE clause
    const params = [id, accountId]; // Add accountId to the parameters

    db.run(sql, params, function (err) {
      if (err) {
        res.status(500).send({ error: 'Failed to delete event' });
        console.error(err.message);
      } else {
        res.status(200).json({ message: 'Event deleted' });
      }
    });
  }
);

app.delete('/api/events', ensureAuthenticated, (req, res) => {
  const sql = 'DELETE FROM events';

  db.run(sql, function (err) {
    if (err) {
      res.status(500).send({ error: 'Failed to delete all events' });
      console.error(err.message);
    } else {
      res.status(200).json({ message: 'All events deleted' });
    }
  });
});

function alterTable() {
  const sql = 'ALTER TABLE events ADD COLUMN account_id INTEGER';

  db.run(sql, (err) => {
    if (err) {
      console.error('Failed to alter table:', err.message);
    } else {
      console.log('Table altered successfully');
    }
  });
}
// alterTable();

//CLOSE DB CONNECTION
// db.close((err) => {
//   if (err) {
//     console.error(err.message);
//   }
//   console.log('Closed the database connection.');
// });

const saltRounds = 10;

app.post('/api/create-admin', async (req, res) => {
  const { username, email, password } = req.body;
  const role = 'admin';

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const sql =
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
    const params = [username, email, hashedPassword, role];

    db.run(sql, params, function (err) {
      if (err) {
        console.error('Error in the query:', err.message);
        res.status(500).send({ error: 'Failed to create admin user' });
      } else {
        res
          .status(201)
          .json({ message: 'Admin user created', id: this.lastID });
      }
    });
  } catch (err) {
    console.error('Error hashing password:', err.message);
    res.status(500).send({ error: 'Failed to hash password' });
  }
});

// const emailToCheck = 'robertirska@gmail.com';

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
