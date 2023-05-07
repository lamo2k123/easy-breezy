import { isPlainObject } from '#helper/is-plain-object';

const comparator = (a: string, b: string) => {
    return a.localeCompare(b);
}

export const deepSortObject = (src: Record<PropertyKey, any>): Object => {
    if(Array.isArray(src)) {
        return src.map((item) => deepSortObject(item));
    }

    if(isPlainObject(src)) {
        const result: Record<string, any> = {};

        Object
            .keys(src)
            .sort(comparator)
            .forEach((key) => {
                result[key] = deepSortObject(src[key]);
            });

        return result;
    }

    return src;
}