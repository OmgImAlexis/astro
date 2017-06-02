/*
 * @file anotherProvider to illustrate enabled-providers
 */

import Provider from '../provider';

export const PROVIDER_NAME = 'anotherProvider';

class AnotherProvider extends Provider {
    constructor() {
        super(PROVIDER_NAME);
    }
}
export {AnotherProvider};
