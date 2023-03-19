import ts, { KeywordTypeNode, PropertySignature, UnionTypeNode } from 'typescript';
import { OpenAPIV3 } from 'openapi-types';
import type { IGeneratorProps } from '@easy-breezy/core';

import { camelcase } from './../../helpers/camelcase/index.js';

interface IOptions {
    i18n: IGeneratorProps['i18n'],
    types?: string | Array<string>,
    hasFormData?: boolean,
    schemas: {
        path?: OpenAPIV3.SchemaObject,
        body?: OpenAPIV3.SchemaObject,
        query?: OpenAPIV3.SchemaObject,
        header?: OpenAPIV3.SchemaObject,
        responses?: Record<string, OpenAPIV3.SchemaObject>
    }
}

export const createTypes = (options: IOptions) => {
    const types = Array.isArray(options.types) ? options.types : [options.types]
    const parameters: Array<PropertySignature> = [];
    const elements = [];
    let response: UnionTypeNode | KeywordTypeNode = ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);

    const parametersKeys = Object.keys(options.schemas).filter((key) => key !== 'responses') as Array<keyof Omit<IOptions['schemas'], 'responses'>>;

    if(parametersKeys.length) {
        for(const parameterKey of parametersKeys) {
            const schema = options.schemas[parameterKey];

            if(schema) {
                parameters.push(
                    ts.factory.createPropertySignature(
                        undefined,
                        ts.factory.createIdentifier(parameterKey),
                        schema.required?.length ? undefined : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                        ts.factory.createTypeReferenceNode(
                            ts.factory.createIdentifier(camelcase(`${schema.type === 'object' ? 'I' : 'T'}-Parameters-${parameterKey}`, { pascalCase: true })),
                            undefined
                        )
                    )
                );
            }
        }
    }

    if(options.hasFormData) {
        elements.push(
            ts.factory.createInterfaceDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                ts.factory.createIdentifier("IParametersBody"),
                undefined,
                [ts.factory.createHeritageClause(
                    ts.SyntaxKind.ExtendsKeyword,
                    [ts.factory.createExpressionWithTypeArguments(
                        ts.factory.createIdentifier("FormData"),
                        undefined
                    )]
                )],
                [
                    ts.factory.createMethodSignature(
                        undefined,
                        ts.factory.createIdentifier("append"),
                        undefined,
                        undefined,
                        [
                            ts.factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                ts.factory.createIdentifier("name"),
                                undefined,
                                ts.factory.createTypeOperatorNode(
                                    ts.SyntaxKind.KeyOfKeyword,
                                    ts.factory.createTypeReferenceNode(
                                        ts.factory.createIdentifier("IParametersBodyFormData"),
                                        undefined
                                    )
                                ),
                                undefined
                            ),
                            ts.factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                ts.factory.createIdentifier("value"),
                                undefined,
                                ts.factory.createUnionTypeNode([
                                    ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                                    ts.factory.createTypeReferenceNode(
                                        ts.factory.createIdentifier("Blob"),
                                        undefined
                                    )
                                ]),
                                undefined
                            ),
                            ts.factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                ts.factory.createIdentifier("fileName"),
                                ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                                ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                                undefined
                            )
                        ],
                        ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)
                    ),
                    ts.factory.createMethodSignature(
                        undefined,
                        ts.factory.createIdentifier("delete"),
                        undefined,
                        undefined,
                        [ts.factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            ts.factory.createIdentifier("name"),
                            undefined,
                            ts.factory.createTypeOperatorNode(
                                ts.SyntaxKind.KeyOfKeyword,
                                ts.factory.createTypeReferenceNode(
                                    ts.factory.createIdentifier("IParametersBodyFormData"),
                                    undefined
                                )
                            ),
                            undefined
                        )],
                        ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)
                    ),
                    ts.factory.createMethodSignature(
                        undefined,
                        ts.factory.createIdentifier("get"),
                        undefined,
                        undefined,
                        [ts.factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            ts.factory.createIdentifier("name"),
                            undefined,
                            ts.factory.createTypeOperatorNode(
                                ts.SyntaxKind.KeyOfKeyword,
                                ts.factory.createTypeReferenceNode(
                                    ts.factory.createIdentifier("IParametersBodyFormData"),
                                    undefined
                                )
                            ),
                            undefined
                        )],
                        ts.factory.createUnionTypeNode([
                            ts.factory.createTypeReferenceNode(
                                ts.factory.createIdentifier("FormDataEntryValue"),
                                undefined
                            ),
                            ts.factory.createLiteralTypeNode(ts.factory.createNull())
                        ])
                    ),
                    ts.factory.createMethodSignature(
                        undefined,
                        ts.factory.createIdentifier("getAll"),
                        undefined,
                        undefined,
                        [ts.factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            ts.factory.createIdentifier("name"),
                            undefined,
                            ts.factory.createTypeOperatorNode(
                                ts.SyntaxKind.KeyOfKeyword,
                                ts.factory.createTypeReferenceNode(
                                    ts.factory.createIdentifier("IParametersBodyFormData"),
                                    undefined
                                )
                            ),
                            undefined
                        )],
                        ts.factory.createArrayTypeNode(ts.factory.createTypeReferenceNode(
                            ts.factory.createIdentifier("FormDataEntryValue"),
                            undefined
                        ))
                    ),
                    ts.factory.createMethodSignature(
                        undefined,
                        ts.factory.createIdentifier("has"),
                        undefined,
                        undefined,
                        [ts.factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            ts.factory.createIdentifier("name"),
                            undefined,
                            ts.factory.createTypeOperatorNode(
                                ts.SyntaxKind.KeyOfKeyword,
                                ts.factory.createTypeReferenceNode(
                                    ts.factory.createIdentifier("IParametersBodyFormData"),
                                    undefined
                                )
                            ),
                            undefined
                        )],
                        ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
                    ),
                    ts.factory.createMethodSignature(
                        undefined,
                        ts.factory.createIdentifier("set"),
                        undefined,
                        undefined,
                        [
                            ts.factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                ts.factory.createIdentifier("name"),
                                undefined,
                                ts.factory.createTypeOperatorNode(
                                    ts.SyntaxKind.KeyOfKeyword,
                                    ts.factory.createTypeReferenceNode(
                                        ts.factory.createIdentifier("IParametersBodyFormData"),
                                        undefined
                                    )
                                ),
                                undefined
                            ),
                            ts.factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                ts.factory.createIdentifier("value"),
                                undefined,
                                ts.factory.createUnionTypeNode([
                                    ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                                    ts.factory.createTypeReferenceNode(
                                        ts.factory.createIdentifier("Blob"),
                                        undefined
                                    )
                                ]),
                                undefined
                            ),
                            ts.factory.createParameterDeclaration(
                                undefined,
                                undefined,
                                ts.factory.createIdentifier("fileName"),
                                ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                                ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                                undefined
                            )
                        ],
                        ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)
                    )
                ]
            )
        );
    }

    if(parameters.length) {
        elements.push(
            ts.factory.createInterfaceDeclaration(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                ts.factory.createIdentifier("IParameters"),
                undefined,
                undefined,
                parameters
            )
        );
    }

    if(options.schemas.responses) {
        const keys = Object.keys(options.schemas.responses);

        if(keys.length) {
            response = ts.factory.createUnionTypeNode(keys
                .filter((key) => options.schemas.responses?.[key])
                .map((key) => {
                    const schema = options.schemas.responses?.[key] as OpenAPIV3.SchemaObject;

                    return ts.factory.createTypeReferenceNode(
                        ts.factory.createIdentifier(camelcase(`${schema.type === 'object' ? 'I' : 'T'}-Code-${key}`, { pascalCase: true })),
                        undefined
                    );
                })
            );
        }
    }

    elements.push(
        ts.factory.createTypeAliasDeclaration(
            [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
            ts.factory.createIdentifier("TResponse"),
            undefined,
            response
        )
    );

    const AST = ts.factory.createNodeArray(elements);

    const sourceFile = ts.createSourceFile('index.ts', '', ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const printer = ts.createPrinter();

    return {
        AST,
        print: `/*
    ${options.i18n.t('comments.hands-off')}
*/
${types.join('\n')}
${printer.printList(
    ts.ListFormat.MultiLine,
    AST,
    sourceFile
)}
`
    };
};
