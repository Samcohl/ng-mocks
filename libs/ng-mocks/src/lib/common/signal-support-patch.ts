// Patch pour le support des signaux Angular dans ng-mocks
// Cette solution simple peut être appliquée jusqu'à une solution plus robuste

// Detection d'un composant avec des signaux dans un environnement de test
// et ajout automatique des mocks appropriés

import { Input, Output, reflectComponentType } from '@angular/core';

import { AnyType } from '../common/core.types';
import funcDirectiveIoParse from '../common/func.directive-io-parse';

// Helper function to create proper signal mocks
const createSignalMock = (initialValue?: any) => {
    const signal = function (this: any) {
        return initialValue;
    };

    // Add signal-specific methods
    signal.set = function (_value: any) {
        // Mock set implementation
    };

    signal.update = function (_updateFn: any) {
        // Mock update implementation
    };

    signal.asReadonly = function () {
        return signal;
    };

    return signal;
};

// Helper function to create output signal mocks
const createOutputSignalMock = () => {
    const outputSignal = {
        emit: function (_value?: any) {
            // Mock emit implementation
        },
        subscribe: function (_callback: any) {
            // Mock subscribe implementation
            return { unsubscribe: function () { } };
        }
    };

    return outputSignal;
};

// Cette fonction sera appelée lors de la création d'un mock de composant
export const applySignalSupport = (original: AnyType<any>, mock: AnyType<any>): void => {
    // Vérifier si nous sommes dans un environnement Angular moderne avec des signaux
    if (!original || typeof original !== 'function') {
        return;
    }

    try {
        // First try using Angular's official reflectComponentType API
        // This is the same approach used in collect-declarations.ts
        try {
            const mirror = reflectComponentType(original);

            if (mirror?.inputs) {
                for (const input of mirror.inputs) {
                    const { name, alias } = funcDirectiveIoParse({
                        name: input.propName,
                        alias: input.templateName === input.propName ? undefined : input.templateName,
                    });

                    // Create signal mock for input
                    const signalMock = createSignalMock();

                    const objectGlobal = (globalThis as any).Object || {};
                    if (objectGlobal.defineProperty) {
                        objectGlobal.defineProperty(mock.prototype, name, {
                            value: signalMock,
                            writable: true,
                            configurable: true
                        });
                    }

                    // Also add traditional @Input for compatibility
                    try {
                        Input(alias)(mock.prototype, name);
                    } catch (e) {
                        // Ignore if Input decorator fails
                    }
                }
            }

            if (mirror?.outputs) {
                for (const output of mirror.outputs) {
                    const { name, alias } = funcDirectiveIoParse({
                        name: output.propName,
                        alias: output.templateName === output.propName ? undefined : output.templateName,
                    });

                    // Create output signal mock
                    const outputMock = createOutputSignalMock();

                    const objectGlobal = (globalThis as any).Object || {};
                    if (objectGlobal.defineProperty) {
                        objectGlobal.defineProperty(mock.prototype, name, {
                            value: outputMock,
                            writable: true,
                            configurable: true
                        });
                    }

                    // Also add traditional @Output for compatibility
                    try {
                        Output(alias)(mock.prototype, name);
                    } catch (e) {
                        // Ignore if Output decorator fails
                    }
                }
            }

            // If reflectComponentType worked, we're done
            return;

        } catch (reflectionError) {
            // reflectComponentType failed, fall back to name-based detection
        }

        // Fallback: Analyser les propriétés pour détecter les signaux (original approach)
        const prototype = original.prototype || {};
        const objectGlobal = (globalThis as any).Object || {};
        const propNames = objectGlobal.getOwnPropertyNames ?
            objectGlobal.getOwnPropertyNames(prototype) :
            [];

        for (const propName of propNames) {
            if (propName === 'constructor') {
                continue;
            }

            try {
                const descriptor = objectGlobal.getOwnPropertyDescriptor ?
                    objectGlobal.getOwnPropertyDescriptor(prototype, propName) :
                    null;
                if (!descriptor) {
                    continue;
                }

                // Enhanced signal detection patterns
                const isSignalInput = propName.includes('Signal') ||
                    propName.includes('input') ||
                    propName.endsWith('Input') ||
                    propName.startsWith('input');

                const isSignalOutput = propName.includes('output') ||
                    propName.endsWith('Output') ||
                    propName.startsWith('output');

                const isSignalModel = propName.includes('model') ||
                    propName.endsWith('Model') ||
                    propName.startsWith('model');

                if (isSignalInput) {
                    // Mock pour input signal
                    const mockInputSignal = createSignalMock();
                    const objectGlobal = (globalThis as any).Object || {};
                    if (objectGlobal.defineProperty) {
                        objectGlobal.defineProperty(mock.prototype, propName, {
                            value: mockInputSignal,
                            writable: true,
                            configurable: true
                        });
                    }

                    // Aussi ajouter comme @Input traditionnel pour la compatibilité
                    try {
                        Input()(mock.prototype, propName);
                    } catch (e) {
                        // Ignore si l'Input decorator échoue
                    }
                }

                else if (isSignalOutput) {
                    // Mock pour output signal
                    const mockOutputSignal = createOutputSignalMock();
                    const objectGlobal = (globalThis as any).Object || {};
                    if (objectGlobal.defineProperty) {
                        objectGlobal.defineProperty(mock.prototype, propName, {
                            value: mockOutputSignal,
                            writable: true,
                            configurable: true
                        });
                    }

                    // Aussi ajouter comme @Output traditionnel pour la compatibilité
                    try {
                        Output()(mock.prototype, propName);
                    } catch (e) {
                        // Ignore si l'Output decorator échoue
                    }
                }

                else if (isSignalModel) {
                    // Mock pour model signal (two-way binding)
                    const mockModelSignal = createSignalMock();
                    const objectGlobal = (globalThis as any).Object || {};
                    if (objectGlobal.defineProperty) {
                        objectGlobal.defineProperty(mock.prototype, propName, {
                            value: mockModelSignal,
                            writable: true,
                            configurable: true
                        });
                    }

                    // Model signals need both input and output
                    try {
                        Input()(mock.prototype, propName);
                        Output()(mock.prototype, `${propName}Change`);
                    } catch (e) {
                        // Ignore if decorators fail
                    }
                }

            } catch (propError) {
                // Continue si une propriété individuelle échoue
            }
        }

    } catch (error) {
        // Si la détection échoue, ne pas faire échouer la création du mock
    }
};

// Enhanced function to check if a component likely uses signals
export const hasSignalSupport = (component: AnyType<any>): boolean => {
    if (!component || typeof component !== 'function') {
        return false;
    }

    try {
        // Try reflectComponentType first
        const mirror = reflectComponentType(component);
        const inputsArray = mirror?.inputs as any;
        const outputsArray = mirror?.outputs as any;
        if ((inputsArray && inputsArray.length > 0) || (outputsArray && outputsArray.length > 0)) {
            return true;
        }
    } catch {
        // Fall back to other detection methods
    }

    // Check for signal-related properties in prototype
    const prototype = component.prototype || {};
    const objectGlobal = (globalThis as any).Object || {};
    const propNames = objectGlobal.getOwnPropertyNames ?
        objectGlobal.getOwnPropertyNames(prototype) : [];

    return propNames.some((prop: any) =>
        prop.includes('Signal') ||
        prop.includes('input') ||
        prop.includes('output') ||
        prop.includes('model')
    );
};
