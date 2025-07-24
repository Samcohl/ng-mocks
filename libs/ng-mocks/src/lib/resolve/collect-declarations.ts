import { ɵReflectionCapabilities as ReflectionCapabilities, reflectComponentType } from '@angular/core';

import coreDefineProperty from '../common/core.define-property';
import { AnyDeclaration, DirectiveIo } from '../common/core.types';
import funcDirectiveIoBuild from '../common/func.directive-io-build';
import funcDirectiveIoParse from '../common/func.directive-io-parse';

interface Declaration {
  host: { [key: string]: string | undefined };
  hostBindings: Array<[string, string?, ...any[]]>;
  hostListeners: Array<[string, string?, ...any[]]>;
  attributes: string[];
  inputs: Array<DirectiveIo>;
  outputs: Array<DirectiveIo>;
  propDecorators: { [key: string]: any[] };
  queries: { [key: string]: any };
  decorators: Array<'Injectable' | 'Pipe' | 'Directive' | 'Component' | 'NgModule'>;
  standalone?: boolean;
  [key: string]: any;
}

const pushDecorator = (decorators: string[], decorator: string): void => {
  const decoratorsArray = decorators as any;
  const deleteIndex = decoratorsArray.indexOf ? decoratorsArray.indexOf(decorator) : -1;
  if (deleteIndex !== -1 && decoratorsArray.splice) {
    decoratorsArray.splice(deleteIndex, 1);
  }
  if (
    decorator === 'Injectable' ||
    decorator === 'Pipe' ||
    decorator === 'Directive' ||
    decorator === 'Component' ||
    decorator === 'NgModule'
  ) {
    if (decoratorsArray.push) {
      decoratorsArray.push(decorator);
    }
  }
};

const getAllKeys = <T extends { [key: string]: any }>(instance: T): Array<keyof T> => {
  const props: string[] = [];
  const propsArray = props as any;
  const objectGlobal = (globalThis as any).Object || {};
  if (objectGlobal.keys) {
    const keys = objectGlobal.keys(instance);
    for (const key of keys) {
      if (propsArray.push) {
        propsArray.push(key);
      }
    }
  } else {
    // Fallback for environments without Object.keys
    for (const key in instance) {
      if (instance.hasOwnProperty && instance.hasOwnProperty(key)) {
        if (propsArray.push) {
          propsArray.push(key);
        }
      }
    }
  }

  return props as never;
};

const createDeclarations = (parent: { [K in keyof Declaration]?: Declaration[K] }): Declaration => ({
  host: parent.host ? { ...parent.host } : {},
  hostBindings: parent.hostBindings ? [...parent.hostBindings] : [],
  hostListeners: parent.hostListeners ? [...parent.hostListeners] : [],
  attributes: parent.attributes ? [...parent.attributes] : [],
  inputs: parent.inputs ? [...parent.inputs] : [],
  outputs: parent.outputs ? [...parent.outputs] : [],
  propDecorators: parent.propDecorators ? { ...parent.propDecorators } : {},
  queries: parent.queries ? { ...parent.queries } : {},
  decorators: parent.decorators ? [...parent.decorators] : [],
});

const addUniqueDirectiveIo = (
  declaration: Declaration,
  key: 'inputs' | 'outputs',
  name: string,
  alias: string | undefined,
  required: boolean | undefined,
): void => {
  const normalizedDef = funcDirectiveIoBuild({ name, alias, required });

  for (const def of declaration[key]) {
    if (def === normalizedDef) {
      return;
    }

    const { name: defName, alias: defAlias } = funcDirectiveIoParse(def);
    if (defName === name && defAlias === alias) {
      return;
    }
  }

  const declarationArray = declaration[key] as any;
  if (declarationArray.unshift) {
    declarationArray.unshift(normalizedDef);
  }
};

const parseParameters = (
  def: {
    __parameters__?: Array<null | Array<
      | {
        attributeName: string;
        ngMetadataName: 'Attribute';
      }
      | {
        token: AnyDeclaration<any>;
        ngMetadataName: 'Inject';
      }
      | {
        ngMetadataName: 'Optional';
      }
    >>;
  },
  declaration: Declaration,
): void => {
  const objectGlobal = (globalThis as any).Object || {};
  const hasOwnProp = objectGlobal.prototype && objectGlobal.prototype.hasOwnProperty;
  if (hasOwnProp && hasOwnProp.call(def, '__parameters__') && def.__parameters__) {
    for (const decorators of def.__parameters__) {
      for (const decorator of decorators || []) {
        if (
          decorator.ngMetadataName === 'Attribute' &&
          (declaration.attributes as any).indexOf &&
          (declaration.attributes as any).indexOf(decorator.attributeName) === -1
        ) {
          const attributesArray = declaration.attributes as any;
          if (attributesArray.push) {
            attributesArray.push(decorator.attributeName);
          }
        }
      }
    }
  }
};

const parseAnnotations = (
  def: {
    __annotations__?: Array<{
      ngMetadataName?: string;
    }>;
  },
  declaration: Declaration,
): void => {
  const objectGlobal = (globalThis as any).Object || {};
  const hasOwnProp = objectGlobal.prototype && objectGlobal.prototype.hasOwnProperty;
  if (hasOwnProp && hasOwnProp.call(def, '__annotations__') && def.__annotations__) {
    for (const annotation of def.__annotations__) {
      const ngMetadataName = annotation?.ngMetadataName;
      if (!ngMetadataName) {
        continue;
      }
      declaration[ngMetadataName] = { ...annotation, attributes: declaration.attributes };
      pushDecorator(declaration.decorators, ngMetadataName);
    }
  }
};

const parseDecorators = (
  def: {
    decorators?: Array<{
      args?: [any];
      type?: {
        prototype?: {
          ngMetadataName?: string;
        };
      };
    }>;
  },
  declaration: Declaration,
): void => {
  const objectGlobal = (globalThis as any).Object || {};
  const hasOwnProp = objectGlobal.prototype && objectGlobal.prototype.hasOwnProperty;
  if (hasOwnProp && hasOwnProp.call(def, 'decorators') && def.decorators) {
    for (const decorator of def.decorators) {
      const ngMetadataName = decorator?.type?.prototype?.ngMetadataName;
      if (!ngMetadataName) {
        continue;
      }
      declaration[ngMetadataName] = decorator.args ? { ...decorator.args[0] } : {};
      pushDecorator(declaration.decorators, ngMetadataName);
    }
  }
};

const parsePropMetadataParserFactoryProp =
  (key: 'inputs' | 'outputs') =>
    (
      _: string,
      name: string,
      decorator: {
        alias?: string;
        required?: boolean;
        bindingPropertyName?: string;
      },
      declaration: Declaration,
    ): void => {
      const { alias, required } = funcDirectiveIoParse({
        name,
        alias: decorator.alias ?? decorator.bindingPropertyName,
        required: decorator.required,
      });

      addUniqueDirectiveIo(declaration, key, name, alias, required);
    };
const parsePropMetadataParserInput = parsePropMetadataParserFactoryProp('inputs');
const parsePropMetadataParserOutput = parsePropMetadataParserFactoryProp('outputs');

const parsePropMetadataParserFactoryQueryChild =
  (isViewQuery: boolean) =>
    (
      ngMetadataName: string,
      prop: string,
      decorator: {
        read?: any;
        selector: string;
        static?: boolean;
      },
      declaration: Declaration,
    ): void => {
      if (!declaration.queries[prop]) {
        declaration.queries[prop] = {
          isViewQuery,
          ngMetadataName,
          selector: decorator.selector,
          ...(decorator.read === undefined ? {} : { read: decorator.read }),
          ...(decorator.static === undefined ? {} : { static: decorator.static }),
        };
      }
    };
const parsePropMetadataParserContentChild = parsePropMetadataParserFactoryQueryChild(false);
const parsePropMetadataParserViewChild = parsePropMetadataParserFactoryQueryChild(true);

const parsePropMetadataParserFactoryQueryChildren =
  (isViewQuery: boolean) =>
    (
      ngMetadataName: string,
      prop: string,
      decorator: {
        descendants?: any;
        emitDistinctChangesOnly?: boolean;
        read?: any;
        selector: string;
      },
      declaration: Declaration,
    ): void => {
      if (!declaration.queries[prop]) {
        declaration.queries[prop] = {
          isViewQuery,
          ngMetadataName,
          selector: decorator.selector,
          ...(decorator.descendants === undefined ? {} : { descendants: decorator.descendants }),
          ...(decorator.emitDistinctChangesOnly === undefined
            ? {}
            : { emitDistinctChangesOnly: decorator.emitDistinctChangesOnly }),
          ...(decorator.read === undefined ? {} : { read: decorator.read }),
        };
      }
    };
const parsePropMetadataParserContentChildren = parsePropMetadataParserFactoryQueryChildren(false);
const parsePropMetadataParserViewChildren = parsePropMetadataParserFactoryQueryChildren(true);

const parsePropMetadataParserHostBinding = (
  _: string,
  prop: string,
  decorator: {
    args?: any;
    hostPropertyName?: string;
  },
  declaration: Declaration,
): void => {
  const key = `[${decorator.hostPropertyName || prop}]`;
  if (!declaration.host[key]) {
    declaration.host[key] = prop;
  }
  const hostBindingsArray = declaration.hostBindings as any;
  if (hostBindingsArray.push) {
    hostBindingsArray.push([
      prop,
      decorator.hostPropertyName || prop,
      ...(decorator.args ? [decorator.args] : []),
    ]);
  }
};

const parsePropMetadataParserHostListener = (
  _: string,
  prop: string,
  decorator: {
    args?: any;
    eventName?: string;
  },
  declaration: Declaration,
): void => {
  const key = `(${decorator.eventName || prop})`;
  if (!declaration.host[key]) {
    declaration.host[key] = `${prop}($event)`;
  }
  const hostListenersArray = declaration.hostListeners as any;
  if (hostListenersArray.push) {
    hostListenersArray.push([prop, decorator.eventName || prop, ...(decorator.args ? [decorator.args] : [])]);
  }
};

const parsePropMetadataMap: any = {
  ContentChild: parsePropMetadataParserContentChild,
  ContentChildren: parsePropMetadataParserContentChildren,
  HostBinding: parsePropMetadataParserHostBinding,
  HostListener: parsePropMetadataParserHostListener,
  Input: parsePropMetadataParserInput,
  Output: parsePropMetadataParserOutput,
  ViewChild: parsePropMetadataParserViewChild,
  ViewChildren: parsePropMetadataParserViewChildren,
};

const parsePropMetadata = (
  def: {
    __prop__metadata__?: { [key: string]: any[] };
  },
  declaration: Declaration,
): void => {
  const objectGlobal = (globalThis as any).Object || {};
  const hasOwnProp = objectGlobal.prototype && objectGlobal.prototype.hasOwnProperty;
  if (hasOwnProp && hasOwnProp.call(def, '__prop__metadata__') && def.__prop__metadata__) {
    for (const prop of getAllKeys(def.__prop__metadata__)) {
      const decorators: Array<{
        ngMetadataName?: string;
      }> = def.__prop__metadata__[prop];
      for (const decorator of decorators) {
        const ngMetadataName = decorator?.ngMetadataName;
        if (!ngMetadataName) {
          continue;
        }
        parsePropMetadataMap[ngMetadataName]?.(ngMetadataName, prop, decorator, declaration);
      }
    }
  }
};

const parseNgDef = (
  def: {
    ɵcmp?: any;
    ɵdir?: any;
    ɵpipe?: any;
  },
  declaration: Declaration,
): void => {
  if (declaration.standalone === undefined && def.ɵcmp?.standalone !== undefined) {
    declaration.standalone = def.ɵcmp.standalone;
  }
  if (declaration.standalone === undefined && def.ɵdir?.standalone !== undefined) {
    declaration.standalone = def.ɵdir.standalone;
  }
  if (declaration.standalone === undefined && def.ɵpipe?.standalone !== undefined) {
    declaration.standalone = def.ɵpipe.standalone;
  }
};

/**
 * Note: This does not seem to work in every environment (e.g. the tests)
 *       and is therefore a supplementary support for signals.
 */
const parseReflectComponentType = (def: any, declaration: Declaration): void => {
  if (typeof def === 'function') {
    try {
      const mirror = reflectComponentType(def);
      if (mirror?.inputs) {
        for (const input of mirror.inputs) {
          const { name, alias, required } = funcDirectiveIoParse({
            name: input.propName,
            alias: input.templateName === input.propName ? undefined : input.templateName,
            required: undefined, // reflectComponentType doesn't provide required info for signal inputs
          });

          addUniqueDirectiveIo(declaration, 'inputs', name, alias, required);
        }
      }

      if (mirror?.outputs) {
        for (const output of mirror.outputs) {
          const { name, alias, required } = funcDirectiveIoParse({
            name: output.propName,
            alias: output.templateName === output.propName ? undefined : output.templateName,
          });

          addUniqueDirectiveIo(declaration, 'outputs', name, alias, required);
        }
      }
    } catch {
      // reflectComponentType may fail for non-components or incompatible types
    }
  }
};

const parsePropDecoratorsParserFactoryProp = (key: 'inputs' | 'outputs') => {
  const callback = parsePropMetadataParserFactoryProp(key);
  return (
    _: string,
    name: string,
    decorator: {
      args?: [DirectiveIo];
    },
    declaration: Declaration,
  ): void => {
    const { alias = undefined, required = undefined } =
      typeof decorator.args?.[0] === 'undefined'
        ? {}
        : typeof decorator.args[0] === 'string'
          ? { alias: decorator.args[0] }
          : decorator.args[0];
    callback(_, name, { alias, required, bindingPropertyName: alias }, declaration);
  };
};
const parsePropDecoratorsParserInput = parsePropDecoratorsParserFactoryProp('inputs');
const parsePropDecoratorsParserOutput = parsePropDecoratorsParserFactoryProp('outputs');

const parsePropDecoratorsParserFactoryQuery =
  (isViewQuery: boolean) =>
    (
      ngMetadataName: string,
      prop: string,
      decorator: {
        args: [string] | [string, any];
      },
      declaration: Declaration,
    ): void => {
      if (!declaration.queries[prop]) {
        const argsArray = decorator.args as any;
        const extraArgs = argsArray && argsArray.length > 1 && argsArray[1] ? argsArray[1] : {};
        declaration.queries[prop] = {
          isViewQuery,
          ngMetadataName,
          selector: decorator.args[0],
          ...extraArgs,
        };
      }
    };
const parsePropDecoratorsParserContent = parsePropDecoratorsParserFactoryQuery(false);
const parsePropDecoratorsParserView = parsePropDecoratorsParserFactoryQuery(true);

const parsePropDecoratorsParserHostBinding = (
  _: string,
  prop: string,
  decorator: {
    args?: [string] | [string, any[]];
  },
  declaration: Declaration,
): void => {
  const argsArray = decorator.args as any;
  const key = `[${argsArray && argsArray[0] ? argsArray[0] : prop}]`;
  if (!declaration.host[key]) {
    declaration.host[key] = prop;
  }
  const hostBindingsArray = declaration.hostBindings as any;
  if (hostBindingsArray.push) {
    hostBindingsArray.push([prop, ...(decorator.args || [])]);
  }
};

const parsePropDecoratorsParserHostListener = (
  _: string,
  prop: string,
  decorator: {
    args?: any[];
  },
  declaration: Declaration,
): void => {
  const argsArray = decorator.args as any;
  const key = `(${argsArray && argsArray[0] ? argsArray[0] : prop})`;
  if (!declaration.host[key]) {
    declaration.host[key] = `${prop}($event)`;
  }
  const hostListenersArray = declaration.hostListeners as any;
  if (hostListenersArray.push) {
    hostListenersArray.push([prop, ...(decorator.args || [])]);
  }
};

const parsePropDecoratorsMap: any = {
  ContentChild: parsePropDecoratorsParserContent,
  ContentChildren: parsePropDecoratorsParserContent,
  HostBinding: parsePropDecoratorsParserHostBinding,
  HostListener: parsePropDecoratorsParserHostListener,
  Input: parsePropDecoratorsParserInput,
  Output: parsePropDecoratorsParserOutput,
  ViewChild: parsePropDecoratorsParserView,
  ViewChildren: parsePropDecoratorsParserView,
};

const parsePropDecorators = (
  def: {
    propDecorators?: {
      [key: string]: Array<{
        args: any;
        type?: {
          prototype?: {
            ngMetadataName?: string;
          };
        };
      }>
    };
  },
  declaration: Declaration,
): void => {
  const objectGlobal = (globalThis as any).Object || {};
  const hasOwnProp = objectGlobal.prototype && objectGlobal.prototype.hasOwnProperty;
  if (hasOwnProp && hasOwnProp.call(def, 'propDecorators') && def.propDecorators) {
    for (const prop of getAllKeys(def.propDecorators)) {
      declaration.propDecorators[prop] = [...(declaration.propDecorators[prop] || []), ...def.propDecorators[prop]];
      for (const decorator of def.propDecorators[prop]) {
        const ngMetadataName = decorator?.type?.prototype?.ngMetadataName;
        if (!ngMetadataName) {
          continue;
        }
        parsePropDecoratorsMap[ngMetadataName]?.(ngMetadataName, prop, decorator, declaration);
      }
    }
  }
};

const buildDeclaration = (def: any | undefined, declaration: Declaration): void => {
  if (def) {
    def.inputs = def.inputs || [];
    for (const input of declaration.inputs) {
      if (def.inputs.indexOf(input) === -1) {
        def.inputs.push(input);
      }
    }

    def.outputs = def.outputs || [];
    for (const output of declaration.outputs) {
      if (def.outputs.indexOf(output) === -1) {
        def.outputs.push(output);
      }
    }

    def.queries = {
      ...(def.queries || []),
      ...declaration.queries,
    };

    def.hostBindings = declaration.hostBindings;
    def.hostListeners = declaration.hostListeners;
    if (def.standalone === undefined) {
      def.standalone = declaration.standalone;
    }
  }
};

const reflectionCapabilities = new ReflectionCapabilities();

const parse = (def: any): any => {
  if (typeof def !== 'function' && typeof def !== 'object') {
    return {};
  }

  const objectGlobal = (globalThis as any).Object || {};
  const hasOwnProp = objectGlobal.prototype && objectGlobal.prototype.hasOwnProperty;
  if (hasOwnProp && hasOwnProp.call(def, '__ngMocksParsed')) {
    return def.__ngMocksDeclarations;
  }

  const parent = objectGlobal.getPrototypeOf ? objectGlobal.getPrototypeOf(def) : null;
  const parentDeclarations = parent ? parse(parent) : {};
  const declaration = createDeclarations(parentDeclarations);
  coreDefineProperty(def, '__ngMocksParsed', true);
  parseParameters(def, declaration);
  parseAnnotations(def, declaration);
  parseDecorators(def, declaration);
  parsePropDecorators(def, declaration);
  parsePropMetadata(def, declaration);
  parseNgDef(def, declaration);
  parseReflectComponentType(def, declaration);
  buildDeclaration(declaration.Directive, declaration);
  buildDeclaration(declaration.Component, declaration);
  buildDeclaration(declaration.Pipe, declaration);

  coreDefineProperty(def, '__ngMocksDeclarations', {
    ...parentDeclarations,
    ...declaration,
    parameters: reflectionCapabilities.parameters(def),
  });

  return def.__ngMocksDeclarations;
};

export default ((): ((def: any) => Declaration) => parse)();
