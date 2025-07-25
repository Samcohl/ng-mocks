// Décorateurs pour supporter les signaux Angular dans les mocks
import { OutputEmitterRef } from '@angular/core';

import coreDefineProperty from './core.define-property';
import { AnyType } from './core.types';

// Helper functions for creating signal mocks
const mockInputSignal = () => undefined;
const mockModelSignalFunction = () => undefined;

const createMockOutputSignal = (): OutputEmitterRef<any> =>
  ({
    emit: (value: any) => {
      // Mock emit behavior
      void value;
    },
  }) as any;

const createMockModelSignal = () => {
  const modelSignal = mockModelSignalFunction;
  // Ajouter les méthodes set et update
  (modelSignal as any).set = (value: any) => {
    // Mock set behavior
    void value;
  };
  (modelSignal as any).update = (updateFn: any) => {
    // Mock update behavior
    void updateFn;
  };
  return modelSignal;
};

const mockContentChildSignal = () => undefined;
const mockContentChildrenSignal = () => [];

export default (
  cls: AnyType<any>,
  signals?: {
    inputs?: string[];
    outputs?: string[];
    models?: string[];
    contentChild?: string[];
    contentChildren?: string[];
  },
) => {
  if (!signals) {
    return;
  }

  // Décorer les signaux input
  if (signals.inputs) {
    for (const signalName of signals.inputs) {
      // Créer une fonction signal mock qui retourne une valeur par défaut
      coreDefineProperty(cls.prototype, signalName, mockInputSignal);
    }
  }

  // Décorer les signaux output
  if (signals.outputs) {
    for (const signalName of signals.outputs) {
      // Créer un mock output signal avec une méthode emit
      const mockOutputSignal = createMockOutputSignal();
      coreDefineProperty(cls.prototype, signalName, mockOutputSignal);
    }
  }

  // Décorer les signaux model
  if (signals.models) {
    for (const signalName of signals.models) {
      // Créer une fonction signal model mock
      const mockModelSignal = createMockModelSignal();
      coreDefineProperty(cls.prototype, signalName, mockModelSignal);
    }
  }

  // Décorer les signaux contentChild
  if (signals.contentChild) {
    for (const signalName of signals.contentChild) {
      // Créer une fonction contentChild signal mock
      coreDefineProperty(cls.prototype, signalName, mockContentChildSignal);
    }
  }

  // Décorer les signaux contentChildren
  if (signals.contentChildren) {
    for (const signalName of signals.contentChildren) {
      // Créer une fonction contentChildren signal mock
      coreDefineProperty(cls.prototype, signalName, mockContentChildrenSignal);
    }
  }
};
