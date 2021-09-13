const get = require('lodash.get');
const parseUser = require('./parseUser');
const parseReview = require('./parseReview');
const core = require('@actions/core');
const { request } = require('../../dist');

const filterNullAuthor = ({ author }) => !!author;

const getFilteredReviews = (data) => get(data, 'node.reviews.nodes', []).filter(filterNullAuthor);

const requestedReviewsByAuthor = (requestedReviewers) => requestedReviewers.reduce((acc, requestedReview) => {
  const { user, removed, time } = requestedReview;
  const key = user.id;

  if (!acc[key]) {
    const timeArray = [];
    timeArray.push(time);
    acc[key] = { user, requested: removed ? [] : timeArray, removed: removed ? timeArray : [] };
  } else {
    const prevValue = acc[key];
    const requestedArray = prevValue.requested;
    const removedArray = prevValue.removed;

    if (removed) {
      removedArray.push(time);
    } else {
      requestedArray.push(time);
    }

    acc[key] = { user, requested: requestedArray, removed: removedArray };
  }
  return acc;
}, {});

const getReviewForTime = (reviewArray, requestedAt) => {
  if (!reviewArray) {
    return null;
  }

  const matching = reviewArray.filter(r => r.requestedAt == requestedAt);
  return matching.length < 1 ? null : matching[0];
}

const processReviewsByAuthor = (requestedByReviewer, actualReviews) => actualReviews.reduce((acc, review) => {
  const { author, isOwnPull, submittedAt, commentsCount, ...other } = review;
  const key = author.id;

  var requestInfo = requestedByReviewer[key];
  if (!requestInfo) {
    // This was an unsolicited review...
    // should we count this?
    return acc;
  }

  // which request should this be applied to?
  const requestedAt = requestInfo.requested.reduce((output, t) => {
    if (t <= submittedAt) {
      return t;
    }

    return output;
  }, null);

  if (requestedAt == null) {
    // This was an unrequested review...
    return acc;
  }

  if (!acc[key]) {
    acc[key] = []
  }

  const existingArray = acc[key];
  let reviewToUpdate = getReviewForTime(existingArray, requestedAt);
  matching.length < 1 ? null : matching[0];
  if (!reviewToUpdate) {
    reviewToUpdate = { author, isOwnPull, submittedAt, requestedAt, commentsCount }
    acc[key].push(reviewToUpdate);
  }
  else {
    reviewToUpdate.commentsCount += commentsCount;
  }

  return acc;
}, {});

const removedTime = (removedArray, requestedAt) => !removedArray ? null : removedArray.reduce((output, val) => {
  if (val >= requestedAt) {
    return val;
  }

  return output;
}, null);



const mergeReviewsWithRequested = (actualReviews, requestedReviewers, endTime) => {
  const requestedByReviewer = requestedReviewsByAuthor(requestedReviewers);
  // core.info(`REDUCED REQUESTED: ${JSON.stringify(requestedByReviewer, null, 2)}`);
  const reviewsByAuthor = processReviewsByAuthor(requestedByReviewer, actualReviews);
  core.info(`REDUCED REVIEWS: ${JSON.stringify(reviewsByAuthor, null, 2)}`);

  const reviewerArray = [];
  for (const key in requestedByReviewer) {
    if (Object.hasOwnProperty.call(requestedByReviewer, key)) {
      const element = requestedByReviewer[key];
      reviewerArray.push(element);
    }
  }

  const output = reviewerArray.reduce((acc, reviewer) => {
    const { user, requested, removed } = reviewer;
    const reviewArray = reviewsByAuthor[user.id];

    for (let index = 0; index < requested.length; index++) {
      const requestedAt = requested[index];
      let completedAt = removedTime(removed, requestedAt);

      const reviewFound = getReviewForTime(reviewArray, requestedAt);
      if (reviewFound) {
        acc.push({
          timeToReview: reviewFound.completedAt - requestedAt,
          requested: 1,
          completed: 1,
          ...reviewFound
        });
      } else {
        completedAt = completedAt || endTime;
        acc.push({
          timeToReview: completedAt - requestedAt,
          requested: 1,
          completed: 0,
          isOwnPull: false,
          commentsCount: 0
        });
      }
    }
  }, []);

  core.info(`OUTPUT: ${JSON.stringify(output, null, 2)}`);

  return output;
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
    if (!userData) {
      removed = true;
      userData = get(r, 'removedReviewer');
    }
    const requestedAt = new Date(get(r, 'createdAt'));
    return { user: parseUser(userData), removed, time: requestedAt };
  }

  const actualReviews = getFilteredReviews(data).map(handleReviews);
  const requestedReviewers = get(data, 'node.timelineItems.nodes', []).map(handleRequestedReview);
  const finalReviews = mergeReviewsWithRequested(actualReviews, requestedReviewers, closedAt || mergedAt || now);

  return {
    author,
    publishedAt,
    cursor: data.cursor,
    id: get(data, 'node.id'),
    reviews: actualReviews,
    ignoredBy: requestedReviewers
  };
};
