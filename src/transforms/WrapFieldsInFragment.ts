import {
  GraphQLSchema,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  parse,
  print,
  InlineFragmentNode,
  Kind,
  SelectionSetNode
} from 'graphql';

import { Request, Transform } from '../Interfaces';

export class WrapFieldsInFragment implements Transform {
  private targetSchema: GraphQLSchema;
  private parentType: string;
  private targetType: string;
  constructor(
    targetSchema: GraphQLSchema,
    parentType: string,
    targetType: string,
  ) {
    this.targetSchema = targetSchema;
    this.parentType = parentType;
    this.targetType = targetType;
  }

  public transformRequest(originalRequest: Request) {
    const typeInfo = new TypeInfo(this.targetSchema);
    const document = visit(
      originalRequest.document,
      visitWithTypeInfo(typeInfo, {
        // tslint:disable-next-line function-name
        [Kind.SELECTION_SET]: (
          node: SelectionSetNode,
        ): SelectionSetNode | null | undefined => {
          const parentType = typeInfo.getParentType();
          let selections = node.selections;

          if (parentType && parentType.name === this.parentType) {
            const fragment = parse(
              `fragment ${this.targetType}Fragment on ${
                this.targetType
                } ${print(node)}`,
            );
            let inlineFragment: InlineFragmentNode;
            for (const definition of fragment.definitions) {
              if (definition.kind === Kind.FRAGMENT_DEFINITION) {
                inlineFragment = {
                  kind: Kind.INLINE_FRAGMENT,
                  typeCondition: definition.typeCondition,
                  selectionSet: definition.selectionSet,
                };
              }
            }
            selections = selections.concat(inlineFragment);
          }

          if (selections !== node.selections) {
            return {
              ...node,
              selections,
            };
          }
        },
      }),
    );
    return { ...originalRequest, document };
  }
}
