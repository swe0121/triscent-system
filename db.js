const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'triscent.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  try { return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(actual, 'hex')); }
  catch { return false; }
}

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      contact TEXT DEFAULT '',
      address TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','staff','owner')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      scent_notes TEXT NOT NULL,
      mood TEXT NOT NULL,
      size TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      image TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      payment_reference TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'Pending Verification',
      order_status TEXT NOT NULL DEFAULT 'Pending',
      claim_code TEXT UNIQUE,
      duplicate_flag INTEGER NOT NULL DEFAULT 0,
      restocked INTEGER NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      packaging TEXT DEFAULT '',
      gift_message TEXT DEFAULT '',
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      body TEXT NOT NULL,
      staff_reply TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id, order_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(product_id) REFERENCES products(id),
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );
    CREATE TABLE IF NOT EXISTS concerns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      staff_reply TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );
    CREATE TABLE IF NOT EXISTS wishlists (
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id, product_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      cart_json TEXT NOT NULL DEFAULT '[]',
      csrf TEXT NOT NULL,
      flash TEXT DEFAULT '',
      expires_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  const count = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
  if (count === 0) {
    const cats = [['Floral','floral'],['Fruity','fruity'],['Woody','woody'],['Fresh','fresh'],['Sweet','sweet'],['Herbal','herbal']];
    const ins = db.prepare('INSERT INTO categories(name,slug) VALUES (?,?)');
    for (const c of cats) ins.run(...c);
  }

  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const ins = db.prepare('INSERT INTO users(name,email,password_hash,contact,address,role) VALUES (?,?,?,?,?,?)');
    ins.run('Triscent Owner','admin@triscent.local',hashPassword('Admin123!'),'09171234567','Triscent Main Store','owner');
    ins.run('Triscent Staff','staff@triscent.local',hashPassword('Staff123!'),'09170000000','Triscent Main Store','staff');
  }

  const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  if (productCount === 0) {
    const catId = Object.fromEntries(db.prepare('SELECT id,slug FROM categories').all().map(x=>[x.slug,x.id]));
    const products = [
      ['Lavender Bliss','lavender-bliss','floral','A calming lavender candle made for quiet nights and relaxing spaces.','Lavender, Floral, Herbal','Relax','200g',250,18,'/assets/products/lavender.svg'],
      ['Vanilla Dream','vanilla-dream','sweet','Warm vanilla with a soft creamy finish for a cozy and comforting mood.','Vanilla, Cream, Sweet','Cozy','200g',250,12,'/assets/products/vanilla.svg'],
      ['Ocean Breeze','ocean-breeze','fresh','A clean ocean inspired scent with airy notes for a fresh room.','Marine, Fresh, Cotton','Fresh','200g',280,8,'/assets/products/ocean.svg'],
      ['Rose Petal','rose-petal','floral','Soft rose petals with a light powdery finish for a romantic atmosphere.','Rose, Floral, Powder','Romantic','200g',260,5,'/assets/products/rose.svg'],
      ['Citrus Sunshine','citrus-sunshine','fruity','Bright orange and lemon notes that make a room feel lively and clean.','Orange, Lemon, Citrus','Energy','200g',240,14,'/assets/products/citrus.svg'],
      ['Sandalwood Calm','sandalwood-calm','woody','Smooth sandalwood with warm earthy notes for a grounded mood.','Sandalwood, Amber, Wood','Calm','200g',280,3,'/assets/products/sandalwood.svg'],
      ['Fresh Linen','fresh-linen','fresh','Clean linen and soft soap notes for a just washed feeling.','Cotton, Linen, Clean','Fresh','100g',180,20,'/assets/products/linen.svg'],
      ['Sweet Amber','sweet-amber','sweet','A rich amber scent with soft caramel warmth for evenings.','Amber, Caramel, Warm Spice','Cozy','200g',290,7,'/assets/products/amber.svg']
    ];
    const ins = db.prepare(`INSERT INTO products(name,slug,category_id,description,scent_notes,mood,size,price,stock,image)
      VALUES (?,?,?,?,?,?,?,?,?,?)`);
    for (const p of products) ins.run(p[0],p[1],catId[p[2]],p[3],p[4],p[5],p[6],p[7],p[8],p[9]);
  }
}

module.exports = { db, init, hashPassword, verifyPassword };
