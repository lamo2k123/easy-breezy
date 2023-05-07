import 'i18next';

import ru from '#module/lang/locales/ru.json';

declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'translation',
        returnNull: false,
        resources: {
            translation: typeof ru
        }
    }
}
