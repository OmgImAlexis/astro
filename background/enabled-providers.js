import * as providers from './providers';

const enabledProviders = [];

/*
 * @TODO Check if the provider is enabled...
 */
const providerEnabled = provider => {
    return (provider !== 'DisabledProvider');
};

for (const provider in providers) {
    if (providerEnabled(provider)) {
        enabledProviders.push(providers[provider]);
    }
}

export default enabledProviders;
