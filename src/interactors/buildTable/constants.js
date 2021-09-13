const SORT_KEY = {
  TIME: 'timeToReview',
  REVIEWS: 'totalReviews',
  COMPLETED: 'completedReviews',
  COMMENTS: 'totalComments',
};

const TITLES = {
  avatar: '',
  username: 'User',
  timeToReview: 'Median Time To Review',
  totalReviews: 'Requested Reviews',
  completedReviews: 'Completed Reviews',
  totalComments: 'Total Comments',
};

const COLUMNS_ORDER = ['totalReviews', 'completedReviews', 'timeToReview', 'totalComments'];

const STATS_OPTIMIZATION = {
  totalReviews: 'MAX',
  totalComments: 'MAX',
  commentsPerReview: 'MAX',
  completedReviews: 'MAX',
  timeToReview: 'MIN',
};

const STATS = Object.keys(STATS_OPTIMIZATION);

module.exports = {
  SORT_KEY,
  TITLES,
  COLUMNS_ORDER,
  STATS,
  STATS_OPTIMIZATION,
};
