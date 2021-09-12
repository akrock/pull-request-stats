const PRS_QUERY = `
query ($search: String!, $limit: Int!, $after: String) {
  search(query: $search, first: $limit, after: $after, type: ISSUE) {
    edges {
      cursor
      node {
        ... on PullRequest {
          id
          publishedAt
          closedAt
          mergedAt
          author {
            ...ActorFragment
          }
          reviews(first: 100) {
            nodes {
              id
              submittedAt
              commit { pushedDate }
              comments { totalCount }
              author { ...ActorFragment }
            }
          }
          timelineItems(itemTypes: [REVIEW_REQUESTED_EVENT, REVIEW_REQUEST_REMOVED_EVENT], first: 250) {
            nodes {
              ... on ReviewRequestedEvent {
                createdAt
                requestedReviewer {
                  ...ActorFragment
                }
              }
              ... on ReviewRequestRemovedEvent {
                createdAt
                removedReviewer: requestedReviewer {
                  ...ActorFragment
                }
              }
            }
          }
        }
      }
    }
  }
}

fragment ActorFragment on User {
  url
  login
  avatarUrl
  databaseId
}
`;

module.exports = ({
  octokit,
  search,
  after,
  limit = null,
}) => {
  const variables = { search, after, limit };
  return octokit
    .graphql(PRS_QUERY, variables)
    .catch((error) => {
      const msg = `Error fetching pull requests with variables "${JSON.stringify(variables)}"`;
      throw new Error(`${msg}. Error: ${error}`);
    });
};
