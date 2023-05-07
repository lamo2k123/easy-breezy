import { readdirSync } from 'fs';
import { join } from 'path';

import enquirer from 'enquirer';
import _get from 'lodash.get';
import _set from 'lodash.setwith';

import args from './../args/index.js';
import colors from './../colors/index.js';
import output from './../output/index.js';
import i18n from './../i18n/index.js';
import fs from './../fs/index.js';
import { deepSortObject } from './../../helpers/deep-sort-object/index.js';

// @ts-ignore
const { default: { version } } = await import('./../../../package.json', {
    assert: {
        type: "json",
    },
});

interface IData {
    language?: string,
    version?: string
}

class Config {

    static path = join(process.cwd(), args.opts.config);

    private snapshot = '';

    private data: IData = {};

    constructor() {
        this.load(true);
    }

    private load = (silentMode = false) => {
        if(fs.exists(Config.path)) {
            const config = fs.readFile(Config.path);

            try {
                const data = JSON.parse(config);

                this.snapshot = JSON.stringify(deepSortObject(data));
                this.data = Object.assign(data, this.data);
            } catch(error) {
                if(!silentMode) {
                    output.error(i18n.t('core.config.load.error'))
                }
            }
        }
    }

    private create = async () => {
        const { create } = await enquirer.prompt<{ create: boolean }>([{
            type   : 'confirm',
            name   : 'create',
            initial: true,
            message: i18n.t('core.config.question.create', {
                path: process.cwd(),
            })
        }])

        if(!create) {
            process.exit(0);
        }

        fs.createFile(Config.path, JSON.stringify(this.data, null, 4));

        this.load();
    }

    public bindGet = (ns?: string) => {
        return (key: string | Array<string>, defaultValue?: any) => {
            let result = key;

            if(ns) {
                if(Array.isArray(key)) {
                    key.unshift(...ns.split('.'));
                } else {
                    if(result) {
                        result = `${ns}.${result}`;
                    } else {
                        result = ns;
                    }
                }
            }

            return _get(this.data, result, defaultValue)
        }
    }

    public bindSet = (ns?: string) => {
        return (key: string | Array<string>, value: any, customizer: any = Object) => {
            let result = key;

            if(ns) {
                if(Array.isArray(key)) {
                    key.unshift(...ns.split('.'));
                } else {
                    result = `${ns}.${result}`;
                }
            }

            _set(this.data, result, value, customizer);
        }
    }

    public get = this.bindGet();

    public set = this.bindSet();

    public save = async () => {
        if(this.snapshot !== JSON.stringify(deepSortObject(this.data))) {
            const { save } = await enquirer.prompt<{ save: boolean }>([{
                type   : 'confirm',
                name   : 'save',
                initial: true,
                message: i18n.t('core.config.question.save')
            }]);

            if(save) {
                fs.updateFile(Config.path, JSON.stringify(this.data, null, 4))
            }
        }
    }

    public run = async () => {
        if(!fs.exists(Config.path)) {
            await this.create();
        }

        if(version !== this.data.version) {
            this.data.version = version;
        }

        const path = join(process.cwd(), 'node_modules/@easy-breezy');

        if(fs.exists(path)) {
            const dirs = readdirSync(path);

            for(const type of ['generator', 'plugin']) {
                const data = {
                    found    : dirs.filter((dir) => dir.startsWith(`${type}-`)),
                    installed: this.get(`${type}s`, {})
                };

                for(const nameFull of data.found) {
                    const nameShort = nameFull.replace(`${type}-`, '');

                    if(data.installed[nameFull] === undefined && data.installed[nameShort] === undefined) {
                        const { use } = await enquirer.prompt<{ use: boolean }>([{
                            type   : 'confirm',
                            name   : 'use',
                            initial: true,
                            message: i18n.t(`core.config.found.${type}`, {
                                name: colors.paint(nameFull, 'green')
                            })
                        }]);

                        this.set(`${type}s.${nameShort}`, use ? {} : false);
                    }
                }
            }
        }
    }
}

export default new Config();
