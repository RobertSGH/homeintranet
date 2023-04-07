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

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});

app.use(express.static('public')); //serving static files
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//CREATING ROUTES
app.get('/api/data', (req, res) => {
  const data = {
    message: 'Message from the API',
  };
  res.json(data);
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

//WORKING WITH DATABASE
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./myDatabase.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to myDatabase');
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

//Registration
app.post(
  '/api/register',
  ensureAuthenticated,
  ensureAdmin,
  async (req, res) => {
    const { username, email, password, role } = req.body;

    if (req.user.role !== 'admin' && role === 'admin') {
      res
        .status(403)
        .json({ message: 'Forbidden: You cannot create an admin user' });
      return;
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      db.run(
        'INSERT INTO users(username, email, password, role) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, role],
        function (err) {
          if (err) {
            console.error('Error:', err);
            res
              .status(500)
              .json({ message: 'Error registering user', error: err });
          } else {
            res.status(201).json({
              message: 'User successfully registered',
              id: this.lastID,
            });
          }
        }
      );
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ message: 'Error registering user', error: err });
    }
  }
);

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
    const sql = 'SELECT * FROM users';

    db.all(sql, [], (err, rows) => {
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

  db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
    if (err) {
      res.status(500).json({ message: 'Error deleting user' });
    } else if (this.changes === 0) {
      res.status(404).json({ message: 'User not found' });
    } else {
      res.json({ message: 'User successfully deleted', id: userId });
    }
  });
});

app.post('/api/announcements', (req, res) => {
  const { title, content } = req.body;

  if (req.isAuthenticated() && req.user.role === 'admin') {
    const sql =
      'INSERT INTO announcements(title, message, created_at, updated_at) VALUES (?,?,?,?)';
    const currentDate = new Date().toISOString();
    const params = [title, content, currentDate, currentDate];

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
      .send({ error: 'You do not have permission to create an announcement' });
  }
});

app.get('/api/announcements', (req, res) => {
  const sql = 'SELECT * FROM announcements ORDER BY created_at DESC';

  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).send({ error: 'Failed to fetch announcements' });
      console.error(err.message);
    } else {
      res.json({ announcements: rows, role: req.user ? req.user.role : null });
    }
  });
});

app.put('/api/announcements/:id', (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (req.isAuthenticated() && req.user.role === 'admin') {
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
    res
      .status(403)
      .send({ error: 'You do not have permission to update announcements' });
  }
});

app.delete('/api/announcements/:id', (req, res) => {
  const id = req.params.id;

  if (req.isAuthenticated() && req.user.role === 'admin') {
    const sql = 'DELETE FROM announcements WHERE id = ?';
    const params = [id];

    db.run(sql, params, function (err) {
      if (err) {
        res.status(500).send({ error: 'Failed to delete announcement' });
        console.error(err.message);
      } else {
        res.json({ message: 'Announcement deleted', id: id });
      }
    });
  } else {
    res
      .status(403)
      .send({ error: 'You do not have permission to delete an announcement' });
  }
});

app.post('/api/events', ensureAuthenticated, (req, res) => {
  const { title, description, start_date, end_date, all_day } = req.body;
  console.log('Received event data:', req.body); // Add this line to log the received data

  const sql =
    'INSERT INTO events (title, description, start_date, end_date, all_day) VALUES (?, ?, ?, ?, ?)';
  const params = [title, description, start_date, end_date, all_day];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error in the query:', err.message); // Add this line to log the error message
      res.status(500).send({ error: 'Failed to create event' });
    } else {
      res.status(201).json({ message: 'Event created', id: this.lastID });
    }
  });
});

app.get('/api/events', (req, res) => {
  const sql = 'SELECT * FROM events';

  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).send({ error: 'Failed to fetch events' });
      console.error(err.message);
    } else {
      res.status(200).json(rows);
    }
  });
});

app.put('/api/events/:id', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const { title, description, start_date, end_date, all_day } = req.body;

  const sql =
    'UPDATE events SET title = COALESCE(?, title), description = COALESCE(?, description), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date), all_day = COALESCE(?, all_day) WHERE id = ?';
  const params = [title, description, start_date, end_date, all_day, id];

  db.run(sql, params, function (err) {
    if (err) {
      res.status(500).send({ error: 'Failed to update event' });
      console.error(err.message);
    } else {
      res.status(200).json({ message: 'Event updated', id: id });
    }
  });
});

app.delete('/api/events/:id', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM events WHERE id = ?';

  db.run(sql, id, function (err) {
    if (err) {
      res.status(500).send({ error: 'Failed to delete event' });
      console.error(err.message);
    } else {
      res.status(200).json({ message: 'Event deleted' });
    }
  });
});

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

//CLOSE DB CONNECTION
// db.close((err) => {
//   if (err) {
//     console.error(err.message);
//   }
//   console.log('Closed the database connection.');
// });
