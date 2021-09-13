const { sum, median, divide } = require('../../utils');

const getProperty = (list, prop) => list.map((el) => el[prop]);

module.exports = (reviews) => {
  const pullIds = getProperty(reviews, 'pullId');
  const totalReviews = new Set(pullIds).size;
  const totalComments = sum(getProperty(reviews, 'commentsCount'));
  const completedReviews = sum(getProperty(reviews, 'completed'));
  const requestedReviews = sum(getProperty(reviews, 'requested'));

  return {
    totalReviews,
    totalComments,
    completedReviews,
    commentsPerReview: divide(totalComments, totalReviews),
    completionRate: divide(completedReviews, requestedReviews),
    timeToReview: median(getProperty(reviews, 'timeToReview')),
  };
};
