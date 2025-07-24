// Patch pour le support des signaux Angular dans ng-mocks
// Cette solution simple peut être appliquée jusqu'à une solution plus robuste

// Detection d'un composant avec des signaux dans un environnement de test
// et ajout automatique des mocks appropriés

import { Input, Output } from '@angular/core';

import { AnyType } from '../common/core.types';

// Cette fonction sera appelée lors de la création d'un mock de composant
export const applySignalSupport = (original: AnyType<any>, mock: AnyType<any>): void => {
    // Vérifier si nous sommes dans un environnement Angular moderne avec des signaux
    if (!original || typeof original !== 'function') {
        return;
    }

    try {
        // Analyser les propriétés pour détecter les signaux
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

                // Pour les signaux, Angular va souvent avoir des propriétés ou des descripteurs spéciaux
                // Nous allons détecter les signaux par leurs noms et leurs patterns

                if (propName.includes('Signal') ||
                    propName.includes('input') ||
                    propName.includes('output') ||
                    propName.includes('model') ||
                    propName.includes('contentChild')) {

                    // Créer un mock approprié basé sur le nom
                    if (propName.includes('input') || propName.includes('Input')) {
                        // Mock pour input signal
                        const mockInputSignal = function (this: any) {
                            return undefined;
                        };
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

                    else if (propName.includes('output') || propName.includes('Output')) {
                        // Mock pour output signal
                        const mockOutputSignal = {
                            emit: function (_value?: any) {
                                // Mock emit implementation
                            }
                        };
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

                    else if (propName.includes('model') || propName.includes('Model')) {
                        // Mock pour model signal
                        const mockModelSignal = function (this: any) {
                            return undefined;
                        };
                        mockModelSignal.set = function (_value: any) {
                            // Mock set implementation
                        };
                        mockModelSignal.update = function (_updateFn: any) {
                            // Mock update implementation
                        };
                        const objectGlobal = (globalThis as any).Object || {};
                        if (objectGlobal.defineProperty) {
                            objectGlobal.defineProperty(mock.prototype, propName, {
                                value: mockModelSignal,
                                writable: true,
                                configurable: true
                            });
                        }
                    }

                    else if (propName.includes('contentChild')) {
                        // Mock pour contentChild signal
                        const mockContentChildSignal = function (this: any) {
                            return undefined;
                        };
                        const objectGlobal = (globalThis as any).Object || {};
                        if (objectGlobal.defineProperty) {
                            objectGlobal.defineProperty(mock.prototype, propName, {
                                value: mockContentChildSignal,
                                writable: true,
                                configurable: true
                            });
                        }
                    }

                    else if (propName.includes('contentChildren')) {
                        // Mock pour contentChildren signal
                        const mockContentChildrenSignal = function (this: any) {
                            return [];
                        };
                        const objectGlobal = (globalThis as any).Object || {};
                        if (objectGlobal.defineProperty) {
                            objectGlobal.defineProperty(mock.prototype, propName, {
                                value: mockContentChildrenSignal,
                                writable: true,
                                configurable: true
                            });
                        }
                    }
                }
            } catch (propError) {
                // Ignore les erreurs de propriété individuelle
                continue;
            }
        }

    } catch (error) {
        // Si la détection échoue, ne pas faire échouer la création du mock
        // console.warn('ng-mocks: Signal detection failed for component', original.name, error);
    }
};
