const get = require('lodash.get');
const groupBy = require('lodash.')
const parseUser = require('./parseUser');
const parseReview = require('./parseReview');
const core = require('@actions/core');

const filterNullAuthor = ({ author }) => !!author;

const getFilteredReviews = (data) => get(data, 'node.reviews.nodes', []).filter(filterNullAuthor);

const requestedReviewsByAuthor = (requestedReviewers) => requestedReviewers.reduce((acc, requested) => {
  const { user, removed, time } = requested;
  const key = user.id;

  if (!acc[key]) {
    const timeArray = [];
    timeArray.push(time);
    acc[key] = { user, timeIgnored, requested: removed ? [] : timeArray, removed: removed ? timeArray : [] };
  } else {
    const prevValue = acc[key];
    const requestedArray = prevValue.requested;
    const removedArray = prevValue.removed;

    if(removed) {
      removedArray.push(time);
    } else {
      requestedArray.push(time);
    }

    acc[key] = { user, requested: requestedArray, removed: removedArray};
  }
  return acc;
}, {});

const mergeReviewsWithRequested = (actualReviews, requestedReviewers) => {
  const requestedByReviewer = requestedReviewsByAuthor(requestedReviewers);

  const reviewsByAuthor = actualReviews.reduce((acc, review)  => {
    const { author, isOwnPull, submittedAt, commentsCount, ...other } = review;
    const key = author.id;
    
    var requestInfo = requestedByReviewer[key];
    if(!requestInfo || submittedAt <= Math.min(requestInfo.requested)) {
      // This was an unsolicited review...
      // should we count this?
      return acc;
    }

    if(!acc[key]) {
      acc[key] = []
    }

    const existingArray = acc[key];
    // which request should this be applied to?
    const requestedAt = requestedByReviewer.requested.reduce((outupt, t) => {
      if(t <= submittedAt) {
        return t;
      }

      return output;
    }, null);

    let reviewToUpdate = existingArray.filter( r => r.requestedAt == requestedAt);
    if(!reviewToUpdate) {
      reviewToUpdate = { author, isOwnPull, submittedAt, requestedAt, commentsCount }
      acc[key].push(reviewToUpdate);
    }
    else {
      reviewToUpdate.commentsCount += commentsCount;
    }

    return acc;
  }, {});

  core.info(`REDUCED REVIEWS: ${JSON.stringify(reviewsByAuthor, null, 2)}`)
}

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
    return { user: parseUser(userData), removed, time: requestedAt };
  }

  const actualReviews = getFilteredReviews(data).map(handleReviews);
  const requestedReviewers = get(data, 'node.timelineItems.nodes', []).map(handleRequestedReview);
  const finalReviews = mergeReviewsWithRequested(actualReviews, requestedReviewers);

  return {
    author,
    publishedAt,
    cursor: data.cursor,
    id: get(data, 'node.id'),
    reviews: actualReviews,
    ignoredBy: requestedReviewers
  };
};
