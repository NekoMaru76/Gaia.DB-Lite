const { serialize, deserialize } = require("v8");
const { DONE, MODIFY, RECEIVED, DATAFORYA, GIVE, DELETE, ERROR, STORE } = require(`${__dirname}/CommEnum.js`);
const cuid = require("cuid");
const waiting = {};
const todo = [];

let receivedData = false;

global.$send = (code, data) => {
    if (!receivedData) return todo.push({ code, data });

    const id = cuid();
    const serialized = new Int8Array(serialize({ code, data, id }));

    return new Promise((resolve, reject) => {
        waiting[id] = { resolve, reject };

        process.send(serialized);
    });
};
global.$set = async (value, path) => {
    await $send(MODIFY, { path, value });

    return global;
};
global.$get = path => $send(GIVE, { path });
global.$delete = path => $send(DELETE, { path });
global.$save = maxSize => $send(STORE, { maxSize });

process.send(new Int8Array(Buffer.from("First msg")));
process.on("message", msg => {
    try {
        const data = deserialize(Buffer.from(Object.values(msg)));
        const _msg = waiting[data.id];

        if (_msg) switch(data.code) {
            case RECEIVED: case DONE: {
                _msg.resolve(data.data);

                delete waiting[data.id];

                break;
            }
            case ERROR: {
                delete waiting[data.id];
 
                _msg.reject(data.data);
            }
        }
        else switch(data.code) {
            case DATAFORYA: {
                global.$folderPath = data.folderPath;
                receivedData = true;

                process.send(new Int8Array(serialize({ id: data.id, code: RECEIVED })));

                for (const { code, data } of todo) $send(code, data);
            }
        }
    } catch(e) {
        process.emit("receiveMessage.error", e);
    }
});

require(process.argv[2]);