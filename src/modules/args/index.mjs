import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
    .option('config', {
        alias      : 'c',
        type       : 'string',
        description: 'Файл конфигураций'
    })
    .help();

class Args {

    constructor() {
        return argv.parseSync();
    }
}

export default new Args();
