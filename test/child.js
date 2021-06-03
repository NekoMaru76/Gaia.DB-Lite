console.log(`[${process.pid}] Here!`);
setImmediate(async () => {
    await $set(true, process.pid.toString());
    console.log(`[${process.pid}] ${await $get(process.pid.toString())}`);
    await $delete(process.pid.toString());
    await $save();
});