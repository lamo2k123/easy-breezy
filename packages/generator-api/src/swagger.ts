import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPIV3, OpenAPIV2, OpenAPI } from 'openapi-types';
import mergeAllOf from 'json-schema-merge-allof';

export class Swagger {

    private payload?: OpenAPI.Document;

    public inParse = false;

    public parse = async (url: string) => {
        this.inParse = true;

        try {
            const payload = await SwaggerParser.parse(url);

            this.payload = await SwaggerParser.dereference(payload, {
                dereference: {
                    circular: true
                }
            });

            this.inParse = false;
        } catch(error) {
            this.inParse = false;

            throw error;
        }
    }

    public get basePath() {
        if(this.payload) {
            // https://swagger.io/specification/v2/#swagger-object
            if('swagger' in this.payload) {
                return this.payload.basePath || '/';
            }
        }

        return '/';
    }

    public getPaths() {
        return this.payload?.paths || {}
    }

    public getPathsKeys() {
        const keys = Object.keys(this.getPaths());

        return keys.filter((key) => !key.startsWith('x-'));
    }

    public getPathByKey(path: string) {
        let key = path;

        if(this.basePath !== '/') {
            key = key.replace(this.basePath, '');
        }

        return this.getPaths()[key] || {};
    }

    public hasPathByKey(key: string) {
        return !!this.getPathByKey(key);
    }

    public hasPathMethodByKey(key: string, methodKey: OpenAPIV3.HttpMethods | OpenAPIV2.HttpMethods) {
        if(this.hasPathByKey(key)) {
            const path = this.getPathByKey(key);

            // @ts-ignore
            return !!path[methodKey];
        }

        return false;
    }

    public getPathMethodsKeys(key: string, ) {
        const keys = Object.keys(this.getPaths()[key] || {}) as Array<keyof OpenAPIV3.PathItemObject | keyof OpenAPIV2.PathItemObject>;

        return keys.filter((key) => {
            return !['$ref', 'summary', 'description', 'servers', 'parameters'].includes(key) && !key.startsWith('x-');
        }) as Array<OpenAPIV3.HttpMethods | OpenAPIV2.HttpMethods>;
    }

    public getMethod(path: string, method: OpenAPIV3.HttpMethods | OpenAPIV2.HttpMethods) {
        // @ts-ignore
        return this.getPathByKey(path)[method] as OpenAPIV3.OperationObject | OpenAPIV2.OperationObject;
    }

    public getMethodResponsesSchemas(path: string, method: OpenAPIV3.HttpMethods | OpenAPIV2.HttpMethods) {
        const result = this.getMethod(path, method);
        const keys = Object.keys(result.responses).filter((key) => key !== 'default' && !key.startsWith('x-'));

        return keys.reduce((accumulator, key) => {
            const response = result.responses[key] as OpenAPIV3.ResponseObject | OpenAPIV2.ResponseObject;

            if('content' in response) {
                if(response.content?.['application/json']?.schema) {
                    accumulator[key] = response.content['application/json'].schema as OpenAPIV3.SchemaObject;
                }
            } else if('schema' in response) {
                accumulator[key] = response.schema as OpenAPIV2.SchemaObject;
            }

            return accumulator;
        }, {} as Record<PropertyKey, OpenAPIV3.SchemaObject | OpenAPIV2.SchemaObject>);
    }

    public getMethodParametersSchemas(path: string, method: OpenAPIV3.HttpMethods | OpenAPIV2.HttpMethods, rewrite: Record<string, Record<string, OpenAPIV3.ParameterObject>> = {}) {
        const endpoint = this.getMethod(path, method);
        const global = this.getPathByKey(path).parameters || [];
        const parameters = [...global, ...(endpoint.parameters || [])]

        const result = parameters.reduce((accumulator, parameter) => {
            if('in' in parameter) {
                const key = parameter.in === 'formData' ? 'body' : parameter.in;

                if(rewrite[key]) {
                    if(rewrite[key][parameter.name]) {
                        Object.assign(parameter, rewrite[key][parameter.name]);
                    }
                }

                if(!accumulator[key]) {
                    accumulator[key] = {
                        properties: {},
                        required  : [],
                        type      : 'object'
                    };
                }

                if(parameter.required) {
                    // @ts-ignore
                    accumulator[key].required.push(parameter.name);
                }

                if(parameter.schema && parameter.in === 'body') {
                    if(parameter.required && parameter.schema.type !== 'object') {
                        parameter.schema.required = true;
                    }

                    accumulator[key] = parameter.schema;
                } else if(parameter.schema) {
                    // @ts-ignore
                    accumulator[key].properties[parameter.name] = parameter.schema;
                } else if('type' in parameter) {
                    const schema: any = {
                        type: parameter.type
                    };

                    if(parameter.type === 'array' && parameter.items) {
                        schema.items = parameter.items;

                        if(parameter.collectionFormat) {
                            schema.collectionFormat = parameter.collectionFormat;
                        }
                    }

                    // @ts-ignore
                    accumulator[key].properties[parameter.name] = schema;
                }
            }

            return accumulator;
        }, {} as Record<PropertyKey, OpenAPIV3.SchemaObject>);

        if(result.path?.type === 'object') {
            for(const key in result.path.properties) {
                const properties = result.path.properties[key];
                if(properties && 'type' in properties && (properties.type === 'number' || properties.type === 'integer')) {
                    if(properties.format) {
                        properties.description = `Source type: ${properties.type}/${properties.format}`;

                        delete properties.format;
                    }

                    properties.type = 'string';

                    result.path.properties[key] = properties;
                }
            }
        }

        if(result.header?.type === 'object') {
            for(const key in result.header.properties) {
                const properties = result.header.properties[key];
                if(properties && 'type' in properties && (properties.type === 'number' || properties.type === 'integer')) {
                    if(properties.format) {
                        properties.description = `Source type: ${properties.type}/${properties.format}`;

                        delete properties.format;
                    }

                    properties.type = 'string';

                    result.header.properties[key] = properties;
                }
            }
        }

        if(result.query?.type === 'object') {
            for(const key in result.query.properties) {
                const properties = result.query.properties[key];
                if(properties && 'type' in properties && (properties.type === 'number' || properties.type === 'integer')) {
                    if(properties.format) {
                        properties.description = `Source type: ${properties.type}/${properties.format}`;

                        delete properties.format;
                    }

                    result.query.properties[key] = {
                        description: properties.description,
                        oneOf: [{
                            type: 'number'
                        }, {
                            type: 'string'
                        }]
                    };
                }
            }
        }

        if('requestBody' in endpoint && endpoint.requestBody) {
            if('content' in endpoint.requestBody) {
                let schema = endpoint.requestBody.content['application/json']?.schema || endpoint.requestBody.content['multipart/form-data']?.schema;

                if(schema) {
                    if('allOf' in schema) {
                        // @ts-ignore
                        schema = mergeAllOf(schema);
                    }

                    if(schema && 'type' in schema) {
                        result.body = schema;
                    }
                }
            }
        }

        return result;
    }

    public hasFormDataMethod(path: string, method: OpenAPIV3.HttpMethods | OpenAPIV2.HttpMethods): boolean {
        const endpoint = this.getMethod(path, method);
        const global = this.getPathByKey(path).parameters || [];

        if('requestBody' in endpoint && endpoint.requestBody) {
            return !!('content' in endpoint.requestBody && endpoint.requestBody.content['multipart/form-data']);
        }

        if(global) {
            const index = global.findIndex((parameter) => {
                return 'in' in parameter && parameter.in === 'formData';
            });

            if(index !== -1) {
                return true;
            }
        }

        if(endpoint.parameters) {
            const index = endpoint.parameters.findIndex((parameter) => {
                return 'in' in parameter && parameter.in === 'formData';
            });

            if(index !== -1) {
                return true;
            }
        }

        return false;
    }
}
