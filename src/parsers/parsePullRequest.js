const get = require('lodash.get');
const parseUser = require('./parseUser');
const parseReview = require('./parseReview');

const filterNullAuthor = ({ author }) => !!author;

const getFilteredReviews = (data) => get(data, 'node.reviews.nodes', []).filter(filterNullAuthor);

module.exports = (data = {}) => {
  const author = parseUser(get(data, 'node.author'));
  const publishedAt = new Date(get(data, 'node.publishedAt'));
  const closedAt = get(data, 'node.closedAt') ? new Date(get(data, 'node.closedAt')) : null;
  const mergedAt = get(data, 'node.mergedAt') ? new Date(get(data, 'node.mergedAt')) : null;
  const handleReviews = (review) => parseReview(review, { publishedAt, authorLogin: author.login });
  const handleRequestedReview = (r) => parseUser(get(r, 'node.requestedReviewer'));

  const requestedReviewers = get(data, 'node.reviewRequests.nodes', []).map(handleRequestedReview);

  return {
    author,
    publishedAt,
    cursor: data.cursor,
    id: get(data, 'node.id'),
    reviews: getFilteredReviews(data).map(handleReviews),
    ignored_by: requestedReviewers
  };
};
