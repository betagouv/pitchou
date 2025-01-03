import os from 'node:os'

/**
 * 
 * @param {number} bytesize 
 * @returns 
 */
function toMB(bytesize){
    return (bytesize / 1024 / 1024).toFixed(0)
}

export default function checkMemory(){
    const usage = process.memoryUsage();
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();

    console.log('Total memory\t\t', toMB(totalMemory), 'MB');
    console.log('Free memory\t\t', toMB(freeMemory), 'MB');
    console.log('Memory used by this process right now\t', toMB(usage.rss), 'MB');
}
