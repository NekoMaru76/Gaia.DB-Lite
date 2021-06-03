# Gaia.DB-Lite
A lite version of Gaia.DB.

# Example
## Singlethreaded
```js
const { Database } = require(`gaia.db-lite`);
const db = new Database;

(async () => {
    await db.setup();
    db.set(0, "hi");
    console.log(db.data, db.get("hi"));
    await db.save();
})();
```

## Multithreaded
index.js
```js
const { Master } = require(`${__dirname}/../src/index.js`);
const master = new Master;

setImmediate(async () => {
    await master.setup();
    await master.fork(`${__dirname}/child.js`);
});
```
child.js
```js
console.log(`[${process.pid}] Here!`);
setImmediate(async () => {
    await $set(true, process.pid.toString());
    console.log(`[${process.pid}] ${await $get(process.pid.toString())}`);
    await $save();
});
```

# Methods
## Singlethreaded
### new Database(folderPath?: String = "./database")
- folderPath Database's folder path.
Create new database instance.
### Database#save() -> Promise<Database#read()>
Save the database.
### Database#read() -> Promise<this>
Read the database files and refresh cache (database object).
### Database#setup() -> Promise<this>
Create the database folder if it's not exist and do other stuffs.
### Database#set(value: Any, path?: String) -> this
Change path's value of database object. If path is a falsy value, it will change the database object and the value must be an object.
### Database#get(path?) -> Any
Get path's value of database object. If path is a falsy value, it will returns the database object.
### Database#delete(path?) -> Any
Unset path's valye of database object. If path is a falsy value, it will set database object's value to blank object.
### Database#data
Database object.
### Database#folderPath
Database's folder path.
## Multithreaded
### new Master(folderPath?: String = "./database", childFilePath?: String);
- folderPath Database's folder path.
- childFilePath Default child's file path for Master#spawn.
Master class have same properties and methods with Database and [EventEmitter](https://npmjs.com/package/@evodev/eventemitter).
### Master#fork(childFilePath?: String) -> Promise<[ChildProcess](https://nodejs.org/api/child_process.html)>
Fork a file to create new child.
### Child
#### global.$set(value: Any, path?: String) -> Promise<this>
A copy of Database#set.
#### global.$get(value: Any) -> Promise<Any>
A copy of Database#get.
#### global.$delete(path?: String) -> Promise<this>
A copy of Database#delete.
#### global.$save() -> Promise<this>
A copy of Database#save.
##### global.$folderPath
Database's folder path.

# Support Us
[PayPal](https://paypal.me/nekomaru76)

# Developer
Discord: Ganora Mirush#9524<br />
NPM: nekomaru76<br />
GitHub: NekoMaru76