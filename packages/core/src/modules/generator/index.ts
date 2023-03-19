import type { TFunction } from 'i18next';
import enquirer from 'enquirer';

import args from './../args/index.js';
import i18n from './../i18n/index.js';
import config from './../config/index.js';
import fs, { FS } from './../fs/index.js';
import colors, { Colors } from './../colors/index.js';
import output, { Output } from './../output/index.js';

export interface IGeneratorProps {
    i18n: {
        addResource(lang: string, payload: object): void,
        t: TFunction
    },
    config: {
        get(key?: string | Array<string>, defaultValue?: any): any,
        set(key: string | Array<string>, value: any, customizer?: any): void
    },
    colors: Colors,
    output: Output,
    fs: FS
}

interface IGenerator {
    message: string,
    run(): Promise<void>
}

class Generator {

    private name = args.opts.generator;

    private generators: Record<string, IGenerator> = {};

    public run = async () => {
        if(!this.name) {
            const generators = config.get('generators');

            if(generators) {
                const keys = Object.keys(generators);

                if(keys.length) {
                    const choices = [];

                    for(const key of keys) {
                        const { default: module } = await import(`@easy-breezy/generator-${key}`);
                        const generator = this.generators[key] = module({
                            i18n: {
                                addResource: (lang: string, payload: object) => i18n.addResource(lang, key, payload),
                                t          : i18n.bindT(key)
                            },
                            config: {
                                get: config.bindGet(`generators.${key}`),
                                set: config.bindSet(`generators.${key}`)
                            },
                            output,
                            colors,
                            fs
                        });

                        choices.push({
                            name   : key,
                            message: generator.message
                        });
                    }

                    const { generator } = await enquirer.prompt<{ generator: string }>({
                        type   : 'select',
                        name   : 'generator',
                        message: i18n.t('generator.question.generator'),
                        choices
                    });

                    this.name = generator;
                }
            }
        }

        if(this.name) {
            await this.generators[this.name].run();
        }
    }
}

export default new Generator();
