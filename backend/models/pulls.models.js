import mongoose from 'mongoose';

const PullRequestSchema = new mongoose.Schema(
  {
    prNumber: {
      // GitHub PR number
      type: Number,
      required: true,
    },
    repository: {
      // Reference to the repo
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repo',
      required: true,
    },
    headBranch: String, // branch where PR comes from
    baseBranch: String, // branch PR merges into
    commentPosted: {
      // whether your bot has already commented
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const PullRequest = mongoose.model('PullRequest', PullRequestSchema);