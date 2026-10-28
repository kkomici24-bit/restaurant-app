const menu = [
  { id: 'byrek', name: 'Golden byrek', category: 'Small plates', description: 'Flaky pastry, local cheese, garden herbs.', price: 5.5 },
  { id: 'olive', name: 'Marinated olives', category: 'Small plates', description: 'Citrus, mountain oregano, warm bread.', price: 4 },
  { id: 'tave', name: 'Tavë kosi', category: 'Mains', description: 'Slow-baked lamb, cultured yoghurt, rice.', price: 14 },
  { id: 'sea-bass', name: 'Grilled sea bass', category: 'Mains', description: 'Today’s catch, lemon, parsley potatoes.', price: 18 },
  { id: 'lemonade', name: 'House lemonade', category: 'Drinks', description: 'Fresh lemon, mint, a little wildflower honey.', price: 3.5 }
];

const storageKeys = { cart: 'olive-room-cart-v1', orders: 'olive-room-orders-v1', reservations: 'olive-room-reservations-v1' };
const read = key => JSON.parse(localStorage.getItem(key) || '[]');
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const money = amount => `€${amount.toFixed(2)}`;
let selectedCategory = 'All';

function renderMenu() {
  const items = selectedCategory === 'All' ? menu : menu.filter(item => item.category === selectedCategory);
  document.querySelector('#menu-list').innerHTML = items.map(item => `
    <article class="menu-item">
      <h3>${item.name}</h3><span class="price">${money(item.price)}</span>
      <p>${item.description}</p>
      <button class="add-button" type="button" data-add="${item.id}" aria-label="Add ${item.name} to order">Add to order +</button>
    </article>`).join('');
}

function renderCart() {
  const cart = read(storageKeys.cart);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#order-total').textContent = money(total);
  document.querySelector('#order-items').innerHTML = cart.length ? cart.map(item => `
    <div class="order-line"><span>${item.name} × ${item.quantity}</span><strong>${money(item.price * item.quantity)}</strong><button type="button" data-remove="${item.id}">Remove one</button></div>`).join('') : '<p class="form-footnote">Your order is empty. Choose something from the menu.</p>';
}

document.querySelector('.menu-tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  selectedCategory = button.dataset.category;
  document.querySelectorAll('[data-category]').forEach(tab => tab.classList.toggle('active', tab === button));
  renderMenu();
});

document.querySelector('#menu-list').addEventListener('click', event => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  const product = menu.find(item => item.id === button.dataset.add);
  const cart = read(storageKeys.cart);
  const existing = cart.find(item => item.id === product.id);
  if (existing) existing.quantity += 1;
  else cart.push({ ...product, quantity: 1 });
  write(storageKeys.cart, cart);
  renderCart();
});

const orderPanel = document.querySelector('#order-panel');
document.querySelectorAll('[data-open-order]').forEach(button => button.addEventListener('click', () => {
  renderCart();
  orderPanel.hidden = false;
  document.querySelector('#order-note').textContent = 'This preview saves orders on this device. No payment is processed.';
}));
document.querySelectorAll('[data-close-order]').forEach(button => button.addEventListener('click', () => { orderPanel.hidden = true; }));
document.querySelector('#order-items').addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const cart = read(storageKeys.cart);
  const item = cart.find(entry => entry.id === button.dataset.remove);
  if (item.quantity > 1) item.quantity -= 1;
  else cart.splice(cart.indexOf(item), 1);
  write(storageKeys.cart, cart);
  renderCart();
});
document.querySelector('#save-order').addEventListener('click', () => {
  const cart = read(storageKeys.cart);
  const note = document.querySelector('#order-note');
  if (!cart.length) {
    note.textContent = 'Add an item before saving your order.';
    return;
  }
  const orders = read(storageKeys.orders);
  orders.push({ id: Date.now(), items: cart, total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0), createdAt: new Date().toISOString() });
  write(storageKeys.orders, orders);
  write(storageKeys.cart, []);
  renderCart();
  note.textContent = 'Demo order saved on this device.';
});

const reservationForm = document.querySelector('#reservation-form');
reservationForm.elements.date.min = new Date().toISOString().slice(0, 10);
reservationForm.addEventListener('submit', event => {
  event.preventDefault();
  const reservation = Object.fromEntries(new FormData(reservationForm));
  const reservations = read(storageKeys.reservations);
  reservations.push({ ...reservation, id: Date.now(), createdAt: new Date().toISOString() });
  write(storageKeys.reservations, reservations);
  document.querySelector('#saved-note').textContent = `Table request saved for ${reservation.date} at ${reservation.time}.`;
  reservationForm.reset();
  reservationForm.elements.date.min = new Date().toISOString().slice(0, 10);
});

renderMenu();
renderCart();