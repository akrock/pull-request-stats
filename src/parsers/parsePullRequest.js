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
    let userData = get(r, 'requestedReviewer');
    let removed = false;
    if(!userData) {
      removed = true;
      userData = get(r, 'removedReviewer');
    }
    const requestedAt = new Date(get(r, 'createdAt'));
    const endDate = closedAt || mergedAt || now;
    core.info(`requestedAt: ${requestedAt} - endDate: ${endDate} (${closedAt} || ${mergedAt} || ${now})= ${endDate - requestedAt}`);
    return { user: parseUser(userData), timeIgnored: endDate - requestedAt, removed: removed };
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
