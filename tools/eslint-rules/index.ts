import {
  RULE_NAME as requireProjectTagsName,
  rule as requireProjectTags,
} from './rules/require-project-tags';

module.exports = {
  rules: { [requireProjectTagsName]: requireProjectTags },
};
