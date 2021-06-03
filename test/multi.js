const { Master } = require(`${__dirname}/../src/index.js`);

const master = new Master;

master.on("child.*.ready", forked => console.log(`[${forked.pid}]: Ready!`));
master.on("child.*.set", (forked, value, path) => console.log(`[${forked.pid}](SET): ${path || "{ALL}"} ->`, value));
master.on("child.*.get", (forked, path) => console.log(`[${forked.pid}](GET): ${path || "{ALL}"}`));
master.on("child.*.delete", (forked, path) => console.log(`[${forked.pid}](DEL): ${path || "{ALL}"}`));
master.on("child.*.save", (forked, maxSize) => console.log(`[${forked.pid}](SAV)[${maxSize}]: Success`));
master.on("child.*.failSave", (forked, maxSize, error) => console.log(`[${forked.pid}](SAV)[${maxSize}]:`, error));
master.on("master.childs.*.errorMessage", (forked, error) => console.log(`[${forked.pid}]:`, error));

setImmediate(async () => {
    await master.setup();
    await master.fork(`${__dirname}/child.js`);
});