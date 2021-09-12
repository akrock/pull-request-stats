const core = require('@actions/core');
const github = require('@actions/github');
const { subtractDaysToDate } = require('./utils');
const {
  alreadyPublished,
  getPulls,
  getPullRequest,
  getReviewers,
  buildTable,
  buildComment,
  postComment,
  trackError,
  trackRun,
  trackSuccess,
} = require('./interactors');

const run = async (params) => {
  const {
    org,
    repos,
    sortBy,
    githubToken,
    periodLength,
    displayCharts,
    disableLinks,
    pullRequestId,
    limit,
  } = params;
  core.debug(`Params: ${JSON.stringify(params, null, 2)}`);

  const octokit = github.getOctokit(githubToken);

  const pullRequest = await getPullRequest({ octokit, pullRequestId });
  const alreadyPublished = alreadyPublished(pullRequest);
  // if (alreadyPublished) {
  //   core.info('Skipping execution because stats are published already');
  //   return false;
  // }

  const startDate = subtractDaysToDate(new Date(), periodLength);
  const pulls = await getPulls({
    octokit, org, repos, startDate,
  });
  core.info(`Found ${pulls.length} pull requests to analyze`);

  const reviewers = getReviewers(pulls);
  core.info(`3: Found ${JSON.stringify(pulls, null, 2)}`);
  const found_ignored_by = pulls.filter(f => f.ignoredBy && f.ignoredBy.length > 0).length;

  core.info(`Analyzed stats for ${reviewers.length} pull request reviewers`);
  core.info(`Found IgnoredBy on ${found_ignored_by}.`);
  const table = buildTable(reviewers, {
    limit,
    sortBy,
    disableLinks,
    periodLength,
    displayCharts,
  });
  core.debug('Stats table built successfully');

  const content = buildComment({ table, periodLength });
  core.debug(`Commit content built successfully: ${content}`);

  //TODO: Moved this step to later to assist testing...
  if (alreadyPublished) {
    core.info('Skipping execution because stats are published already');
    return false;
  }

  await postComment({
    octokit,
    content,
    pullRequestId,
    currentBody: pullRequest.body,
  });
  core.debug('Posted comment successfully');

  return true;
};

module.exports = async (params) => {
  try {
    trackRun(params);
    const start = new Date();
    const executed = await run(params);
    const end = new Date();
    trackSuccess({ executed, timeMs: end - start });
  } catch (error) {
    trackError(error);
    throw error;
  }
};
