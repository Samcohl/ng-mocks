// Test pour analyser comment les signaux sont gérés actuellement
// Ce fichier est uniquement pour des tests exploratoires

import { Component } from '@angular/core';

// Simule les nouvelles APIs de signaux d'Angular (peut ne pas être disponible dans toutes les versions)
// Ces fonctions peuvent ne pas exister selon la version d'Angular
const mockInput = (defaultValue?: any) => {
    return () => defaultValue;
};

const mockOutput = () => {
    return {
        emit: (value: any) => {
            console.log('Mock output emit:', value);
        }
    };
};

const mockModel = (defaultValue?: any) => {
    const value = defaultValue;
    const fn = () => value;
    fn.set = (newValue: any) => { /* mock set */ };
    fn.update = (updateFn: any) => { /* mock update */ };
    return fn;
};

const mockContentChild = () => {
    return () => undefined;
};

const mockContentChildren = () => {
    return () => [];
};

// Composant de test pour analyser les métadonnées
@Component({
    selector: 'test-signals-component',
    template: '<div>Test component</div>',
    standalone: false,
})
class TestSignalsComponent {
    // Simuler les signaux - ces propriétés seront analysées
    inputSignal = mockInput('default');
    outputSignal = mockOutput();
    modelSignal = mockModel('default-model');
    contentChildSignal = mockContentChild();
    contentChildrenSignal = mockContentChildren();
}

// Export pour les tests
export { TestSignalsComponent };
