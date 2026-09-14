export interface ForumPost {
  id: string;
  authorId: string;
  title: string;
  body: string;
  solvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ForumPostListItem extends ForumPost {
  authorName: string;
  voteScore: number;
  myVote: number;
  commentCount: number;
}

export interface ForumComment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForumCommentListItem extends ForumComment {
  authorName: string;
  voteScore: number;
  myVote: number;
}

export interface ForumPostListMeta {
  page: number;
  pageSize: number;
  total: number;
}

export type VoteTargetType = "forum_post" | "forum_comment";
