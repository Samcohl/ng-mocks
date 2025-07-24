// Patch pour le support des signaux Angular dans ng-mocks
// Cette solution simple peut être appliquée jusqu'à une solution plus robuste

// Detection d'un composant avec des signaux dans un environnement de test
// et ajout automatique des mocks appropriés

import { Input, Output, reflectComponentType } from '@angular/core';

import { AnyType } from '../common/core.types';
import funcDirectiveIoParse from '../common/func.directive-io-parse';

// Helper function to create proper signal mocks
const createSignalMock = (initialValue?: any) => {
  // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
  const signal = function (this: any) {
    return initialValue;
  };

  // Add signal-specific methods
  signal.set = () => {
    // Mock set implementation
  };

  signal.update = () => {
    // Mock update implementation
  };

  signal.asReadonly = () => signal;

  return signal;
};

// Helper function to create output signal mocks
const createOutputSignalMock = () => {
  const outputSignal = {
    emit: () => {
      // Mock emit implementation
    },
    subscribe: () => {
      // Mock subscribe implementation
      return { unsubscribe: () => {} };
    },
  };

  return outputSignal;
};

// Helper function to process signal inputs using reflectComponentType
const processSignalInputsFromMirror = (mirror: any, mock: AnyType<any>): void => {
  if (!mirror?.inputs) {
    return;
  }

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
        configurable: true,
      });
    }

    // Also add traditional @Input for compatibility
    try {
      Input(alias)(mock.prototype, name);
    } catch {
      // Ignore if Input decorator fails
    }
  }
};

// Helper function to process signal outputs using reflectComponentType
const processSignalOutputsFromMirror = (mirror: any, mock: AnyType<any>): void => {
  if (!mirror?.outputs) {
    return;
  }

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
        configurable: true,
      });
    }

    // Also add traditional @Output for compatibility
    try {
      Output(alias)(mock.prototype, name);
    } catch {
      // Ignore if Output decorator fails
    }
  }
};

// Helper function to detect signal types using name patterns
const getSignalType = (propName: string): 'input' | 'output' | 'model' | null => {
  // Enhanced signal detection patterns using indexOf instead of includes for ES5 compatibility
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

// Helper function to process individual signal property fallback
const processSignalPropertyFallback = (propName: string, signalType: string, mock: AnyType<any>): void => {
  const objectGlobal = (globalThis as any).Object || {};

  if (signalType === 'input') {
    // Mock pour input signal
    const mockInputSignal = createSignalMock();
    if (objectGlobal.defineProperty) {
      objectGlobal.defineProperty(mock.prototype, propName, {
        value: mockInputSignal,
        writable: true,
        configurable: true,
      });
    }

    // Aussi ajouter comme @Input traditionnel pour la compatibilité
    try {
      Input()(mock.prototype, propName);
    } catch {
      // Ignore si l'Input decorator échoue
    }
  } else if (signalType === 'output') {
    // Mock pour output signal
    const mockOutputSignal = createOutputSignalMock();
    if (objectGlobal.defineProperty) {
      objectGlobal.defineProperty(mock.prototype, propName, {
        value: mockOutputSignal,
        writable: true,
        configurable: true,
      });
    }

    // Aussi ajouter comme @Output traditionnel pour la compatibilité
    try {
      Output()(mock.prototype, propName);
    } catch {
      // Ignore si l'Output decorator échoue
    }
  } else if (signalType === 'model') {
    // Mock pour model signal (two-way binding)
    const mockModelSignal = createSignalMock();
    if (objectGlobal.defineProperty) {
      objectGlobal.defineProperty(mock.prototype, propName, {
        value: mockModelSignal,
        writable: true,
        configurable: true,
      });
    }

    // Model signals need both input and output
    try {
      Input()(mock.prototype, propName);
      Output()(mock.prototype, `${propName}Change`);
    } catch {
      // Ignore if decorators fail
    }
  }
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
      const mirror = reflectComponentType(original as any);

      processSignalInputsFromMirror(mirror, mock);
      processSignalOutputsFromMirror(mirror, mock);

      // If reflectComponentType worked, we're done
      return;
    } catch {
      // reflectComponentType failed, fall back to name-based detection
    }

    // Fallback: Analyser les propriétés pour détecter les signaux (original approach)
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
        // Continue si une propriété individuelle échoue
      }
    }
  } catch {
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
    const mirror = reflectComponentType(component as any);
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
  const propNames = objectGlobal.getOwnPropertyNames ? objectGlobal.getOwnPropertyNames(prototype) : [];

  return propNames.some(
    (prop: any) =>
      prop.indexOf('Signal') !== -1 ||
      prop.indexOf('input') !== -1 ||
      prop.indexOf('output') !== -1 ||
      prop.indexOf('model') !== -1,
  );
};
