import ts from 'typescript';
import type { IGeneratorProps } from '@easy-breezy/core';

import { camelcase } from './../../helpers/camelcase/index.js';

interface IOptions {
    name: string,
    baseUrl: string,
    imports?: Array<string>,
    endpointsAST?: any,
    i18n: IGeneratorProps['i18n']
}

export const createIndex = (options: IOptions) => {
    const imports = []

    if(options.imports?.length) {
        for(const path of options.imports.sort()) {
            imports.push(
                ts.factory.createImportDeclaration(
                    undefined,
                    ts.factory.createImportClause(
                        true,
                        undefined,
                        ts.factory.createNamespaceImport(ts.factory.createIdentifier(camelcase(path)))
                    ),
                    ts.factory.createStringLiteral(`./${path}`),
                    undefined
                )
            );
        }
    }

    const AST = ts.factory.createNodeArray(
        [
            ts.addSyntheticLeadingComment(
                ts.factory.createImportDeclaration(
                    undefined,
                    ts.factory.createImportClause(
                        false,
                        undefined,
                        ts.factory.createNamedImports([
                            ts.factory.createImportSpecifier(
                                false,
                                undefined,
                                ts.factory.createIdentifier("createApi")
                            ),
                            ts.factory.createImportSpecifier(
                                false,
                                undefined,
                                ts.factory.createIdentifier("baseQuery")
                            ),
                            ts.factory.createImportSpecifier(
                                false,
                                undefined,
                                ts.factory.createIdentifier("enhanceEndpoints")
                            )
                        ])
                    ),
                    ts.factory.createStringLiteral("./extension"),
                    undefined
                ),
                ts.SyntaxKind.MultiLineCommentTrivia,
                `\n    ${options.i18n.t('comments.hands-off')}\n`,
                true
            ),
            ...imports,
            ts.factory.createVariableStatement(
                [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
                ts.factory.createVariableDeclarationList(
                    [ts.factory.createVariableDeclaration(
                        ts.factory.createIdentifier("api"),
                        undefined,
                        undefined,
                        ts.factory.createCallExpression(
                            ts.factory.createIdentifier("createApi"),
                            undefined,
                            [ts.factory.createObjectLiteralExpression(
                                [
                                    ts.factory.createPropertyAssignment(
                                        ts.factory.createIdentifier("reducerPath"),
                                        ts.factory.createStringLiteral(`api/${options.name}`)
                                    ),
                                    ts.factory.createPropertyAssignment(
                                        ts.factory.createIdentifier("baseQuery"),
                                        ts.factory.createCallExpression(
                                            ts.factory.createIdentifier("baseQuery"),
                                            undefined,
                                            [ts.factory.createStringLiteral(options.baseUrl)]
                                        )
                                    ),
                                    ts.factory.createPropertyAssignment(
                                        ts.factory.createIdentifier("endpoints"),
                                        ts.factory.createArrowFunction(
                                            undefined,
                                            undefined,
                                            [ts.factory.createParameterDeclaration(
                                                undefined,
                                                undefined,
                                                ts.factory.createIdentifier("build"),
                                                undefined,
                                                undefined,
                                                undefined
                                            )],
                                            undefined,
                                            ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                                            ts.factory.createParenthesizedExpression(ts.factory.createObjectLiteralExpression(
                                                // @ts-ignore
                                                options.endpointsAST.sort((a, b) => a.name.escapedText.localeCompare(b.name.escapedText)),
                                                true
                                            ))
                                        )
                                    )
                                ],
                                true
                            )]
                        )
                    )],
                    ts.NodeFlags.Const
                )
            ),
            ts.factory.createExpressionStatement(ts.factory.createCallExpression(
                ts.factory.createIdentifier("enhanceEndpoints"),
                undefined,
                [ts.factory.createIdentifier("api")]
            )),
            ts.factory.createExportAssignment(
                undefined,
                undefined,
                ts.factory.createIdentifier("api")
            )
        ]
    );

    const sourceFile = ts.createSourceFile('index.ts', '', ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const printer = ts.createPrinter();

    return {
        AST,
        print: printer.printList(
            ts.ListFormat.MultiLine,
            AST,
            sourceFile
        )
    };
};
