import baseConfig from '../../../../eslint.config.mjs';
import { angularConfig } from '../../../../tools/eslint/angular.mjs';

export default [...baseConfig, ...angularConfig()];
