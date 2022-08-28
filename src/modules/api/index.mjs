import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { compile } from 'json-schema-to-typescript';
import pascalcase from 'pascalcase';
import camelcase from 'camelcase';

import SwaggerParser from '@apidevtools/swagger-parser';
import enquirer from 'enquirer';
import chalk from 'chalk';
import handlebars from 'handlebars';

import config from './../config/index.mjs';
import output from '../output/index.mjs';
import fileSystem from '../file-system/index.mjs';

class API {
    static __filename = fileURLToPath(import.meta.url);
    static __dirname = dirname(API.__filename);
    static methodColor = {
        get   : chalk.hex('#61affe'),
        post  : chalk.hex('#49cc90'),
        put   : chalk.hex('#fca130'),
        delete: chalk.hex('#f93e3e'),
        head  : chalk.hex('#9012fe'),
        patch : chalk.hex('#50e3c2'),
    };

    #answers = {
        name   : null,
        host   : null,
        baseUrl: null,
        dir    : null
    };

    #context = {
        swagger  : null,
        endpoints: {},
        collector: {}
    };

    get fileIndexPath() {
        return join(process.cwd(), config.data.api.dir, this.#answers.name, 'index.ts');
    }

    get #pathRootDir() {
        return join(process.cwd(), config.data.api.dir, this.#answers.name);
    }

    normalizeJSON(json, cache = []) {
        if(typeof json === 'object' && json !== null) {
            if(json['x-marker']) {
                return ;
            }

            if(json.type === 'object') {
                if(json.additionalProperties === undefined) {
                    json.additionalProperties = false;
                }

                json['x-marker'] = true;
            }

            const keys = Object.keys(json);

            for(const key of keys) {
                if(key === 'title') {
                    delete json[key];
                }

                this.normalizeJSON(json[key], cache);
            }
        }

        return json;
    };

    schemaStringify(payload) {
        const cache = [];

        return JSON.stringify(payload, (key, value) => {
            if(key === 'x-marker') {
                return;
            }

            if(typeof value === 'object' && value !== null) {
                if(cache.includes(value)) {
                    return {
                        type: 'null'
                    };
                }

                cache.push(value);
            }

            return value;
        }, 4);
    }

    async run() {
        if(!config.data.api?.dir) {
            await enquirer.prompt({
                type    : 'input',
                name    : 'dir',
                required: true,
                message : 'Укажите директорию адаптера:',
                default : config.data?.api?.dir || './src/adapters/api',
                result  : (value) => this.#answers.dir = value.toLowerCase()
            });

            config.data.api.dir = this.#answers.dir;
        }

        await enquirer.prompt({
            type    : 'input',
            name    : 'host',
            required: true,
            message : 'Укажите адрес на схему OpenAPI (Пример: https://example.com/openapi.json):',
            result  : (value) => this.#answers.host = value,
            validate: async (value) => {
                if(!value) {
                    return false;
                }

                try {
                    this.#context.swagger = await SwaggerParser.parse(value);
                } catch(error) {
                    output.error('\n\r' + error);

                    return false;
                }

                return true;
            }
        });

        await enquirer.prompt({
            type    : 'input',
            name    : 'name',
            required: true,
            initial : config.data?.api?.alias?.[this.#answers.host],
            result  : (value) => this.#answers.name = value.toLowerCase(),
            message : 'Укажите название API:'
        });

        if(this.#answers.name) {
            if(!config.data.api?.alias) {
                config.data.api.alias = {};
            }

            config.data.api.alias[this.#answers.host] = this.#answers.name;
        }

        if(!config.data.api?.[this.#answers.name]) {
            config.data.api[this.#answers.name] = {};
        }

        if(!config.data.api[this.#answers.name]?.['base-url']) {
            await enquirer
                .prompt({
                    type    : 'input',
                    name    : 'baseUrl',
                    required: true,
                    initial : '/',
                    result  : (value) => this.#answers.baseUrl = value,
                    message : 'Укажите baseUrl API:'
                });

            config.data.api[this.#answers.name]['base-url'] = this.#answers.baseUrl;
        }

        if(this.#context.swagger.paths) {
            this.#context.endpoints = Object
                .keys(this.#context.swagger.paths)
                .reduce((accumulator, endpoint) => {
                    Object
                        .keys(this.#context.swagger.paths[endpoint])
                        .forEach((method) => {
                            accumulator.push({
                                name: `[${API.methodColor[method](method.toUpperCase())}] ${endpoint}`,
                                endpoint,
                                method
                            });
                        });

                    return accumulator;
                }, []);

            const reBaseUrl = new RegExp(`^${config.data.api[this.#answers.name]['base-url']}`, 'gm');

            const { endpoints } = await enquirer.prompt({
                type      : 'autocomplete',
                name      : 'endpoints',
                message   : 'Выберите необходимые энпоинты (поиск по строке):',
                multiple  : true,
                limit     : 10,
                initial   : Object.keys(config.data.api?.[this.#answers.name]?.endpoints || {}).reduce((accumulator, endpointName) => {
                    config.data.api[this.#answers.name].endpoints[endpointName].forEach((endpointMethod) => {
                        accumulator.push(`${endpointName}||${endpointMethod}`)
                    });

                    return accumulator;
                }, []),
                choices: this.#context.endpoints.map((item) => ({
                    name   : `${join('/', item.endpoint.replace(reBaseUrl, ''))}||${item.method}`,
                    message: item.name
                }))
            });

            if(!config.data.api[this.#answers.name]?.endpoints) {
                config.data.api[this.#answers.name].endpoints = {};
            }

            endpoints.reduce((accumulator, item) => {
                const [name, endpointMethod] = item.split('||');
                const endpointName = join('/', name.replace(reBaseUrl, ''));

                if(!accumulator[endpointName]) {
                    accumulator[endpointName] = [];
                }

                if(!accumulator[endpointName].includes(endpointMethod)) {
                    accumulator[endpointName].push(endpointMethod);
                }

                return accumulator;
            }, config.data.api[this.#answers.name].endpoints);

            this.#context.swagger = await SwaggerParser.dereference(this.#context.swagger, {
                circular: false
            });

            this.#context.collector = Object
                .keys(config.data.api[this.#answers.name].endpoints)
                .reduce((accumulator, endpointName) => {
                    config.data.api[this.#answers.name].endpoints[endpointName].forEach((endpointMethod) => {
                        let endpoint;

                        try {
                            endpoint = this.#context.swagger.paths[join(config.data.api[this.#answers.name]['base-url'], endpointName)][endpointMethod];
                        } catch(error) {
                            endpoint = this.#context.swagger.paths[endpointName][endpointMethod];
                        }

                        Object
                            .keys(endpoint.responses)
                            .forEach((key) => {
                                if(!accumulator[endpointName]) {
                                    accumulator[endpointName] = {};
                                }

                                if(!accumulator[endpointName][endpointMethod]) {
                                    accumulator[endpointName][endpointMethod] = {};
                                }

                                if(this.#context.swagger.swagger?.startsWith('2')) {
                                    if(endpoint.responses[key]?.schema) {
                                        accumulator[endpointName][endpointMethod][key] = endpoint.responses[key].schema;
                                    }
                                } else {
                                    if(endpoint.responses[key]?.content?.['application/json']?.schema) {
                                        accumulator[endpointName][endpointMethod][key] = endpoint.responses[key].content['application/json'].schema;
                                    }
                                }
                            });

                        if(endpoint.parameters) {
                            const inPath = endpoint.parameters.filter((item) => item.in === 'path');
                            const inQuery = endpoint.parameters.filter((item) => item.in === 'query');

                            if(inPath.length) {
                                accumulator[endpointName][endpointMethod]['path-parameters'] = inPath.reduce((accumulator, current) => {
                                    if(current.required) {
                                        accumulator.required.push(current.name);
                                    }

                                    if(this.#context.swagger.swagger?.startsWith('2')) {
                                        accumulator.properties[current.name] = {
                                            type: current.type
                                        };
                                    } else {
                                        accumulator.properties[current.name] = current.schema;
                                    }

                                    return accumulator;
                                }, {
                                    properties: {},
                                    required  : [],
                                    type      : 'object'
                                });
                            }

                            if(inQuery.length) {
                                accumulator[endpointName][endpointMethod]['query-parameters'] = inQuery.reduce((accumulator, current) => {
                                    if(current.required) {
                                        accumulator.required.push(current.name);
                                    }

                                    if(this.#context.swagger.swagger?.startsWith('2')) {
                                        accumulator.properties[current.name] = {
                                            type: current.type
                                        };
                                    } else {
                                        accumulator.properties[current.name] = current.schema;
                                    }

                                    return accumulator;
                                }, {
                                    properties: {},
                                    required  : [],
                                    type      : 'object'
                                });
                            }

                            if(this.#context.swagger.swagger?.startsWith('2')) {
                                const inBody = endpoint.parameters.filter((item) => item.in === 'body');

                                if(inBody.length) {
                                    accumulator[endpointName][endpointMethod]['body-parameters'] = inBody[0].schema;
                                }

                                const inFormData = endpoint.parameters.filter((item) => item.in === 'formData');

                                if(inFormData.length) {
                                    accumulator[endpointName][endpointMethod]['body-parameters'] = {
                                        properties: {},
                                        required  : [],
                                        type      : 'object'
                                    };

                                    accumulator[endpointName][endpointMethod]['form-data-parameters'] = inFormData.reduce((accumulator, current) => {
                                        if(current.required) {
                                            accumulator.required.push(current.name);
                                        }

                                        accumulator.properties[current.name] = current.schema;

                                        return accumulator;
                                    }, {
                                        properties: {},
                                        required  : [],
                                        type      : 'object'
                                    });
                                }
                            }
                        }

                        if(!this.#context.swagger.swagger?.startsWith('2') && endpoint?.requestBody?.content?.['application/json']?.schema) {
                            const schema = endpoint.requestBody?.content?.['application/json']?.schema;

                            if(schema) {
                                accumulator[endpointName][endpointMethod]['body-parameters'] = schema;
                            }
                        }
                    });

                    return accumulator;
                }, {});

            this.normalizeJSON(this.#context.collector);

            const imports = [];
            const endpointsInject = [];

            const templateEndpointPath = join(API.__dirname, 'templates/endpoint.hbs');
            const templateEndpointFile = readFileSync(templateEndpointPath, { encoding: 'utf8' });
            const templateEndpoint = handlebars.compile(templateEndpointFile);

            for(const path in this.#context.collector) {
                for(const method in this.#context.collector[path]) {
                    const types = [];

                    for(const key in this.#context.collector[path][method]) {
                        const prefix = this.#context.collector[path][method][key].type === 'object' ? 'i' : 't';
                        const schemaString = this.schemaStringify(this.#context.collector[path][method][key]);

                        types.push(
                            await compile(JSON.parse(schemaString), Number(key) ? `${prefix}-code-${key}` : `${prefix}-${key}`, {
                                bannerComment         : '',
                                unreachableDefinitions: true,
                                strictIndexSignatures : true,
                                style                 : {
                                    printWidth : Infinity,
                                    singleQuote: true,
                                    tabWidth   : 4
                                }
                            })
                        );

                        const pathFile = join(config.data.api.dir, this.#answers.name, path, method, `${key}.json`);

                        fileSystem.createOrUpdate(pathFile, schemaString);
                    }

                    const Code200Prefix = this.#context.collector[path][method]['200']?.type === 'object' ? 'I' : 'T';
                    const Code201Prefix = this.#context.collector[path][method]['201']?.type === 'object' ? 'I' : 'T';
                    const templateTypesPath = join(API.__dirname, 'templates/types.hbs');
                    const templateTypesFile = readFileSync(templateTypesPath, { encoding: 'utf8' });
                    const templateTypes = handlebars.compile(templateTypesFile);
                    const queryKeys = Object.keys(this.#context.collector[path][method]['query-parameters']?.properties || []);
                    const bodyKeys = Object.keys(this.#context.collector[path][method]['body-parameters']?.properties || []);
                    const typeParameters = ['path', 'query', 'body'].filter((item) => this.#context.collector[path][method][`${item}-parameters`]).map((name) => pascalcase(`i-${name}-parameters`)).join(' & ');

                    const fileInjectPath = join(config.data.api.dir, this.#answers.name, path, method, `index.ts`);

                    const importPath = relative(this.#pathRootDir, dirname(fileInjectPath)).replace(/(\/|\\)+/g, '/');
                    const importName = camelcase(importPath.replace(/{([a-z_-]+)\}/g, '$1').replace(/(\/|\\)+/g, '-'));

                    imports.push({
                        path: importPath,
                        name: importName
                    });

                    const notRequiredParameters = !['path', 'query', 'body', 'form-data'].filter((item) => !!this.#context.collector[path][method][`${item}-parameters`]?.required?.length).length;

                    endpointsInject.push(templateEndpoint({
                        nameFunction         : camelcase(join(path.replace(/\{([a-z_-]+)\}/g, '$1'), method).replace(reBaseUrl, '').replace(/(\/|\\)+/g, '-')),
                        builder              : ['PATCH', 'PUT', 'POST', 'DELETE'].includes(method.toUpperCase()) ? 'mutation' : 'query',
                        typeResponse         : !!this.#context.collector[path][method]['200'] ? `${importName}.${Code200Prefix}Code200` : this.#context.collector[path][method]['201'] ? `${importName}.${Code201Prefix}Code201` : 'void',
                        isParameters         : !!typeParameters,
                        notRequiredParameters: notRequiredParameters,
                        method               : method.toUpperCase(),
                        endpoint             : join('/', path.replace(config.data.api[this.#answers.name]['base-url'], '')).replace(/(\/|\\)+/g, '/').replace(/\{([a-z_-]+)\}/gi, '${params.path' + (this.#context.collector[path][method]['path-parameters']?.required?.length ? '' : '?') +'.$1}'),
                        paramsPayload        : !queryKeys.length ? 'undefined' : '{' + queryKeys.reduce((acc, key) => {
                            acc += `${key}: params${notRequiredParameters ? '?' : ''}.query${this.#context.collector[path][method]['query-parameters'].required.length ? '' : '?'}.${key},`;

                            return acc;
                        }, '') + '}',
                        bodyPayload : this.#context.collector[path][method]['form-data-parameters'] ? `params.body` : !this.#context.collector[path][method]['body-parameters'] ? 'undefined' : this.#context.collector[path][method]['body-parameters'].type === 'object' ? !bodyKeys.length ? 'undefined' : '{' + bodyKeys.reduce((acc, key) => {
                            acc += `${key}: params${notRequiredParameters ? '?' : ''}.body${this.#context.collector[path][method]['body-parameters']?.required?.length ? '' : '?'}.${key},`;

                            return acc;
                        }, '') + '}' : `params${notRequiredParameters ? '?' : ''}.body`,
                        importName
                    }));

                    const fileTypes = templateTypes({
                        types              : types.join('\n'),
                        isParameters       : !!typeParameters,
                        typePathParameters : this.#context.collector[path][method]['path-parameters'] ? `path${this.#context.collector[path][method]['path-parameters'].required?.length ? '' : '?'}: ${this.#context.collector[path][method]['path-parameters'].type === 'object' ? 'I' : 'T'}PathParameters,` : '',
                        typeQueryParameters: this.#context.collector[path][method]['query-parameters'] ? `query${this.#context.collector[path][method]['query-parameters'].required?.length ? '' : '?'}: ${this.#context.collector[path][method]['query-parameters'].type === 'object' ? 'I' : 'T'}QueryParameters,` : '',
                        typeBodyParameters : this.#context.collector[path][method]['body-parameters'] ? `body${this.#context.collector[path][method]['body-parameters'].required?.length ? '' : '?'}: ${this.#context.collector[path][method]['body-parameters'].type === 'object' ? 'I' : 'T'}BodyParameters,` : ''
                    });

                    fileSystem.createOrUpdate(fileInjectPath, fileTypes, {
                        signature: true
                    });
                }
            }

            const templatePath = join(API.__dirname, 'templates/index.hbs');
            const templateFile = readFileSync(templatePath, { encoding: 'utf8' });
            const file = handlebars
                .compile(templateFile)({
                    reducerPath: this.#answers.name,
                    baseUrl    : config.data.api[this.#answers.name]['base-url'],
                    endpoints  : endpointsInject,
                    imports
                })
                .toString();

            fileSystem.createOrUpdate(this.fileIndexPath, file, {
                signature: true
            });

            const templateBaseArgsPath = join(API.__dirname, 'templates/extension.hbs');
            const templateBaseArgsFile = readFileSync(templateBaseArgsPath, { encoding: 'utf8' });
            const baseArgsFile = handlebars.compile(templateBaseArgsFile)().toString();

            fileSystem.createFile(join(this.#pathRootDir, 'extension.ts'), baseArgsFile);
        }

        try {
            const { ESLint } = await import('eslint');
            const eslint = new ESLint({ fix: true });
            const results = await eslint.lintFiles([join(config.data.api.dir, '**/*.ts')]);

            await ESLint.outputFixes(results);
            output.info('Форматирование по стайл гайду');
        } catch(error) {
            console.log(error)
        }
    }
}

export default new API();
