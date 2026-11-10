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
      customization TEXT DEFAULT 'Not Customize',
      remarks TEXT DEFAULT '',
      payment_method TEXT DEFAULT '',
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

  const orderCols = db.prepare("PRAGMA table_info(orders)").all().map(x=>x.name);
  if (!orderCols.includes('customization')) db.exec("ALTER TABLE orders ADD COLUMN customization TEXT DEFAULT 'Not Customize'");
  if (!orderCols.includes('remarks')) db.exec("ALTER TABLE orders ADD COLUMN remarks TEXT DEFAULT ''");
  if (!orderCols.includes('payment_method')) db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT ''");

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

  let productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  const placeholderCount = db.prepare("SELECT COUNT(*) AS c FROM products WHERE name IN ('Lavender Bliss','Vanilla Dream','Ocean Breeze','Rose Petal','Citrus Sunshine','Sandalwood Calm','Fresh Linen','Sweet Amber')").get().c;
  const orderCount = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  if (placeholderCount > 0 && orderCount === 0) {
    db.exec('DELETE FROM wishlists; DELETE FROM products;');
    productCount = 0;
  }
  if (productCount === 0) {
    const catId = Object.fromEntries(db.prepare('SELECT id,slug FROM categories').all().map(x=>[x.slug,x.id]));
    const scentInfo = {
      'Vanilla':['sweet','Vanilla','Cozy','/assets/products/vanilla.jpg'],
      'Coffee':['sweet','Coffee','Energy','/assets/products/coffee.jpg'],
      'Lavender':['floral','Lavender','Relax','/assets/products/lavender.jpg'],
      'Strawberry':['fruity','Strawberry','Romantic','/assets/products/strawberry.jpg'],
      'Warm Cotton':['fresh','Warm Cotton','Fresh','/assets/products/warm-cotton.jpg'],
      'Pomegranate':['fruity','Pomegranate','Energy','/assets/products/pomegranate.jpg'],
      'Sea Breeze':['fresh','Sea Breeze','Fresh','/assets/products/sea-breeze.jpg'],
      'Baby Powder':['fresh','Baby Powder','Calm','/assets/products/baby-powder.jpg'],
      'Cinnamon':['woody','Cinnamon','Cozy','/assets/products/cinnamon.jpg']
    };
    const priceList = {
      '100ML': {'Vanilla':230,'Coffee':230,'Lavender':240,'Strawberry':240,'Warm Cotton':260,'Pomegranate':250,'Sea Breeze':250,'Baby Powder':240,'Cinnamon':240},
      '150ML': {'Vanilla':280,'Coffee':280,'Lavender':280,'Warm Cotton':320,'Pomegranate':310,'Sea Breeze':300,'Baby Powder':280,'Cinnamon':280},
      '250ML': {'Vanilla':300,'Coffee':360,'Lavender':370,'Warm Cotton':440,'Pomegranate':430,'Sea Breeze':430,'Baby Powder':420,'Cinnamon':390},
      '300ML': {'Vanilla':400,'Coffee':400,'Lavender':420,'Warm Cotton':520,'Pomegranate':500,'Sea Breeze':500,'Baby Powder':480,'Cinnamon':430}
    };
    const ins = db.prepare(`INSERT INTO products(name,slug,category_id,description,scent_notes,mood,size,price,stock,image)
      VALUES (?,?,?,?,?,?,?,?,?,?)`);
    for (const [size, scents] of Object.entries(priceList)) {
      for (const [name, price] of Object.entries(scents)) {
        const [cat, notes, mood, image] = scentInfo[name];
        const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${size.toLowerCase()}`;
        ins.run(name,slug,catId[cat],`Triscent ${name} scented candle in ${size} size.`,notes,mood,size,price,15,image);
      }
    }
  }

  // Sync real Triscent image paths and official prices into existing databases.
  const imageByName = {
    'Vanilla':'/assets/products/vanilla.jpg',
    'Coffee':'/assets/products/coffee.jpg',
    'Lavender':'/assets/products/lavender.jpg',
    'Strawberry':'/assets/products/strawberry.jpg',
    'Warm Cotton':'/assets/products/warm-cotton.jpg',
    'Pomegranate':'/assets/products/pomegranate.jpg',
    'Sea Breeze':'/assets/products/sea-breeze.jpg',
    'Baby Powder':'/assets/products/baby-powder.jpg',
    'Cinnamon':'/assets/products/cinnamon.jpg'
  };
  const officialPrices = {
    '100ML': {'Vanilla':230,'Coffee':230,'Lavender':240,'Strawberry':240,'Warm Cotton':260,'Pomegranate':250,'Sea Breeze':250,'Baby Powder':240,'Cinnamon':240},
    '150ML': {'Vanilla':280,'Coffee':280,'Lavender':280,'Warm Cotton':320,'Pomegranate':310,'Sea Breeze':300,'Baby Powder':280,'Cinnamon':280},
    '250ML': {'Vanilla':300,'Coffee':360,'Lavender':370,'Warm Cotton':440,'Pomegranate':430,'Sea Breeze':430,'Baby Powder':420,'Cinnamon':390},
    '300ML': {'Vanilla':400,'Coffee':400,'Lavender':420,'Warm Cotton':520,'Pomegranate':500,'Sea Breeze':500,'Baby Powder':480,'Cinnamon':430}
  };
  const syncProduct = db.prepare('UPDATE products SET price=?, image=? WHERE name=? AND size=?');
  for (const [size, scents] of Object.entries(officialPrices)) {
    for (const [name, price] of Object.entries(scents)) {
      syncProduct.run(price, imageByName[name] || '/assets/products/default.svg', name, size);
    }
  }
}

module.exports = { db, init, hashPassword, verifyPassword };
