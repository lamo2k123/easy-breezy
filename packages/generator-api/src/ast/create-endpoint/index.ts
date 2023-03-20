import ts, {
    KeywordTypeNode,
    ParameterDeclaration,
    PropertyAssignment,
    StringLiteral,
    TemplateExpression,
    TemplateMiddle,
    TemplateTail,
    TypeReferenceNode
} from 'typescript';
import { OpenAPIV3 } from 'openapi-types';

interface IOptions {
    name: string,
    url: string,
    importName: string,
    method: OpenAPIV3.HttpMethods,
    schemas: {
        [key in 'response' | 'path' | 'body' | 'query' | 'header' | 'cookie']?: OpenAPIV3.SchemaObject
    }
}

const MAP = {
    'body': 'body',
    'query': 'params',
    'header': 'headers'
};

export const createEndpoint = (options: IOptions) => {
    let build = 'query';
    let parameters: KeywordTypeNode | TypeReferenceNode = ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
    let args: Array<ParameterDeclaration> = [];
    let url: TemplateExpression | StringLiteral = ts.factory.createStringLiteral(options.url);
    let returnObject: Array<PropertyAssignment> = [
        ts.factory.createPropertyAssignment(
            ts.factory.createIdentifier('method'),
            ts.factory.createStringLiteral(options.method)
        )
    ];

    if(['put', 'post', 'delete', 'patch'].includes(options.method)) {
        build = 'mutation';
    }

    if(options.schemas.body || options.schemas.query || options.schemas.path || options.schemas.header || options.schemas.cookie) {
        parameters = ts.factory.createTypeReferenceNode(
            ts.factory.createQualifiedName(
                ts.factory.createIdentifier(options.importName),
                ts.factory.createIdentifier('IParameters')
            ),
            undefined
        );

        args.push(
            ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                ts.factory.createIdentifier('params'),
                undefined,
                undefined,
                undefined
            )
        );
    }

    const urls = options.url.split(/(\{[a-z_-]+\})/gi);

    if(options.schemas.path && urls.length > 1) {
        url = ts.factory.createTemplateExpression(
            ts.factory.createTemplateHead(
                urls[0],
                urls[0]
            ),
            urls.reduce((accumulator, path, index) => {
                if(index) {
                    const nextIndex = index + 1;
                    let tail: TemplateTail | TemplateMiddle = ts.factory.createTemplateTail(
                        urls[nextIndex] ? urls[nextIndex] : "",
                        urls[nextIndex] ? urls[nextIndex] : "",
                    );

                    if(urls[nextIndex] && nextIndex < urls.length - 1 && !/\{[a-z_-]+\}/i.test(urls[nextIndex])) {
                        tail = ts.factory.createTemplateMiddle(
                            urls[nextIndex],
                            urls[nextIndex]
                        );
                    }

                    if(/\{[a-z_-]+\}/i.test(path)) {
                        accumulator.push(
                            ts.factory.createTemplateSpan(
                                ts.factory.createPropertyAccessExpression(
                                    ts.factory.createPropertyAccessExpression(
                                        ts.factory.createIdentifier('params'),
                                        ts.factory.createIdentifier('path')
                                    ),
                                    ts.factory.createIdentifier(path.replace(/(\{|\})/gi, ''))
                                ),
                                tail
                            )
                        )
                    }
                }

                return accumulator
            }, [] as Array<any>)
        )
    }

    returnObject.push(
        ts.factory.createPropertyAssignment(
            ts.factory.createIdentifier('url'),
            url
        )
    );

    const schemasKeys = Object.keys(options.schemas).filter((key) => key !== 'cookie' && key !== 'response' && key !== 'path') as Array<'body' | 'query' | 'header'>;

    for(const schemaKey of schemasKeys) {
        if(options.schemas[schemaKey]) {
            const keys = Object.keys(options.schemas[schemaKey]?.properties || {});

            if(keys.length) {
                returnObject.push(
                    ts.factory.createPropertyAssignment(
                        ts.factory.createIdentifier(MAP[schemaKey]),
                        ts.factory.createObjectLiteralExpression(
                            keys.map((key) => {
                                let access = ts.factory.createPropertyAccessExpression(
                                    ts.factory.createPropertyAccessExpression(
                                        ts.factory.createIdentifier('params'),
                                        ts.factory.createIdentifier(schemaKey)
                                    ),
                                    ts.factory.createIdentifier(key)
                                );

                                if(!options.schemas.query?.required?.includes(key)) {
                                    access = ts.factory.createPropertyAccessChain(
                                        ts.factory.createPropertyAccessExpression(
                                            ts.factory.createIdentifier('params'),
                                            ts.factory.createIdentifier(schemaKey)
                                        ),
                                        ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
                                        ts.factory.createIdentifier(key)
                                    );
                                }

                                return ts.factory.createPropertyAssignment(
                                    ts.factory.createIdentifier(key),
                                    access
                                )
                            }),
                            true
                        )
                    )
                );
            }
        }
    }

    const AST = ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier(options.name),
        ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
                ts.factory.createIdentifier('build'),
                ts.factory.createIdentifier(build)
            ),
            [
                ts.factory.createTypeReferenceNode(
                    ts.factory.createQualifiedName(
                        ts.factory.createIdentifier(options.importName),
                        ts.factory.createIdentifier('TResponse')
                    ),
                    undefined
                ),
                parameters
            ],
            [
                ts.factory.createObjectLiteralExpression(
                    [
                        ts.factory.createPropertyAssignment(
                            ts.factory.createIdentifier('query'),
                            ts.factory.createArrowFunction(
                                undefined,
                                undefined,
                                args,
                                undefined,
                                ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                                ts.factory.createParenthesizedExpression(
                                    ts.factory.createObjectLiteralExpression(
                                        returnObject,
                                        true
                                    ))
                            )
                        )],
                    true
                )]
        )
    );

    const sourceFile = ts.createSourceFile('extension.ts', '', ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const printer = ts.createPrinter();

    return {
        AST,
        print: printer.printNode(
            ts.EmitHint.Unspecified,
            AST,
            sourceFile
        )
    };
};
