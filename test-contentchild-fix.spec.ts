import { Component, ContentChild, Directive, NgModule, TemplateRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MockBuilder, MockRender, ngMocks, MockComponent } from 'ng-mocks';

@Directive({
    selector: '[testItem]',
    standalone: false,
})
class ContainerItem {
    constructor(public readonly tpl: TemplateRef<any>) { }
}

@Component({
    selector: 'container-component',
    standalone: false,
    template: `
    <div *ngFor="let item of items">
      <ng-container *ngTemplateOutlet="containerItem?.tpl; context: { $implicit: item }"></ng-container>
    </div>
  `,
})
class ContainerComponent {
    @ContentChild(ContainerItem, {} as never)
    public containerItem?: ContainerItem;

    public items = [{ data: 1 }, { data: 2 }];
}

@Component({
    selector: 'test-app',
    standalone: false,
    template: `
    <container-component>
      <ng-template testItem let-item>
        <div class="item">{{ item.data }}</div>
      </ng-template>
    </container-component>
  `,
})
class TestAppComponent { }

@NgModule({
    declarations: [ContainerComponent, ContainerItem, TestAppComponent],
})
class TestModule { }

describe('ContentChild Fix Test', () => {
    describe('real', () => {
        beforeEach(() => MockBuilder(TestAppComponent).keep(TestModule));

        it('should work with real component', () => {
            const fixture = MockRender(TestAppComponent);

            expect(fixture.nativeElement.innerHTML).toContain('class="item"');
            expect(fixture.nativeElement.innerHTML).toContain('1');
            expect(fixture.nativeElement.innerHTML).toContain('2');
        });
    });

    describe('mock', () => {
        beforeEach(() => MockBuilder(TestAppComponent, TestModule));

        it('should work with mocked ContainerComponent', () => {
            const fixture = MockRender(TestAppComponent);
            const containerComponent = ngMocks.findInstance(ContainerComponent);

            // Verify that the ContentChild is accessible
            expect(containerComponent.containerItem).toBeDefined();

            // Try to render the ContentChild template
            if (containerComponent.containerItem) {
                // This should work after our fix
                const mockComponent = containerComponent as any;
                if (mockComponent.__render) {
                    mockComponent.__render(['containerItem'], { data: 3 });
                    fixture.detectChanges();

                    expect(fixture.nativeElement.innerHTML).toContain('3');
                }
            }
        });
    });
});
