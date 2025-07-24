import { Input, Output, reflectComponentType } from '@angular/core';

import { AnyType } from '../common/core.types';
import funcDirectiveIoParse from '../common/func.directive-io-parse';

const createSignalMock = (initialValue?: any) => {
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    const signal = function (this: any) {
        return initialValue;
    };

    signal.set = () => {
    };

    signal.update = () => {
    };

    signal.asReadonly = () => signal;

    return signal;
};

const createOutputSignalMock = () => {
    const outputSignal = {
        emit: () => {
        },
        subscribe: () => {
            return { unsubscribe: () => { } };
        },
    };

    return outputSignal;
};

const processSignalInputsFromMirror = (mirror: any, mock: AnyType<any>): void => {
    if (!mirror?.inputs) {
        return;
    }

    for (const input of mirror.inputs) {
        const { name, alias } = funcDirectiveIoParse({
            name: input.propName,
            alias: input.templateName === input.propName ? undefined : input.templateName,
        });

        const signalMock = createSignalMock();

        const objectGlobal = (globalThis as any).Object || {};
        if (objectGlobal.defineProperty) {
            objectGlobal.defineProperty(mock.prototype, name, {
                value: signalMock,
                writable: true,
                configurable: true,
            });
        }

        try {
            Input(alias)(mock.prototype, name);
        } catch {
        }
    }
};

const processSignalOutputsFromMirror = (mirror: any, mock: AnyType<any>): void => {
    if (!mirror?.outputs) {
        return;
    }

    for (const output of mirror.outputs) {
        const { name, alias } = funcDirectiveIoParse({
            name: output.propName,
            alias: output.templateName === output.propName ? undefined : output.templateName,
        });

        const outputMock = createOutputSignalMock();

        const objectGlobal = (globalThis as any).Object || {};
        if (objectGlobal.defineProperty) {
            objectGlobal.defineProperty(mock.prototype, name, {
                value: outputMock,
                writable: true,
                configurable: true,
            });
        }

        try {
            Output(alias)(mock.prototype, name);
        } catch {
        }
    }
};

const getSignalType = (propName: string): 'input' | 'output' | 'model' | null => {
    const isSignalInput =
        propName.indexOf('Signal') !== -1 ||
        propName.indexOf('input') !== -1 ||
        propName.endsWith('Input') ||
        propName.startsWith('input');

    const isSignalOutput =
        propName.indexOf('output') !== -1 || propName.endsWith('Output') || propName.startsWith('output');

    const isSignalModel = propName.indexOf('model') !== -1 || propName.endsWith('Model') || propName.startsWith('model');

    if (isSignalInput) return 'input';
    if (isSignalOutput) return 'output';
    if (isSignalModel) return 'model';
    return null;
};

const processSignalPropertyFallback = (propName: string, signalType: string, mock: AnyType<any>): void => {
    const objectGlobal = (globalThis as any).Object || {};

    if (signalType === 'input') {
        const mockInputSignal = createSignalMock();
        if (objectGlobal.defineProperty) {
            objectGlobal.defineProperty(mock.prototype, propName, {
                value: mockInputSignal,
                writable: true,
                configurable: true,
            });
        }

        try {
            Input()(mock.prototype, propName);
        } catch {
        }
    } else if (signalType === 'output') {
        const mockOutputSignal = createOutputSignalMock();
        if (objectGlobal.defineProperty) {
            objectGlobal.defineProperty(mock.prototype, propName, {
                value: mockOutputSignal,
                writable: true,
                configurable: true,
            });
        }

        try {
            Output()(mock.prototype, propName);
        } catch {
        }
    } else if (signalType === 'model') {
        const mockModelSignal = createSignalMock();
        if (objectGlobal.defineProperty) {
            objectGlobal.defineProperty(mock.prototype, propName, {
                value: mockModelSignal,
                writable: true,
                configurable: true,
            });
        }

        try {
            Input()(mock.prototype, propName);
            Output()(mock.prototype, `${propName}Change`);
        } catch {
        }
    }
};

export const applySignalSupport = (original: AnyType<any>, mock: AnyType<any>): void => {
    if (!original || typeof original !== 'function') {
        return;
    }

    try {
        try {
            const mirror = reflectComponentType(original as any);

            processSignalInputsFromMirror(mirror, mock);
            processSignalOutputsFromMirror(mirror, mock);

            return;
        } catch {
        }

        const prototype = original.prototype || {};
        const objectGlobal = (globalThis as any).Object || {};
        const propNames = objectGlobal.getOwnPropertyNames ? objectGlobal.getOwnPropertyNames(prototype) : [];

        for (const propName of propNames) {
            if (propName === 'constructor') {
                continue;
            }

            try {
                const descriptor = objectGlobal.getOwnPropertyDescriptor
                    ? objectGlobal.getOwnPropertyDescriptor(prototype, propName)
                    : null;
                if (!descriptor) {
                    continue;
                }

                const signalType = getSignalType(propName);
                if (signalType) {
                    processSignalPropertyFallback(propName, signalType, mock);
                }
            } catch {
            }
        }
    } catch {
    }
};

export const hasSignalSupport = (component: AnyType<any>): boolean => {
    if (!component || typeof component !== 'function') {
        return false;
    }

    try {
        const mirror = reflectComponentType(component as any);
        const inputsArray = mirror?.inputs as any;
        const outputsArray = mirror?.outputs as any;
        if ((inputsArray && inputsArray.length > 0) || (outputsArray && outputsArray.length > 0)) {
            return true;
        }
    } catch {
    }

    const prototype = component.prototype || {};
    const objectGlobal = (globalThis as any).Object || {};
    const propNames = objectGlobal.getOwnPropertyNames ? objectGlobal.getOwnPropertyNames(prototype) : [];

    return propNames.some(
        (prop: any) =>
            prop.indexOf('Signal') !== -1 ||
            prop.indexOf('input') !== -1 ||
            prop.indexOf('output') !== -1 ||
            prop.indexOf('model') !== -1,
    );
};
