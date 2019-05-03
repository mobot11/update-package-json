const path = require('path');

const defaultPresets = [
    '@babel/preset-react',
    [
        '@babel/preset-env',
        {
            modules: 'commonjs'
        }
    ]
];

module.exports = {
    presets: defaultPresets
};
