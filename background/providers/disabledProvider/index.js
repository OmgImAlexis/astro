/*
 * @file disabledProvider to illustrate enabled-providers
 */

import Provider from '../provider';

export const PROVIDER_NAME = 'disabledProvider';

class DisabledProvider extends Provider {
    constructor() {
        super(PROVIDER_NAME);
    }
}
export {DisabledProvider};

