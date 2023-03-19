import i18next from 'i18next';
import enquirer from 'enquirer';

import args from './../args/index.js';
import config from './../config/index.js';

import ru from './locales/ru.json' assert { type: "json" };
import en from './locales/en.json' assert { type: "json" };

class I18n {

    constructor() {
        i18next
            .init({
                fallbackLng: 'ru',
                returnNull: false,
                resources: {
                    ru: {
                        translation: ru
                    },
                    en: {
                        translation: en
                    }
                }
            });
    }

    public bindT = (ns?: string) => {
        // @ts-ignore
        return i18next.getFixedT(args.opts.lang || config.get('language') || Intl.DateTimeFormat().resolvedOptions().locale, ns);
    }

    public get t() {
        return this.bindT();
    }

    public addResource = (lang: string, ns: string, payload: object) => {
        // @ts-ignore
        i18next.addResourceBundle(lang, ns, payload, true, true);
    };

    public run = async () => {
        if(!config.get('language')) {
            const { language } = await enquirer.prompt<{ language: string }>({
                type   : 'select',
                name   : 'language',
                message: this.t('core.i18n.question'),
                initial: 0,
                choices: [{
                    name   : 'ru',
                    message: this.t('core.i18n.answers.ru')
                }, {
                    name   : 'en',
                    message: this.t('core.i18n.answers.en')
                }]
            });

            config.set('language', language);
        }
    }
}

export default new I18n();
