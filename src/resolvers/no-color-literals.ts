import BaseResolver from './base-resolver';

import { createNode, Node, parse } from 'gonzales-pe-sl';
import { SlRule } from 'sass-lint';

const fs = require('fs');
const path = require('path');

export default class NoColorLiterals extends BaseResolver {
  private _colorVariableName = {} as { [colorCode: string]: string };
  private _variableFilePath: string;
  private _variableFileContent: string;

  constructor(ast: Node, parser: SlRule) {
    super(ast, parser);

    this._variableFilePath = path.resolve(
      __dirname,
      '../../../../src/components/variables.sass',
    );
    this._variableFileContent = fs.readFileSync(
      this._variableFilePath,
      'utf-8',
    );
    this._colorVariableName = {};

    parse(this._variableFileContent, {
      syntax: ast.syntax,
    }).traverseByType('declaration', (declaration: Node) => {
      let variable;
      let value;
      declaration.traverseByType('variable', (variableNode: Node) => {
        variable = variableNode.first()?.toString();
      });

      declaration.traverseByType('value', (valueNode) => {
        if (valueNode.first()?.type === 'color') {
          value = valueNode.toString();
        }
      });

      if (variable && value) {
        this._colorVariableName[value] = variable;
      }
    });
  }

  public fix() {
    this.ast.traverseByType('declaration', (declaration: Node) => {
      declaration.traverseByType('value', (valueNode: Node) => {
        const colorCode = valueNode.toString();
        const colorVariableName = this._colorVariableName[colorCode];
        if (!colorVariableName) {
          return;
        }
        valueNode.content = this.createVariableNode(colorVariableName);
      });
    });

    return this.ast;
  }

  private createVariableNode(content: string) {
    return [
      createNode({
        type: 'variable',
        syntax: this.ast.syntax,
        content: [
          createNode({
            type: 'ident',
            content,
            syntax: this.ast.syntax,
          }),
        ],
      }),
    ];
  }
}
