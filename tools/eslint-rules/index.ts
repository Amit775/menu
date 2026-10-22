import {
  RULE_NAME as requireProjectTagsName,
  rule as requireProjectTags,
} from './rules/require-project-tags';

// Workspace ESLint rules, available as "@nx/workspace-<rule-name>".
// Add a rule with: pnpm nx g @nx/eslint:workspace-rule <name> --directory=rules
module.exports = {
  rules: { [requireProjectTagsName]: requireProjectTags },
};
