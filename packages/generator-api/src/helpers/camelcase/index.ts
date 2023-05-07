import camelcaseSource, { Options } from 'camelcase';

export const camelcase = (value: string, options?: Options) => {
    const result = value
        .replace(/\{([a-z_-]+)\}/gi, '$1')
        .replace(/(\/|\\)+/g, '-');

    return camelcaseSource(result, options);
};
