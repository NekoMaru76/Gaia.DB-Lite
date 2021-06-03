const { Database } = require(`${__dirname}/../src/index.js`);
const db = new Database;

(async () => {
    await db.setup();
    db.set(0, "hi");
    console.log(db.data, db.get("hi"));
    await db.save();
})();