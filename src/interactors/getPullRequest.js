const { fetchPullRequestById } = require('../fetchers');
const core = require('@actions/core');

const parsePullRequest = (data) => {
  const { node } = data;
  return {
    id: node.id,
    body: node.body,
  };
};

module.exports = async ({ octokit, pullRequestId }) => {
  const data = await fetchPullRequestById(octokit, pullRequestId);
  core.info(`Got response from graphQL: ${JSON.stringify(data, null, 2)}`)
  return parsePullRequest(data);
};
