const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    category TEXT,
    description TEXT,
    price REAL,
    image TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    email TEXT,
    date TEXT,
    time TEXT,
    guests INTEGER,
    notes TEXT,
    created_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    date TEXT,
    time TEXT,
    description TEXT,
    image TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    items TEXT,
    total REAL,
    paid INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    created_at TEXT
  )`);

  // Ensure 'paid' column exists on reservations table (for upgrades on existing DBs)
  db.all("PRAGMA table_info(reservations)", (err, rows) => {
    if (!err && rows) {
      const hasPaid = rows.some(r => r.name === 'paid');
      if (!hasPaid) {
        db.run("ALTER TABLE reservations ADD COLUMN paid INTEGER DEFAULT 0");
      }
    }
  });

  // Auto-seed sample data for offline/demo use if menu is empty
  db.get('SELECT COUNT(*) AS cnt FROM menu_items', (err, row) => {
    if (!err && row && row.cnt === 0) {
      const insert = db.prepare('INSERT INTO menu_items (name, category, description, price, image) VALUES (?, ?, ?, ?, ?)');
      insert.run('Byrek me Djathë', 'Të përbashkëta', 'Byrek tradicional i pjekur', 2.50, '/images/byrek.svg');
      insert.run('Tavë Kosi', 'Kuzhinë Shqiptare', 'Tavë tradicionale me mish dhe kos', 8.50, '/images/tave.svg');
      insert.run('Pica Margherita', 'Pizza', 'Pica klasike me domate dhe mocarela', 6.50, '/images/pizza.svg');
      insert.run('Fresk Bilancues', 'Pije', 'Lëng i freskët frutash', 2.00, '/images/drink.svg');
      insert.run('Salatë Greke', 'Salata', 'Salatë me djathë feta dhe ullinj', 4.50, '/images/salata.svg');
      insert.finalize();

      const ie = db.prepare('INSERT INTO events (title, date, time, description, image) VALUES (?, ?, ?, ?, ?)');
      ie.run('Mbrëmje Live Jazz', '2026-10-01', '20:00', 'Koncert i vogël me muzikë jazz', '/images/event1.svg');
      ie.run('Degustim Verërash', '2026-10-15', '19:00', 'Degustim verërash lokale', '/images/event2.svg');
      ie.finalize();
    }
  });
});

module.exports = db;
