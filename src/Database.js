const Type = require("type-instance");
const { deserialize, serialize } = require("v8");
const path = require("path");
const fs = require("fs");
const _ = require("lodash/fp/object");
const exists = path => new Promise((resolve, reject) => fs.exists(path, resolve));

module.exports = class Database {
    constructor(folderPath = "./database") {
        Type.string(folderPath, "folderPath");

        this.folderPath = folderPath;
        this.data = {};
    }
    async read() {
        const { folderPath } = this;
        const files = (await fs.promises.readdir(folderPath)).sort();
        const raws = [];

        for (const file of files) raws.push(await fs.promises.readFile(`${folderPath}/${file}`));

        const raw = Buffer.from(...raws);
        const data = deserialize(raw);

        Type.object.notArray(data, "database's data");

         this.data = data;

         return this;
    }
    async setup() {
        const { folderPath } = this;

        switch(true) {
            case !await exists(folderPath): try {
                await fs.promises.mkdir(folderPath);
            } catch {}

            case !await exists(`${folderPath}/0`): try {
                await fs.promises.writeFile(`${folderPath}/0`, serialize({}));
            } catch {}
        }

        await this.read();

        return this;
    }
    set(value, path) {
        if (path) {
            Type.string(path, "path");

            this.data = _.set(path, value, this.data);
        } else {
            Type.object.notArray(value, "value");

            this.data = value;
        }

        return this;
    }
    get(path) {
        if (path) {
            Type.string(path, "path");

            return _.get(path, this.data);
        } else return this.data;
    }
    delete(path) {
        if (path) {
            Type.string(path, "path");

            this.data = _.unset(path, this.data);
        } else this.data = {};

        return this;
    }
    async save(maxSizePerFile = 1024) {
        Type.number(maxSizePerFile, "maxSizePerFile");

        const { data, folderPath } = this;
        const serialized = serialize(data);
        const names = [];

        for (let i = 0; i < Math.ceil(serialized.byteLength/maxSizePerFile); i++) names.push(`${i}`) && await fs.promises.writeFile(`${folderPath}/${i}`, serialized.slice(i*maxSizePerFile, i*maxSizePerFile+maxSizePerFile));

        const files = await fs.promises.readdir(folderPath);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (names.includes(file)) continue;

            try { await fs.promises.rm(`${folderPath}/${file}`); } catch {}
        }

        return this;
    }
};