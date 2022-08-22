import { join, dirname } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

import enquirer from 'enquirer';

import output from './../output/index.mjs';
import args from './../args/index.mjs';

class Config {

    path = join(process.cwd(), args.config || './.easy-breezy/config.json');

    exists = false;

    data = {
        api: {}
    };

    dataLoadSnapshot = '';

    constructor() {
        this.load();
    }

    load() {
        this.exists = existsSync(this.path);

        if(this.exists) {
            const config = readFileSync(this.path, {
                encoding: 'utf8'
            });

            try {
                this.data = JSON.parse(config);
                this.dataLoadSnapshot = JSON.stringify(this.data);
            } catch(error) {
                this.exists = false;

                output.error('При парсинге конфига произошла ошибка!')
            }
        }
    }

    async create() {
        const { create } = await enquirer.prompt([{
            type   : 'confirm',
            name   : 'create',
            initial: true,
            message: `Инициализировать GENA в директории: ${process.cwd()}`
        }])

        if(!create) {
            process.exit(0);
        }

        mkdirSync(dirname(this.path), {
            recursive: true
        });
        writeFileSync(this.path, JSON.stringify(this.data, null, 4), {
            encoding: 'utf8'
        });

        output.info(`++ ${this.path}`)

        this.load();
    }

    async save() {
        if(this.dataLoadSnapshot !== JSON.stringify(this.data)) {
            const { save } = await enquirer.prompt([{
                type   : 'confirm',
                name   : 'save',
                initial: true,
                message: 'Сохранить изменения конфигурации?'
            }]);

            if(save) {
                writeFileSync(this.path, JSON.stringify(this.data, null, 4), {
                    encoding: 'utf8'
                });

                output.info('Конфигурация обновлена.')
            }
        }
    }
}

export default new Config();
