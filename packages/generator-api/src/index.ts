import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

import { cloneNode } from 'ts-clone-node';
import ts from 'typescript';
import _get from 'lodash.get';
import _setWith from 'lodash.setwith';
import enquirer from 'enquirer';
import { compile } from 'json-schema-to-typescript';
import type { IGeneratorProps } from '@easy-breezy/core';
import { deepSortObject } from '@easy-breezy/core/helpers/deep-sort-object';
import { OpenAPI, OpenAPIV2, OpenAPIV3 } from 'openapi-types';
import camelcase from 'camelcase';

import { Swagger } from './swagger.js'
import { createEndpoint } from './ast/create-endpoint/index.js';
import { createExtension } from './ast/create-extension/index.js';
import { createIndex } from './ast/create-index/index.js';
import { createTypes } from './ast/create-types/index.js';

import ru from './locales/ru.json' assert { type: "json" };
import en from './locales/en.json' assert { type: "json" };

type TMethodV2 = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';
type TMethod = TMethodV2 | 'trace';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default ({ i18n, config, fs, output, colors }: IGeneratorProps) => {
    i18n.addResource('ru', ru);
    i18n.addResource('en', en);

    return {
        message: i18n.t('message'),
        run    : async () => {
            class API {

                static colors = {
                    get    : '#61affe',
                    post   : '#49cc90',
                    put    : '#fca130',
                    delete : '#f93e3e',
                    head   : '#9012fe',
                    patch  : '#50e3c2',
                    options: '#aaa',
                    trace  : '#aaa'
                };

                private openAPI!: OpenAPI.Document;

                private openAPIParse?: Promise<OpenAPI.Document>;

                private swagger = new Swagger();

                private answers = {
                    dir      : config.get('dir', ''),
                    name     : '',
                    host     : '',
                    baseUrl  : '',
                    endpoints: [] as Array<string>
                };

                private normalizeJSON = (json: any, cache = []) => {
                    if(typeof json === 'object' && json !== null) {
                        if(json['x-marker']) {
                            return ;
                        }

                        if(json.type === 'object') {
                            if(json.additionalProperties === undefined) {
                                json.additionalProperties = json.properties ? !Object.keys(json.properties).length : true;
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

                private path = (...paths: Array<string>) => {
                    return join(...paths).replace(/(\/|\\)+/g, '/');
                }

                private schemaStringify = (payload: any) => {
                    const cache: Array<any> = [];

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

                private schemaSave = (path: string, payload: object) => {
                    if(payload) {
                        fs.updateFile(path, this.schemaStringify(deepSortObject(payload)), true);
                    }
                }

                private schemaToType = async (filename: string, payload: object) => {
                    const schema = JSON.parse(this.schemaStringify(deepSortObject(payload)));
                    const result = await compile(schema, filename, {
                        bannerComment         : '',
                        unreachableDefinitions: true,
                        strictIndexSignatures : true,
                        style                 : {
                            printWidth : Infinity,
                            singleQuote: true,
                            tabWidth   : 4
                        }
                    });

                    return result;
                }

                private question = {
                    dir: async () => {
                        if(!this.answers.dir) {
                            const { dir } = await enquirer.prompt<{ dir: string }>({
                                type    : 'input',
                                name    : 'dir',
                                required: true,
                                message : i18n.t('question.dir'),
                                initial : './src/adapters/api'
                            });

                            config.set('dir', dir);

                            this.answers.dir = dir;
                        }
                    },
                    host: async () => {
                        const choices = Object
                            .entries(config.get('alias', {}))
                            .map(([path, alias]) => ({
                                name   : path,
                                message: `(${alias}) ${path}`,
                                value  : path
                            }));

                        const { host } = await enquirer.prompt<{ host: string }>({
                            type    : 'autocomplete',
                            name    : 'host',
                            required: true,
                            message : i18n.t('question.host'),
                            choices,
                            // @ts-ignore
                            suggest : (value: string) => {
                                const result = choices.filter((choice) => {
                                    return choice.name.includes(value) || choice.message.includes(value) || choice.value.includes(value);
                                });

                                return result.concat({
                                    name: value,
                                    message: value,
                                    value: value
                                });
                            },
                            // @ts-ignore
                            validate: async (value) => {
                                if(!value) {
                                    return i18n.t('validation.required');
                                }

                                try {
                                    if(!this.swagger.inParse) {
                                        output.success(i18n.t('output.loading-host', { host: value }));

                                        await this.swagger.parse(value);
                                    } else {
                                        return i18n.t('output.loading-host', { host: value });
                                    }
                                } catch (error) {
                                    const { message } = error as Error;

                                    return message;
                                }

                                return true;
                            }
                        });

                        this.answers.host = host;

                    },
                    alias: async () => {
                        if(this.answers.host) {
                            const { name } = await enquirer.prompt<{ name: string }>({
                                type    : 'input',
                                name    : 'name',
                                required: true,
                                initial : config.get(['alias', this.answers.host]),
                                message : i18n.t('question.name')
                            });

                            this.answers.name = name;

                            config.set(['alias', this.answers.host], name);
                        }
                    },
                    baseUrl: async () => {
                        this.answers.baseUrl = config.get(`options.${this.answers.name}.base-url`, '');

                        if(!this.answers.baseUrl) {
                            const { baseUrl } = await enquirer.prompt<{ baseUrl: string }>({
                                type    : 'input',
                                name    : 'baseUrl',
                                required: true,
                                initial : this.swagger.basePath,
                                message : i18n.t('question.base-url')
                            });

                            this.answers.baseUrl = baseUrl;

                            config.set(`options.${this.answers.name}.base-url`, baseUrl);
                        }
                    },
                    endpoints: async () => {
                        if(this.swagger.getPathsKeys()) {
                            const RE_BASE_URL = new RegExp(`^${config.get(`options.${this.answers.name}.base-url`)}`, 'gm');

                            const choices = this.swagger.getPathsKeys().reduce<Array<Record<'name' | 'message', string>>>((accumulator, key) => {
                                const methods = this.swagger.getPathMethodsKeys(key);

                                for(const method of methods) {
                                    accumulator.push({
                                        name   : `${this.path('/', key.replace(RE_BASE_URL, ''))}||${method}`,
                                        message: `[${colors.hex(method.toUpperCase(), API.colors[method as TMethod])}] ${key}`
                                    });
                                }

                                return accumulator;
                            }, []);

                            const initial = Object
                                .keys(config.get(`options.${this.answers.name}.endpoints`, {}))
                                .reduce<Array<string>>((accumulator, name) => {
                                    const endpoint = config.get(`options.${this.answers.name}.endpoints.${name}`);

                                    if(endpoint) {
                                        endpoint.forEach((method: string) => {
                                            accumulator.push(`${name}||${method}`)
                                        });
                                    }

                                    return accumulator;
                                }, []);

                            const { endpoints } = await enquirer.prompt<{ endpoints: Array<string> }>({
                                type      : 'autocomplete',
                                name      : 'endpoints',
                                message   : i18n.t('question.endpoints'),
                                // @ts-ignore
                                multiple  : true,
                                limit     : 10,
                                initial   : initial.filter((value) => choices.find((choice) => choice.name === value)),
                                choices
                            });

                            this.answers.endpoints = endpoints;

                            const configEndpoints = config.get(`options.${this.answers.name}.endpoints`, {}) as Record<string, Array<OpenAPIV3.HttpMethods | OpenAPIV2.HttpMethods>>;

                            const cleanEndpoints: Record<string, Array<OpenAPIV3.HttpMethods | OpenAPIV2.HttpMethods>> = {};

                            for(const key in configEndpoints) {
                                const path = this.path(this.answers.baseUrl, key);

                                if(!this.swagger.hasPathByKey(path)) {
                                    cleanEndpoints[key] = configEndpoints[key];
                                } else {
                                    cleanEndpoints[key] = [];

                                    for(const method of configEndpoints[key]) {
                                        if(!this.swagger.hasPathMethodByKey(path, method)) {
                                            cleanEndpoints[key].push(method);
                                        }
                                    }

                                    if(!cleanEndpoints[key].length) {
                                        delete cleanEndpoints[key];
                                    }
                                }
                            }

                            config.set(`options.${this.answers.name}.endpoints`, cleanEndpoints);

                            for(const item of endpoints) {
                                const [name, endpointMethod] = item.split('||');
                                const endpointName = this.path('/', name.replace(RE_BASE_URL, ''));
                                const endpoint = config.get(`options.${this.answers.name}.endpoints.${endpointName}`, [] as Array<string>);

                                if(!endpoint.includes(endpointMethod)) {
                                    endpoint.push(endpointMethod);
                                }

                                config.set(`options.${this.answers.name}.endpoints.${endpointName}`, endpoint);
                            }
                        }
                    }
                }

                private camelcase = (value: string) => {
                    const result = value
                        .replace(/\{([a-z_-]+)\}/gi, '$1')
                        .replace(/(\/|\\)+/g, '-');

                    return camelcase(result);
                }

                public run = async () => {
                    await this.question.dir();
                    await this.question.host();
                    await this.question.alias();
                    await this.question.baseUrl();
                    await this.question.endpoints();

                    const endpoints = config.get(`options.${this.answers.name}.endpoints`, {});
                    const needSaveEndpoints: Array<string> = [];

                    const collector = Object
                        .keys(endpoints)
                        .reduce((accumulator, endpointName) => {
                            const methods = _get(endpoints, endpointName, []) as Array<OpenAPIV3.HttpMethods | OpenAPIV2.HttpMethods>;
                            const endpointKey = this.path(this.answers.baseUrl, endpointName);

                            for(const method of methods) {
                                if(this.swagger.hasPathMethodByKey(endpointKey, method)) {
                                    const responses = this.swagger.getMethodResponsesSchemas(endpointKey, method);
                                    const parameters = this.swagger.getMethodParametersSchemas(endpointKey, method);

                                    _setWith(accumulator, `${endpointName}.${method}`, parameters, Object);
                                    _setWith(accumulator, `${endpointName}.${method}.responses`, responses, Object);
                                } else {
                                    needSaveEndpoints.push(this.path(endpointName, method))
                                }
                            }

                            return accumulator;
                        }, {} as Record<string, any>);

                    this.normalizeJSON(collector);

                    const pathAPI = this.path(this.answers.dir, this.answers.name);

                    const imports = [];
                    const endpointsAST = [];

                    for(const path in collector) {
                        for(const method in collector[path]) {
                            const types = [];

                            for(const key in collector[path][method]) {
                                const dir = config.get('dir');

                                // Save schema
                                if(dir && this.answers.name) {
                                    if(key !== 'responses') {
                                        this.schemaSave(join(dir, this.answers.name, path, method, `${key}.json`), collector[path][method][key]);
                                    } else {
                                        for(const HTTPCode of Object.keys(collector[path][method][key])) {
                                            this.schemaSave(join(dir, this.answers.name, path, method, `${HTTPCode}.json`), collector[path][method][key][HTTPCode]);
                                        }
                                    }
                                }

                                // Generate TS types
                                if(key === 'responses') {
                                    for(const HTTPCode of Object.keys(collector[path][method][key])) {
                                        const prefix = collector[path][method][key][HTTPCode].type === 'object' ? 'i' : 't';

                                        types.push(await this.schemaToType(`${prefix}-code-${HTTPCode}`, collector[path][method][key][HTTPCode]));
                                    }
                                } else {
                                    const filename = [collector[path][method][key].type === 'object' ? 'i' : 't', 'parameters', key];

                                    if(this.swagger.hasFormDataMethod(this.path(this.answers.baseUrl, path), method as OpenAPIV3.HttpMethods) && key === 'body') {
                                        filename.push('form-data')
                                    }

                                    types.push(await this.schemaToType(filename.join('-'), collector[path][method][key]));
                                }
                            }

                            const pathEndpoint = this.path(this.answers.dir, this.answers.name, path, method, 'index.ts');
                            const pathRelative = relative(pathAPI, dirname(pathEndpoint));

                            imports.push(pathRelative);

                            fs.updateFile(
                                pathEndpoint,
                                createTypes({
                                    i18n,
                                    types,
                                    hasFormData: this.swagger.hasFormDataMethod(this.path(this.answers.baseUrl, path), method as OpenAPIV3.HttpMethods),
                                    schemas   : {
                                        path     : collector[path][method].path,
                                        body     : collector[path][method].body,
                                        query    : collector[path][method].query,
                                        responses: Object.keys(collector[path][method].responses).reduce((accumulator, key) => {
                                            if(key.startsWith('2')) {
                                                accumulator[key] = collector[path][method].responses[key];
                                            }

                                            return accumulator;
                                        }, {} as Record<PropertyKey, OpenAPIV3.SchemaObject>)
                                    }
                                }).print,
                                true
                            );

                            endpointsAST.push(
                                createEndpoint({
                                    name       : this.camelcase(this.path(path, method)),
                                    hasFormData: this.swagger.hasFormDataMethod(this.path(this.answers.baseUrl, path), method as OpenAPIV3.HttpMethods),
                                    url        : path,
                                    importName : this.camelcase(pathRelative),
                                    method     : method as OpenAPIV3.HttpMethods,
                                    schemas    : {
                                        path    : collector[path][method].path,
                                        body    : collector[path][method].body,
                                        query   : collector[path][method].query,
                                        header  : collector[path][method].header,
                                        response: collector[path][method].responses['200'] || collector[path][method].responses['201'],
                                        cookie  : collector[path][method].cookie
                                    }
                                }).AST
                            )
                        }
                    }

                    if(fs.exists(this.path(pathAPI, 'index.ts'))) {
                        const sourceFile = ts.createSourceFile('index.ts', fs.readFile(this.path(pathAPI, 'index.ts')), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

                        const find = (node: ts.Node) => {
                            if(node.kind === ts.SyntaxKind.PropertyAssignment) {
                                const { name } = node as ts.PropertyAssignment;
                                const match = needSaveEndpoints.find((value) => this.camelcase(value) === name.getText());

                                if(match) {
                                    endpointsAST.push(cloneNode(node));
                                    imports.push(relative(pathAPI, this.path(this.answers.dir, this.answers.name, match)));

                                    return;
                                }
                            }

                            node.forEachChild(find);
                        }

                        sourceFile.forEachChild(find);
                    }

                    fs.updateFile(
                        this.path(pathAPI, 'index.ts'),
                        createIndex({
                            i18n,
                            name   : this.answers.name,
                            baseUrl: this.answers.baseUrl,
                            endpointsAST,
                            imports
                        }).print,
                        true
                    );

                    fs.createFile(
                        this.path(pathAPI, 'extension.ts'),
                        createExtension({ i18n }).print
                    );
                }
            }

            await new API().run();
        }
    };
};
