const get = require('lodash.get');
const parseUser = require('./parseUser');
const parseReview = require('./parseReview');
const core = require('@actions/core');

const filterNullAuthor = ({ author }) => !!author;

const getFilteredReviews = (data) => get(data, 'node.reviews.nodes', []).filter(filterNullAuthor);

module.exports = (data = {}) => {
  const author = parseUser(get(data, 'node.author'));
  const publishedAt = new Date(get(data, 'node.publishedAt'));
  const now = new Date();
  const closedAt = get(data, 'node.closedAt') ? new Date(get(data, 'node.closedAt')) : null;
  const mergedAt = get(data, 'node.mergedAt') ? new Date(get(data, 'node.mergedAt')) : null;
  const handleReviews = (review) => parseReview(review, { publishedAt, authorLogin: author.login });
  const handleRequestedReview = (r) => {
    core.info(`r is: ${JSON.stringify(r, null, 2)}`);
    let userData = get(r, 'node.requestedReviewer');
    let removed = false;
    core.info(`requestedReviewer: ${JSON.stringify(userData, null, 2)}`);
    if(!userData) {
      removed = true;
      userData = get(r, 'node.removedReviewer');
      core.info(`removedReviewer: ${JSON.stringify(userData, null, 2)}`);
    }
    let requestedAt = new Date(get(data, 'node.createdAt'));
    return { user: parseUser(userData), timeIgnored: (closedAt || mergedAt || now) - requestedAt, removed: true };
  }

  const requestedReviewers = get(data, 'node.timelineItems.nodes', []).map(handleRequestedReview);

  return {
    author,
    publishedAt,
    cursor: data.cursor,
    id: get(data, 'node.id'),
    reviews: getFilteredReviews(data).map(handleReviews),
    ignoredBy: requestedReviewers
  };
};
