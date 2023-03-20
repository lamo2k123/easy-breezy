import type { TFunction } from 'i18next';

import args, { Args } from './../args/index.js';
import i18n from './../i18n/index.js';
import config from './../config/index.js';
import fs, { FS } from './../fs/index.js';
import colors, { Colors } from './../colors/index.js';
import output, { Output } from './../output/index.js';

export interface IPluginProps {
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
    fs: FS,
    args: Args
}

class Plugin {

    public run = async () => {
        const plugins = config.get('plugins');

        if(plugins) {
            const keys = Object.keys(plugins);

            if(keys.length) {
                for(const key of keys) {
                    const { default: module } = await import(`@easy-breezy/plugin-${key}`);

                    try {
                        await module({
                            i18n: {
                                addResource: (lang: string, payload: object) => i18n.addResource(lang, key, payload),
                                t          : i18n.bindT(key)
                            },
                            config: {
                                get: config.bindGet(`plugins.${key}`),
                                set: config.bindSet(`plugins.${key}`)
                            },
                            output: output.bind(`plugins.${key}`),
                            colors,
                            fs,
                            args
                        });
                    } catch(error) {
                        output.error(`[plugin-${key}]: ${error}`);
                    }
                }
            }
        }
    }
}

export default new Plugin();
