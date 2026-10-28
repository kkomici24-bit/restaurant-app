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

  db.run(`CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'Front of house',
    phone TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payroll (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    staff_name TEXT NOT NULL,
    department TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    payment_date TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    expense_date TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL DEFAULT 'Kitchen',
    unit TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    low_stock_level REAL NOT NULL DEFAULT 0 CHECK(low_stock_level >= 0),
    updated_at TEXT NOT NULL
  )`);

  db.all('PRAGMA table_info(staff)', (err, rows) => {
    if (!err && rows && !rows.some(row => row.name === 'department')) {
      db.run("ALTER TABLE staff ADD COLUMN department TEXT NOT NULL DEFAULT 'Front of house'");
    }
  });

  db.all('PRAGMA table_info(inventory)', (err, rows) => {
    if (!err && rows && !rows.some(row => row.name === 'department')) {
      db.run("ALTER TABLE inventory ADD COLUMN department TEXT NOT NULL DEFAULT 'Kitchen'");
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS restaurant_tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL UNIQUE,
    seats INTEGER NOT NULL CHECK(seats > 0),
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'reserved', 'cleaning')),
    updated_at TEXT NOT NULL
  )`);

  db.get('SELECT COUNT(*) AS count FROM restaurant_tables', [], (err, row) => {
    if (err || !row || row.count > 0) return;
    const insertTable = db.prepare('INSERT INTO restaurant_tables (label, seats, status, updated_at) VALUES (?, ?, ?, ?)');
    const timestamp = new Date().toISOString();
    [
      ['T01', 2], ['T02', 2], ['T03', 4], ['T04', 4],
      ['T05', 4], ['T06', 6], ['T07', 6], ['T08', 8]
    ].forEach(([label, seats]) => insertTable.run(label, seats, 'available', timestamp));
    insertTable.finalize();
  });

  db.all("PRAGMA table_info(reservations)", (err, rows) => {
    if (!err && rows) {
      const hasPaid = rows.some(r => r.name === 'paid');
      if (!hasPaid) {
        db.run("ALTER TABLE reservations ADD COLUMN paid INTEGER DEFAULT 0");
      }
    }
  });

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
