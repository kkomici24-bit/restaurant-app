document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('reservationForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const payload = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        date: data.date,
        time: data.time,
        guests: parseInt(data.guests, 10),
        notes: data.notes
      };

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      const el = document.getElementById('reservationResult');
      if (result && result.success) {
        el.innerHTML = '<div class="alert alert-success">Rezervimi u krijua me sukses. ID: ' + result.id + '</div>';
        form.reset();
      } else {
        el.innerHTML = '<div class="alert alert-danger">Ndodhi një gabim.</div>';
      }
    });
  }

  const addMenuForm = document.getElementById('addMenuForm');
  if (addMenuForm) {
    addMenuForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(addMenuForm).entries());
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          name: data.name, category: data.category,
          description: data.description, price: parseFloat(data.price), image: data.image
        })
      });
      const r = await res.json();
      if (r && r.success) {
        location.reload();
      } else {
        alert('Gabim: ' + (r.error || '')); 
      }
    });
  }

  document.querySelectorAll('.delete-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Fshij artikullin?')) return;
      const id = btn.dataset.id;
      const res = await fetch('/api/menu/' + id, { method: 'DELETE' });
      const r = await res.json();
      if (r && r.success) location.reload();
      else alert('Gabim');
    });
  });

  document.querySelectorAll('.mark-paid').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Shënoj si i paguar?')) return;
      const id = btn.dataset.id;
      const res = await fetch('/api/reservations/' + id + '/paid', {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ paid: 1 })
      });
      const r = await res.json();
      if (r && r.success) location.reload();
      else alert('Gabim në përditësim');
    });
  });

  function getCart() { return JSON.parse(localStorage.getItem('cart') || '[]'); }
  function saveCart(c) { localStorage.setItem('cart', JSON.stringify(c)); }
  function renderCart() {
    const cart = getCart();
    document.getElementById('cartCount').textContent = cart.reduce((s,i)=>s+i.qty,0) || 0;
    const container = document.getElementById('cartItems');
    if (!container) return;
    if (cart.length === 0) { container.innerHTML = '<p>Karroca është bosh.</p>'; return; }
    let html = '<ul class="list-group">';
    cart.forEach(it => {
      html += `<li class="list-group-item d-flex justify-content-between align-items-center">${it.name} x${it.qty} <span>${(it.price*it.qty).toFixed(2)} €</span></li>`;
    });
    html += '</ul>';
    const total = cart.reduce((s,i)=>s + (i.price*i.qty),0);
    html += `<div class="mt-2"><strong>Totali: ${total.toFixed(2)} €</strong></div>`;
    container.innerHTML = html;
  }

  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price || '0');
      const cart = getCart();
      const existing = cart.find(c => String(c.id) === String(id));
      if (existing) existing.qty += 1; else cart.push({ id, name, price, qty: 1 });
      saveCart(cart);
      renderCart();
      alert('Shtuar në porosi');
    });
  });

  const cartModal = document.getElementById('cartModal');
  if (cartModal) {
    cartModal.addEventListener('show.bs.modal', renderCart);
  }

  const placeOrderBtn = document.getElementById('placeOrderBtn');
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', async () => {
      const cart = getCart();
      if (!cart || cart.length === 0) return alert('Karroca është bosh.');
      const form = document.getElementById('checkoutForm');
      const data = Object.fromEntries(new FormData(form).entries());
      const payload = {
        customer_name: data.customer_name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        items: cart
      };
      const res = await fetch('/api/create-order', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const r = await res.json();
      const resultEl = document.getElementById('checkoutResult');
      if (r && r.success) {
        if (r.checkoutUrl) {
          window.location.href = r.checkoutUrl;
          return;
        }
        resultEl.innerHTML = '<div class="alert alert-success">Porosia u krijua. ID: ' + r.orderId + '</div>';
        localStorage.removeItem('cart');
        renderCart();
      } else {
        resultEl.innerHTML = '<div class="alert alert-danger">Ndodhi një gabim: ' + (r.error || '') + '</div>';
      }
    });
  }

  document.querySelectorAll('.mark-delivered').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Shënoj si dorëzuar?')) return;
      const id = btn.dataset.id;
      const res = await fetch('/api/orders/' + id + '/delivered', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ delivered: 1 }) });
      const r = await res.json();
      if (r && r.success) location.reload(); else alert('Gabim');
    });
  });
});
