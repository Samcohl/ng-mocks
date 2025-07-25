import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EmbeddedViewRef,
  Injector,
  Optional,
  QueryList,
  Self,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

import coreDefineProperty from '../common/core.define-property';
import coreForm from '../common/core.form';
import coreReflectDirectiveResolve from '../common/core.reflect.directive-resolve';
import { Type } from '../common/core.types';
import decorateSignals from '../common/decorate.signals';
import funcIsMock from '../common/func.is-mock';
import { MockConfig } from '../common/mock';
import { LegacyControlValueAccessor } from '../common/mock-control-value-accessor';
import decorateDeclaration from '../mock/decorate-declaration';
import { extractSignalsFromComponent } from '../mock/extract-signals';
import getMock from '../mock/get-mock';

import generateTemplate from './render/generate-template';
import getKey from './render/get-key';
import { MockedComponent } from './types';

const mixRenderPrepareVcr = (
  instance: MockConfig & { [key: string]: any },
  type: string,
  selector: string,
  cdr: ChangeDetectorRef,
): ViewContainerRef | undefined => {
  const vcrNgIf: ViewContainerRef = instance[`__vcrIf_${type}_${selector}`];
  const trNgIf: TemplateRef<never> = instance[`__trIf_${type}_${selector}`];

  if (vcrNgIf && trNgIf && !instance[`ngMocksRender_${type}_${selector}`]) {
    instance[`ngMocksRender_${type}_${selector}`] = vcrNgIf.createEmbeddedView(trNgIf, {});
    cdr.detectChanges();
  }

  return instance[`__mockView_${type}_${selector}`];
};

const mixRenderReorderViews = (
  viewContainer: ViewContainerRef,
  views: Array<EmbeddedViewRef<any>>,
  index: number,
): void => {
  const viewsArray = views as any;

  for (let i = viewsArray.length - 1; i > index; i--) {
    if (viewsArray[i]) {
      viewsArray[i].destroy();
    }
  }
  viewsArray.length = index + 1;

  let viewIndex = 0;
  for (const view of views) {
    if (!view) {
      continue;
    }
    viewContainer.move(view, viewIndex);
    viewIndex += 1;
  }
};

const mixRenderApplyContext = (view: EmbeddedViewRef<any>, context: { [key: string]: any }): void => {
  const contextObj = context as any;
  const viewContextObj = view.context as any;

  for (const contextKey in viewContextObj) {
    if (Object.prototype.hasOwnProperty.call(viewContextObj, contextKey)) {
      viewContextObj[contextKey] = undefined;
    }
  }

  for (const contextKey in contextObj) {
    if (Object.prototype.hasOwnProperty.call(contextObj, contextKey)) {
      viewContextObj[contextKey] = contextObj[contextKey];
    }
  }
  view.markForCheck();
};

const mixRenderHandleViews = (
  vcr: ViewContainerRef,
  cdr: ChangeDetectorRef,
  templates: any[],
  views: Array<EmbeddedViewRef<any>>,
  indices: undefined | number[],
  context: { [key: string]: any },
): number => {
  let index = -1;
  const viewsArray = views as any;
  const indicesArray = indices as any;

  for (const templateRef of templates) {
    index += 1;
    viewsArray[index] = viewsArray[index] || undefined;
    if ((indicesArray && indicesArray.indexOf && indicesArray.indexOf(index) === -1) || !templateRef) {
      continue;
    }
    if (!(templateRef instanceof TemplateRef)) {
      const errorConstructor =
        (globalThis as any).Error ||
        ((msg: string) => {
          const err = new (function (this: any) {
            this.message = msg;
          } as any)();
          return err;
        });
      throw new errorConstructor(`Cannot find TemplateRef`);
    }
    if (!viewsArray[index]) {
      viewsArray[index] = vcr.createEmbeddedView(templateRef, {});
    }
    mixRenderApplyContext(viewsArray[index], context);
  }
  cdr.detectChanges();

  return index;
};

const mixRender = (instance: MockConfig & { [key: string]: any }, cdr: ChangeDetectorRef): void => {
  coreDefineProperty(
    instance,
    '__render',
    (contentChildSelector: string | [string, ...number[]], $implicit?: any, variables?: { [key: string]: any }) => {
      const [type, key, selector, indices] = getKey(contentChildSelector);

      const vcr = mixRenderPrepareVcr(instance, type, selector, cdr);
      if (!vcr) {
        return;
      }

      const property: any = instance[key];
      const templates = property instanceof QueryList ? property.toArray() : [property];

      const views = instance[`ngMocksRender_${type}_${selector}_views`] || [];
      const index = mixRenderHandleViews(vcr, cdr, templates, views, indices, { ...variables, $implicit });

      mixRenderReorderViews(vcr, views, index);
      instance[`ngMocksRender_${type}_${selector}_views`] = views;
      cdr.detectChanges();
    },
  );
};

const mixHideHandler = (
  instance: MockConfig & { [key: string]: any },
  type: string,
  selector: string,
  indices: undefined | number[],
) => {
  const views = instance[`ngMocksRender_${type}_${selector}_views`];
  const indicesArray = indices as any;
  let index = -1;

  for (const view of views) {
    index += 1;
    if ((indicesArray && indicesArray.indexOf && indicesArray.indexOf(index) === -1) || !view) {
      continue;
    }
    view.destroy();
    views[index] = undefined;
  }
};

const mixHide = (instance: MockConfig & { [key: string]: any }, changeDetector: ChangeDetectorRef): void => {
  coreDefineProperty(instance, '__hide', (contentChildSelector: string | [string, ...number[]]) => {
    const [type, , selector, indices] = getKey(contentChildSelector);

    if (!instance[`ngMocksRender_${type}_${selector}`]) {
      return;
    }
    mixHideHandler(instance, type, selector, indices);

    if (!indices) {
      (instance[`ngMocksRender_${type}_${selector}`] as EmbeddedViewRef<never>).destroy();
      instance[`ngMocksRender_${type}_${selector}`] = undefined;
    }
    changeDetector.detectChanges();
  });
};

class ComponentMockBase extends LegacyControlValueAccessor implements AfterViewInit {
  public constructor(
    injector: Injector,
    ngControl: any,
    changeDetector: ChangeDetectorRef,
  ) {
    super(injector, ngControl);
    if (funcIsMock(this)) {
      mixRender(this, changeDetector);
      mixHide(this, changeDetector);
    }
  }

  public ngAfterViewInit(): void {
    const config = (this.__ngMocksConfig as any).config;
    if (!(this as any).__rendered && config && config.render) {
      const configRenderObj = config.render as any;
      // Use for...in loop instead of Object.keys
      for (const block in configRenderObj) {
        if (Object.prototype.hasOwnProperty.call(configRenderObj, block)) {
          const { $implicit, variables } =
            configRenderObj[block] === true
              ? {
                $implicit: undefined,
                variables: {},
              }
              : configRenderObj[block];
          (this as any).__render(block, $implicit, variables);
        }
      }
      (this as any).__rendered = true;
    }
  }
}

coreDefineProperty(ComponentMockBase, 'parameters', [
  [Injector],
  [coreForm.NgControl || /* istanbul ignore next */ (() => undefined), new Optional(), new Self()],
  [ChangeDetectorRef],
]);

const decorateClass = (component: Type<any>, mock: Type<any>): void => {
  const meta = coreReflectDirectiveResolve(component);

  // Add signal support using the user's utilities
  try {
    const signals = extractSignalsFromComponent(component);
    decorateSignals(mock, signals);
  } catch {
    // If signal support fails, continue without it
  }

  Component(
    decorateDeclaration(component, mock, meta, {
      template: generateTemplate(meta.queries),
    }),
  )(mock);
};

/**
 * MockComponents creates an array of mock component classes out of components passed as parameters.
 *
 * @see https://ng-mocks.sudo.eu/api/MockComponent
 *
 * ```ts
 * TestBed.configureTestingModule({
 *   declarations: MockComponents(
 *     Dep1Component,
 *     Dep2Component,
 *   ),
 * });
 * ```
 */
export function MockComponents(...components: Array<Type<any>>): Array<Type<MockedComponent<any>>> {
  return (components as any).map(MockComponent);
}

/**
 * MockComponent creates a mock component class out of an arbitrary component.
 *
 * @see https://ng-mocks.sudo.eu/api/MockComponent
 *
 * ```ts
 * TestBed.configureTestingModule({
 *   declarations: [
 *     MockComponent(Dep1Component),
 *     MockComponent(Dep2Component),
 *   ],
 * });
 * ```
 */
export function MockComponent<TComponent>(component: Type<TComponent>): Type<MockedComponent<TComponent>> {
  return getMock(component, 'c', 'MockComponent', 'cacheComponent', ComponentMockBase, decorateClass);
}
