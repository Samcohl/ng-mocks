// Fonction pour extraire les signaux d'un composant Angular
import { AnyType } from '../common/core.types';

export interface SignalInfo {
    inputs: string[];
    outputs: string[];
    models: string[];
    contentChild: string[];
    contentChildren: string[];
}

// Cette fonction sera appelée de manière sécurisée pour éviter les erreurs
export const extractSignalsFromComponent = (component: AnyType<any>): SignalInfo => {
    const signals: SignalInfo = {
        inputs: [],
        outputs: [],
        models: [],
        contentChild: [],
        contentChildren: []
    };

    if (!component || !component.prototype) {
        return signals;
    }

    try {
        // Rechercher des signaux dans le prototype du composant
        const prototype = component.prototype;

        // Obtenir toutes les propriétés possibles
        const propNames: string[] = [];

        // Méthode sécurisée pour obtenir les noms de propriétés
        if (typeof Object !== 'undefined' && Object.getOwnPropertyNames) {
            try {
                const ownProps = Object.getOwnPropertyNames(prototype);
                for (let i = 0; i < ownProps.length; i++) {
                    propNames[propNames.length] = ownProps[i];
                }
            } catch (e) {
                // Ignore les erreurs
            }
        }

        // Ajouter les propriétés énumérables
        for (const key in prototype) {
            if (propNames.indexOf(key) === -1) {
                propNames[propNames.length] = key;
            }
        }

        // Analyser chaque propriété
        for (let i = 0; i < propNames.length; i++) {
            const prop = propNames[i];

            if (prop === 'constructor' || prop.charAt(0) === '_') {
                continue;
            }

            try {
                const descriptor = typeof Object !== 'undefined' && Object.getOwnPropertyDescriptor
                    ? Object.getOwnPropertyDescriptor(prototype, prop)
                    : null;

                let value: any;
                if (descriptor) {
                    if (descriptor.value !== undefined) {
                        value = descriptor.value;
                    } else if (descriptor.get) {
                        // Ne pas exécuter le getter, juste vérifier qu'il existe
                        continue;
                    }
                } else {
                    value = prototype[prop];
                }

                if (typeof value === 'function') {
                    // Vérifier si c'est un signal basé sur des heuristiques sûres
                    const valueStr = value.toString();

                    // Détection des signaux input
                    if (valueStr.indexOf('input(') !== -1 ||
                        valueStr.indexOf('ɵɵinputSignal') !== -1 ||
                        prop.indexOf('Signal') !== -1 && prop.indexOf('input') !== -1) {
                        if (signals.inputs.indexOf(prop) === -1) {
                            signals.inputs[signals.inputs.length] = prop;
                        }
                    }

                    // Détection des signaux model
                    else if (valueStr.indexOf('model(') !== -1 ||
                        valueStr.indexOf('ɵɵmodel') !== -1 ||
                        prop.indexOf('Signal') !== -1 && prop.indexOf('model') !== -1) {
                        if (signals.models.indexOf(prop) === -1) {
                            signals.models[signals.models.length] = prop;
                        }
                    }

                    // Détection des signaux contentChild
                    else if (valueStr.indexOf('contentChild(') !== -1 ||
                        valueStr.indexOf('ɵɵcontentChild') !== -1 ||
                        prop.indexOf('contentChild') !== -1) {
                        if (signals.contentChild.indexOf(prop) === -1) {
                            signals.contentChild[signals.contentChild.length] = prop;
                        }
                    }

                    // Détection des signaux contentChildren
                    else if (valueStr.indexOf('contentChildren(') !== -1 ||
                        valueStr.indexOf('ɵɵcontentChildren') !== -1 ||
                        prop.indexOf('contentChildren') !== -1) {
                        if (signals.contentChildren.indexOf(prop) === -1) {
                            signals.contentChildren[signals.contentChildren.length] = prop;
                        }
                    }
                } else if (value && typeof value === 'object') {
                    // Détection des signaux output
                    if (typeof value.emit === 'function' &&
                        (value.toString().indexOf('output(') !== -1 ||
                            value.toString().indexOf('ɵɵoutput') !== -1 ||
                            prop.indexOf('Signal') !== -1 && prop.indexOf('output') !== -1)) {
                        if (signals.outputs.indexOf(prop) === -1) {
                            signals.outputs[signals.outputs.length] = prop;
                        }
                    }
                }
            } catch (e) {
                // Ignore les erreurs de propriété individuelle
                continue;
            }
        }

    } catch (error) {
        // En cas d'erreur, retourner des signaux vides
        return {
            inputs: [],
            outputs: [],
            models: [],
            contentChild: [],
            contentChildren: []
        };
    }

    return signals;
};
