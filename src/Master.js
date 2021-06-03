const cp = require("child_process");
const Type = require("type-instance");
const Database = require(`${__dirname}/Database.js`);
const { serialize, deserialize } = require("v8");
const Events = require("@evodev/eventemitter");
const { DONE, MODIFY, RECEIVED, DATAFORYA, GIVE, DELETE, ERROR, STORE } = require(`${__dirname}/CommEnum.js`);
const cuid = require(`${__dirname}/cuid.js`);

function getAllFuncs(toCheck) {
    const names = [...Object.getOwnPropertyNames(toCheck), ...Object.getOwnPropertySymbols(toCheck), ...Object.getOwnPropertyNames(Object.getPrototypeOf(toCheck))];
    const object = {};

    for (const name of names) object[name] = toCheck[name];

    return object;
}

function mix(...cs) {
    const object = {}; 

    for (const ps of cs) 
        for (const [k, v] of Object.entries(getAllFuncs(ps))) if (k !== "constructor") object[k] = (typeof v === "function" ? v.bind(object) : v); 

    return object;
}

class Master {
    constructor(childFilePath) {
        if (childFilePath) {
            Type.string(childFilePath, "childFilePath");

            this.childPath = childFilePath;
        }

        this.childs = {};
    }
    fork(file = this.childFilePath) {
        Type.string(file, "file");

        const forked = cp.fork(`${__dirname}/child.js`, [file]);

        return new Promise((resolve, reject) => {
            (new Promise((res, rej) => {
                const dataForYaID = cuid();

                forked.$waiting = {
                    [dataForYaID]: { resolve: res, reject: rej }
                };
                forked.$send = (code, data) => {
                    const id = cuid();
                    const serialized = serialize({ id, code, data });

                    return new Promise((resolve, reject) => {
                        forked.$waiting[id] = { resolve, reject };

                        forked.send(new Int8Array(serialized));
                    });
                };

                const onerror = err => reject(err);
                const onmessage = async msg => {
                    try {
                        const data = deserialize(Buffer.from(Object.values(msg)));
                        const _ = forked.$waiting[data.id];

                        if (_) switch(data.code) {
                            case RECEIVED:
                            case DONE: {
                                _.resolve(data.data);

                                delete forked.$waiting[data.id];

                                break;
                            }
                        }
                        else switch(data.code) {
                            case MODIFY: {
                               try {
                                   this.set(data.data.value, data.data.path);
                               } catch(e) { return forked.send(new Int8Array(serialize({ code: ERROR, id: data.id, data: e }))); }
                               this.emit(`child.*.set`, forked, data.data.value, data.data.path);
                                this.emit(`child.${forked.pid}.set`, forked, data.data.value, data.data.path);
                                forked.send(new Int8Array(serialize({ code: DONE, id: data.id })));

                                break;
                            }
                            case GIVE: {
                                this.emit(`child.*.get`, forked, data.data.path);
                                this.emit(`child.${forked.pid}.get`, forked, data.data.path);
                                forked.send(new Int8Array(serialize({ code: DONE, id: data.id, data: this.get(data.data.path) })));

                                break;
                            }
                            case STORE: {
                                try {
                                   await this.save(data.data.maxSize);
                               } catch(e) { 
                                   this.emit(`child.*.failSave`, forked, data.data.maxSize || 1024, e);
                                   this.emit(`child.${forked.pid}.failSave`, forked, data.data.maxSize || 1024, e);

                                   return forked.send(new Int8Array(serialize({ code: ERROR, id: data.id, data: e }))); 
                                }

                                this.emit(`child.*.save`, forked, data.data.maxSize || 1024);
                                this.emit(`child.${forked.pid}.save`, forked, data.data.maxSize || 1024);
                                forked.send(new Int8Array(serialize({ code: DONE, id: data.id })));

                                break;
                            }
                            case DELETE: {
                                try {
                                   this.delete(data.data.path);
                               } catch(e) { return forked.send(new Int8Array(serialize({ code: ERROR, id: data.id, data: e }))); }
                                this.emit(`child.*.delete`, forked, data.data.path);
                                this.emit(`child.${forked.pid}.delete`, forked, data.data.path);
                                forked.send(new Int8Array(serialize({ code: DONE, id: data.id, data: this.get("") })));

                                break;
                            }
                        }
                    } catch(e) {
                        this.emit("master.childs.*.errorMessage", forked, e);
                        this.emit(`master.childs.${forked.pid}.errorMessage`, forked, e);
                    }
                };

                forked.once("message", () => {
                    this.childs[forked.pid] = forked;

                    forked.send(new Int8Array(serialize({ code: DATAFORYA, data: { folder: this.folderPath }, id: dataForYaID })));
                    forked.off("error", onerror);
                    forked.on("message", onmessage);
                    forked.on("error", err => {
                        this.emit("child.*.error", forked, err);
                        this.emit(`child.${forked.pid}.error`, forked, err);
                    });
                    forked.once("exit", (code, signal) => {
                        this.emit("child.*.exit", forked, code, signal);
                        this.emit(`child.${forked.pid}.exit`, forked, code, signal);
                    });
                    forked.once("disconnect", () => {
                        this.emit("child.*.disconnect", forked);
                        this.emit(`child.${forked.pid}.disconnect`, forked);

                        delete childs[forked.pid];
                    });
                });
                forked.once("error", onerror);
            })).then(() => {
                this.emit("child.*.ready", forked);
                resolve();
            });
        });
    }
}

module.exports = class Wrap {
    constructor(folderPath, childFilePath) {
        return mix(new Events, new Database(folderPath), new Master(childFilePath));
    }
};