import mongoose from 'mongoose';

const Reposchema = new mongoose.Schema(
  {
    name: String,
    id: Number,
    html_url:String,
    branches: {
      type: [String],
    },
    pulls: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PullRequest',
      },
    ],
    alerts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alerts',
      },
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export const Repo = mongoose.model('Repo', Reposchema);