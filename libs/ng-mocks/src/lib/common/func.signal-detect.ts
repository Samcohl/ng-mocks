// Utilitaires pour détecter et gérer les signaux Angular

/**
 * Détecte si une propriété est un signal input Angular
 */
export const isInputSignal = (obj: any, prop: string): boolean => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const value = obj[prop];
  if (!value || typeof value !== 'function') {
    return false;
  }

  // Check pour la signature des signaux input d'Angular
  // Les signaux input ont une propriété spéciale ɵINPUT_SIGNAL_BRAND_WRITE_TYPE
  return (
    !!(value as any)[Symbol.for('ɵINPUT_SIGNAL_BRAND_WRITE_TYPE')] ||
    !!(value as any)['ɵINPUT_SIGNAL_BRAND_WRITE_TYPE'] ||
    // Fallback: check si c'est une fonction avec certaines propriétés de signal
    (typeof value === 'function' &&
      (value.toString().indexOf('inputSignal') !== -1 || value.toString().indexOf('signal') !== -1))
  );
};

/**
 * Détecte si une propriété est un signal output Angular
 */
export const isOutputSignal = (obj: any, prop: string): boolean => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const value = obj[prop];
  if (!value || typeof value !== 'object') {
    return false;
  }

  // Check pour la signature des signaux output d'Angular
  return (
    (!!(value as any).emit &&
      typeof (value as any).emit === 'function' &&
      !!(value as any)[Symbol.for('ɵOUTPUT_SIGNAL_BRAND_WRITE_TYPE')]) ||
    !!(value as any)['ɵOUTPUT_SIGNAL_BRAND_WRITE_TYPE']
  );
};

/**
 * Détecte si une propriété est un signal model Angular
 */
export const isModelSignal = (obj: any, prop: string): boolean => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const value = obj[prop];
  if (!value || typeof value !== 'function') {
    return false;
  }

  // Check pour la signature des signaux model d'Angular
  return (
    !!(value as any).set &&
    typeof (value as any).set === 'function' &&
    !!(value as any).update &&
    typeof (value as any).update === 'function' &&
    (!!(value as any)[Symbol.for('ɵMODEL_SIGNAL_BRAND_WRITE_TYPE')] ||
      !!(value as any)['ɵMODEL_SIGNAL_BRAND_WRITE_TYPE'])
  );
};

/**
 * Détecte si une propriété est un signal contentChild Angular
 */
export const isContentChildSignal = (obj: any, prop: string): boolean => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const value = obj[prop];
  if (!value || typeof value !== 'function') {
    return false;
  }

  // Check pour la signature des signaux contentChild d'Angular
  return (
    !!(value as any)[Symbol.for('ɵCONTENT_CHILD_SIGNAL_BRAND')] ||
    !!(value as any)['ɵCONTENT_CHILD_SIGNAL_BRAND'] ||
    // Fallback basé sur le nom
    typeof value === 'function'
  );
};

/**
 * Détecte si une propriété est un signal contentChildren Angular
 */
export const isContentChildrenSignal = (obj: any, prop: string): boolean => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const value = obj[prop];
  if (!value || typeof value !== 'function') {
    return false;
  }

  // Check pour la signature des signaux contentChildren d'Angular
  return (
    !!(value as any)[Symbol.for('ɵCONTENT_CHILDREN_SIGNAL_BRAND')] ||
    !!(value as any)['ɵCONTENT_CHILDREN_SIGNAL_BRAND'] ||
    // Fallback basé sur le nom
    typeof value === 'function'
  );
};
