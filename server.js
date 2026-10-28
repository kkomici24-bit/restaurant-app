const express = require('express');
const path = require('path');
const session = require('express-session');
const dotenv = require('dotenv');
const db = require('./db');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ADMIN_PASS = process.env.ADMIN_PASS || (IS_PRODUCTION ? '' : 'admin123');
const SESSION_SECRET = process.env.SESSION_SECRET || (IS_PRODUCTION ? '' : 'keyboard_cat');
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

if (IS_PRODUCTION && (!ADMIN_PASS || !SESSION_SECRET)) {
  throw new Error('ADMIN_PASS and SESSION_SECRET must be configured in production.');
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
if (IS_PRODUCTION) app.set('trust proxy', 1);
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION
  }
}));

function adminOnly(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.redirect('/admin/login');
}

const hasEmailConfig = process.env.EMAIL_SMTP_HOST && process.env.FROM_EMAIL;
const transporter = hasEmailConfig ? nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: parseInt(process.env.EMAIL_SMTP_PORT || '587', 10),
  secure: (process.env.EMAIL_SMTP_SECURE === 'true'),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}) : null;

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_KEY ? require('stripe')(STRIPE_KEY) : null;

function generateReservationPDF(reservation, paid) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });

    doc.fontSize(20).text('Konfirmim Rezervimi', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Emri: ${reservation.name}`);
    doc.text(`Telefoni: ${reservation.phone}`);
    doc.text(`Email: ${reservation.email || '-'}`);
    doc.text(`Data: ${reservation.date}  Ora: ${reservation.time}`);
    doc.text(`Nr. personave: ${reservation.guests}`);
    doc.moveDown();
    doc.text('Shënime:');
    doc.text(reservation.notes || '-');
    doc.moveDown();
    doc.text(`Statusi pagesës: ${paid ? 'E paguar' : 'Nuk është paguar'}`);
    doc.end();
  });
}

function generateOrderPDF(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.fontSize(18).text('Fatura / Porosia', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Emri: ${order.customer_name || '-'} `);
    doc.text(`Telefoni: ${order.phone || '-'} `);
    doc.text(`Email: ${order.email || '-'} `);
    doc.text(`Adresa: ${order.address || '-'} `);
    doc.moveDown();
    doc.text('Artikujt:');
    try {
      const items = JSON.parse(order.items || '[]');
      items.forEach(i => {
        doc.text(`- ${i.name} x${i.qty}  (${i.price} € sec)`);
      });
    } catch (e) {
      doc.text(order.items || '-');
    }
    doc.moveDown();
    doc.text(`Totali: ${order.total} €`);
    doc.moveDown();
    doc.text(`Statusi pagesës: ${order.paid ? 'E paguar' : 'Jo paguar'}`);
    doc.text(`Statusi dorëzimit: ${order.delivered ? 'Dorëzuar' : 'Nuk është dorëzuar'}`);
    doc.end();
  });
}

async function sendOrderEmail(order, pdfBuffer, subject) {
  const canEmail = transporter && process.env.FROM_EMAIL && order.email;
  if (!canEmail) {
    try {
      const outdir = path.join(__dirname, 'public', 'outbox');
      if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });
      const filename = `order-${order.id || 'unknown'}-${Date.now()}.pdf`;
      fs.writeFileSync(path.join(outdir, filename), pdfBuffer);
      console.log('Saved order PDF to outbox:', filename);
    } catch (e) { console.error('Outbox save error:', e); }
    return;
  }
  const mail = {
    from: process.env.FROM_EMAIL,
    to: order.email,
    subject: subject || 'Konfirmim porosie',
    text: `Përshëndetje ${order.customer_name || ''},\n\nFaleminderit për porosinë tuaj. Ju lutem gjeni bashkangjitur faturën.`,
    attachments: [ { filename: 'porosi.pdf', content: pdfBuffer } ]
  };
  try {
    await transporter.sendMail(mail);
  } catch (err) { console.error('Order email error:', err); }
}

async function sendReservationEmail(reservation, pdfBuffer, subject) {
  const canEmail = transporter && process.env.FROM_EMAIL && reservation.email;
  if (!canEmail) {
    try {
      const outdir = path.join(__dirname, 'public', 'outbox');
      if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });
      const filename = `reservation-${reservation.id || 'unknown'}-${Date.now()}.pdf`;
      fs.writeFileSync(path.join(outdir, filename), pdfBuffer);
      console.log('Saved reservation PDF to outbox:', filename);
    } catch (e) { console.error('Outbox save error:', e); }
    return;
  }
  const mail = {
    from: process.env.FROM_EMAIL,
    to: reservation.email,
    subject: subject || 'Konfirmim rezervimi',
    text: `Përshëndetje ${reservation.name},\n\nFaleminderit për rezervimin tuaj.\n\nData: ${reservation.date} Ora: ${reservation.time}\n\nJu lutem gjeni bashkangjitur konfirmimin.\n`,
    attachments: [ { filename: 'rezervim.pdf', content: pdfBuffer } ]
  };
  try {
    await transporter.sendMail(mail);
  } catch (err) {
    console.error('Email send error:', err);
  }
}

app.get('/', (req, res) => {
  db.all('SELECT * FROM events ORDER BY date LIMIT 3', [], (err, events) => {
    if (err) events = [];
    db.all('SELECT * FROM menu_items LIMIT 6', [], (err2, items) => {
      if (err2) items = [];
      res.render('index', { events, items, user: req.session.user });
    });
  });
});

app.get('/menu', (req, res) => {
  db.all('SELECT * FROM menu_items ORDER BY category', [], (err, items) => {
    if (err) items = [];
    res.render('menu', { items });
  });
});

app.post('/api/create-order', (req, res) => {
  const { customer_name, email, phone, address, items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' });
  const total = items.reduce((s, it) => s + (parseFloat(it.price || 0) * parseInt(it.qty || 1, 10)), 0);
  const created_at = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO orders (customer_name, email, phone, address, items, total, paid, delivered, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)');
  stmt.run([customer_name, email, phone, address, JSON.stringify(items), total, created_at], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const orderId = this.lastID;
    const order = { id: orderId, customer_name, email, phone, address, items: JSON.stringify(items), total, paid: 0, delivered: 0, created_at };

    if (stripe) {
      (async () => {
        try {
          const amountCents = Math.max(50, Math.round(total * 100));
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{ price_data: { currency: 'eur', product_data: { name: `Porosi #${orderId}` }, unit_amount: amountCents }, quantity: 1 }],
            success_url: `${BASE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
            cancel_url: `${BASE_URL}/menu`,
            metadata: { orderId: String(orderId) }
          });
          res.json({ success: true, orderId, checkoutUrl: session.url });
        } catch (e) {
          console.error('Stripe create session error:', e);
          res.status(500).json({ error: 'Stripe error' });
        }
      })();
    } else {
      res.json({ success: true, orderId });
    }
  });
});

app.get('/order-success', async (req, res) => {
  const sessionId = req.query.session_id;
  const orderId = req.query.orderId;
  let paid = false;
  if (!stripe || !sessionId) return res.render('payment_success', { paid: false, reservationId: orderId });
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    paid = session.payment_status === 'paid';
    if (paid && orderId) {
      db.run('UPDATE orders SET paid=1 WHERE id=?', [orderId], function (err) {
        if (err) console.error('DB update order paid error:', err);
        db.get('SELECT * FROM orders WHERE id=?', [orderId], async (err2, row) => {
          if (!err2 && row) {
            try {
              const pdf = await generateOrderPDF(row);
              await sendOrderEmail(row, pdf, 'Pagesa u pranua - Porosia juaj');
            } catch (e) { console.error(e); }
          }
        });
      });
    }
  } catch (e) { console.error('Stripe retrieve error:', e); }
  res.render('payment_success', { paid, reservationId: orderId, resource: 'order' });
});

app.get('/reservations', (req, res) => {
  res.render('reservations');
});

app.get('/api/menu', (req, res) => {
  db.all('SELECT * FROM menu_items ORDER BY category', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/reservations', (req, res) => {
  const { name, phone, email, date, time, guests, notes } = req.body;
  const created_at = new Date().toISOString();
  const paid = 0;
  const stmt = db.prepare('INSERT INTO reservations (name, phone, email, date, time, guests, notes, created_at, paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run([name, phone, email, date, time, guests, notes, created_at, paid], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const reservationId = this.lastID;
    const reservation = { id: reservationId, name, phone, email, date, time, guests, notes, created_at, paid };

    (async () => {
      try {
        const pdf = await generateReservationPDF(reservation, false);
        await sendReservationEmail(reservation, pdf, 'Konfirmim rezervimi');
      } catch (e) {
        console.error('PDF/email error:', e);
      }
    })();

    res.json({ success: true, id: reservationId });
  });
});

app.get('/api/reservations', adminOnly, (req, res) => {
  db.all('SELECT * FROM reservations ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/admin/login', (req, res) => {
  res.render('admin_login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASS) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.render('admin_login', { error: 'Gabim: Fjalëkalim i pasaktë.' });
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/admin', adminOnly, (req, res) => {
  db.all('SELECT * FROM menu_items ORDER BY category', [], (err, items) => {
    if (err) items = [];
    db.all('SELECT * FROM reservations ORDER BY created_at DESC', [], (err2, reservations) => {
      if (err2) reservations = [];
      db.all('SELECT * FROM orders ORDER BY created_at DESC', [], (err3, orders) => {
        if (err3) orders = [];
        res.render('admin', { items, reservations, orders });
      });
    });
  });
});

app.get('/api/orders', adminOnly, (req, res) => {
  db.all('SELECT * FROM orders ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/orders/:id/delivered', adminOnly, (req, res) => {
  const id = req.params.id;
  const delivered = req.body && typeof req.body.delivered !== 'undefined' ? (req.body.delivered ? 1 : 0) : 1;
  db.run('UPDATE orders SET delivered=? WHERE id=?', [delivered, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes, id, delivered });
  });
});

app.get('/api/orders/:id/pdf', adminOnly, (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM orders WHERE id = ?', [id], async (err, row) => {
    if (err || !row) return res.status(404).send('Porosia nuk u gjet.');
    try {
      const pdf = await generateOrderPDF(row);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=porosi-${id}.pdf`);
      res.send(pdf);
    } catch (e) { res.status(500).send('Gabim në krijimin e PDF.'); }
  });
});

app.get('/api/reservations/:id/pdf', adminOnly, (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM reservations WHERE id = ?', [id], async (err, row) => {
    if (err || !row) return res.status(404).send('Rezervimi nuk u gjet.');
    try {
      const pdf = await generateReservationPDF(row, !!row.paid);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=rezervim-${id}.pdf`);
      res.send(pdf);
    } catch (e) {
      res.status(500).send('Gabim në krijimin e PDF.');
    }
  });
});
app.put('/api/reservations/:id/paid', adminOnly, (req, res) => {
  const id = req.params.id;
  const paid = req.body && typeof req.body.paid !== 'undefined' ? (req.body.paid ? 1 : 0) : 1;
  db.run('UPDATE reservations SET paid=? WHERE id=?', [paid, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes, id, paid });
  });
});

app.post('/api/menu', adminOnly, (req, res) => {
  const { name, category, description, price, image } = req.body;
  db.run('INSERT INTO menu_items (name, category, description, price, image) VALUES (?, ?, ?, ?, ?)', [name, category, description, price, image], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

app.put('/api/menu/:id', adminOnly, (req, res) => {
  const id = req.params.id;
  const { name, category, description, price, image } = req.body;
  db.run('UPDATE menu_items SET name=?, category=?, description=?, price=?, image=? WHERE id=?', [name, category, description, price, image, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes });
  });
});

app.delete('/api/menu/:id', adminOnly, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM menu_items WHERE id=?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes });
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST === '0.0.0.0' ? '0.0.0.0' : HOST}:${PORT} (listening)`);
  console.log('If you want to expose this publicly, set BASE_URL and configure DNS/firewall accordingly.');
});
