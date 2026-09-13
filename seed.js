const db = require('./db');

console.log('Seeding database with sample data...');

db.serialize(() => {
  db.run("DELETE FROM menu_items");
  db.run("DELETE FROM events");

  const insertMenu = db.prepare("INSERT INTO menu_items (name, category, description, price, image) VALUES (?, ?, ?, ?, ?)");
  insertMenu.run("Byrek me Djathë", "Të përbashkëta", "Byrek tradicional i pjekur", 2.50, "https://images.unsplash.com/photo-1541185936-95b0f2b1a4d5?auto=format&fit=crop&w=800&q=60");
  insertMenu.run("Tavë Kosi", "Kuzhinë Shqiptare", "Tavë tradicionale me mish dhe kos", 8.50, "https://images.unsplash.com/photo-1543353071-087092ec393d?auto=format&fit=crop&w=800&q=60");
  insertMenu.run("Pica Margherita", "Pizza", "Pica klasike me domate dhe mocarela", 6.50, "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&w=800&q=60");
  insertMenu.run("Fresk Bilancues", "Pije", "Lëng i freskët frutash", 2.00, "https://images.unsplash.com/photo-1524594154903-2b1c4eaab19d?auto=format&fit=crop&w=800&q=60");
  insertMenu.run("Salatë Greke", "Salata", "Salatë me djathë feta dhe ullinj", 4.50, "https://images.unsplash.com/photo-1564540580-b57a20d7d04b?auto=format&fit=crop&w=800&q=60");
  insertMenu.finalize();

  const insertEvent = db.prepare("INSERT INTO events (title, date, time, description, image) VALUES (?, ?, ?, ?, ?)");
  insertEvent.run("Mbrëmje Live Jazz", "2026-10-01", "20:00", "Koncert i vogël me muzikë jazz", "https://images.unsplash.com/photo-1504650359781-39d274a33f35?auto=format&fit=crop&w=800&q=60");
  insertEvent.run("Degustim Verërash", "2026-10-15", "19:00", "Degustim verërash lokale", "https://images.unsplash.com/photo-1524592819424-2f7aa6c4d074?auto=format&fit=crop&w=800&q=60");
  insertEvent.finalize();

  console.log('Seed i bazës përfundoi.');
  process.exit(0);
});
