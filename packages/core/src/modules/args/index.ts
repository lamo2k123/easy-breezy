import { Command } from 'commander';

// @ts-ignore
const { default: { version } } = await import('./../../../package.json', {
    assert: {
        type: "json",
    },
});

interface IArgs {
    lang?: string,
    config: string,
    generator?: string
}

export class Args {

    private program = new Command();

    constructor() {
        this.program
            .name('easy-breezy')
            .description('CLI to generation code')
            .version(version)
            .option('-l, --lang <lang>', 'Language')
            .option('-c, --config <path>', 'Configuration file', './.easy-breezy/config.json')
            .option('-g, --generator <name>', 'Selecting a generator to run')
            .parse(process.argv)
            .opts();
    }

    public opts = this.program.opts<IArgs>();
}

export default new Args();
