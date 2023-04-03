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
app.post('/api/register', ensureAuthenticated, async (req, res) => {
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
          res
            .status(201)
            .json({ message: 'User successfully registered', id: this.lastID });
        }
      }
    );
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

app.get('/api/users', ensureAuthenticated, (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      res.status(500).json({ message: 'Error fetching users' });
    } else {
      res.json(rows);
    }
  });
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
